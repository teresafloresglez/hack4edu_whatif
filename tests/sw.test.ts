import { describe, it, expect } from 'vitest';
import { serviceWorkerSource } from '../src/sw-source';

// Simula un service worker con una caché "vieja" (versión anterior) y un
// servidor que ya tiene la versión nueva. Antes, la navegación salía de la
// caché vieja → HTML viejo → script viejo que ya no existe → pantalla en blanco.

interface FakeRes { body: string; ok: boolean; type: string; headers: { get: (k: string) => string | null }; clone: () => FakeRes }
const res = (body: string, type: string, ok = true): FakeRes => {
  const r: FakeRes = { body, ok, type, headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) }, clone: () => r };
  return r;
};

function setup(opts: { cached: Record<string, FakeRes>; network: Record<string, FakeRes> | 'offline' }) {
  const base = 'http://app.test/';
  const store = new Map<string, FakeRes>(Object.entries(opts.cached).map(([k, v]) => [new URL(k, base).href, v]));
  const keyOf = (r: string | { url: string }) => new URL(typeof r === 'string' ? r : r.url, base).href;
  const cache = { put: async (r: { url: string }, v: FakeRes) => void store.set(keyOf(r), v), addAll: async () => undefined };
  const caches = {
    open: async () => cache,
    match: async (r: string | { url: string }) => store.get(keyOf(r)),
    keys: async () => [],
    delete: async () => true,
  };
  const fetchFn = async (r: { url: string }) => {
    if (opts.network === 'offline') throw new Error('offline');
    return opts.network[keyOf(r)] ?? res('<html>fallback SPA</html>', 'text/html');
  };
  const listeners: Record<string, (e: unknown) => void> = {};
  const self = { addEventListener: (t: string, f: (e: unknown) => void) => (listeners[t] = f), location: { origin: 'http://app.test' } };
  const Response = { error: () => res('', 'error', false) };
  new Function('self', 'caches', 'fetch', 'Response', serviceWorkerSource(['./'], 'v2'))(self, caches, fetchFn, Response);
  const request = async (path: string, mode: string, destination: string): Promise<FakeRes> => {
    let p: Promise<FakeRes> | undefined;
    listeners.fetch({ request: { url: base + path.replace(/^\.\//, ''), method: 'GET', mode, destination }, respondWith: (x: Promise<FakeRes>) => (p = x) });
    return p!;
  };
  return { request, store, base };
}

describe('service worker (modo sin conexión)', () => {
  it('tras una actualización, la navegación usa el HTML nuevo de la red', async () => {
    const { request } = setup({
      cached: { './': res('<html>viejo index-OLD.js</html>', 'text/html') },
      network: { 'http://app.test/': res('<html>nuevo index-NEW.js</html>', 'text/html') },
    });
    const page = await request('./', 'navigate', 'document');
    expect(page.body).toContain('index-NEW.js');
  });

  it('sin conexión, la navegación usa la copia guardada', async () => {
    const { request } = setup({ cached: { './': res('<html>guardado</html>', 'text/html') }, network: 'offline' });
    const page = await request('./', 'navigate', 'document');
    expect(page.body).toContain('guardado');
  });

  it('nunca guarda una página HTML en lugar de un script', async () => {
    const { request, store, base } = setup({ cached: {}, network: {} });
    await request('assets/index-OLD.js', 'cors', 'script');
    await new Promise((r) => setTimeout(r, 0));
    expect(store.has(base + 'assets/index-OLD.js')).toBe(false);
  });

  it('los archivos de la app se sirven desde la caché', async () => {
    const { request } = setup({ cached: { 'assets/app.js': res('codigo', 'text/javascript') }, network: 'offline' });
    const js = await request('assets/app.js', 'cors', 'script');
    expect(js.body).toBe('codigo');
  });
});
