// Código del service worker (lo genera vite.config.ts al compilar; no se
// incluye en la app). Separado para poder probarlo.
//
// · Navegación (HTML): primero la red, con un tope de 3 s; si no hay red,
//   la copia guardada. Así, tras publicar una versión nueva, el HTML nuevo
//   nunca apunta a archivos que la caché vieja ya no tiene (pantalla en blanco).
// · Resto de archivos: primero la caché. Nunca se guarda una página HTML
//   como si fuera un script o una hoja de estilos (servidores con "SPA fallback").

export function serviceWorkerSource(precache: string[], version: string): string {
  return `// Generado automáticamente
const CACHE = 'whatif-${version}';
const PRECACHE = ${JSON.stringify(precache)};
const NAV_TIMEOUT_MS = 3000;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function fromCacheShell() {
  return caches.match('./', { ignoreSearch: true });
}
function navigate(req) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r) => { if (!settled) { settled = true; resolve(r); } };
    const net = fetch(req);
    const timer = setTimeout(() => {
      fromCacheShell().then((hit) => { if (hit) finish(hit); });
    }, NAV_TIMEOUT_MS);
    net.then((res) => { clearTimeout(timer); finish(res); }, () => {
      clearTimeout(timer);
      fromCacheShell().then((hit) => finish(hit || Response.error()), () => finish(Response.error()));
    });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(navigate(req));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      const type = (res.headers && res.headers.get('content-type')) || '';
      const htmlInsteadOfAsset = req.destination && req.destination !== 'document' && type.indexOf('text/html') >= 0;
      if (res.ok && !htmlInsteadOfAsset) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
}
