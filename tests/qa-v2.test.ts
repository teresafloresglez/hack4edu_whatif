import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GameContext, Student } from '../src/core/types';
import { setLang } from '../src/i18n';
import { newStudent } from '../src/core/storage';
import { makeRng } from '../src/core/rng';
import { getCulture } from '../src/data/cultures';
import { getTheme } from '../src/data/themes';
import { gameName } from '../src/games/registry';
import { milUsosGame } from '../src/games/ideas';
import { naranjaGame } from '../src/games/naranja';
import { confirmChoice } from '../src/games/common';
import { say } from '../src/core/voice';

// Regresiones encontradas por el agente de QA tras los cambios v2
// (idiomas, ✓/✗, sin sentido, dibujos SVG).

const flush = (ms = 2) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  setLang('es');
});
afterEach(() => setLang('es'));

function ctxFor(student: Student, said: string[], extra: Partial<GameContext> = {}): { ctx: GameContext; ac: AbortController } {
  const root = document.createElement('div');
  document.body.append(root);
  const ac = new AbortController();
  return {
    ac,
    ctx: {
      root, student, level: 1, ageBand: 'old', culture: getCulture(student.regionId), theme: getTheme('parque'),
      rng: makeRng(3), say: (x) => { said.push(x); return Promise.resolve(); }, sfx: () => {}, exitSignal: ac.signal, fast: true, gameName,
      ...extra,
    },
  };
}

describe('La naranja: gramática del enunciado', () => {
  it('en español "Tú quieres…" no usa un pronombre de primera persona (comérmelo/comérmela)', async () => {
    for (const regionId of ['africa', 'america', 'asia', 'europa', 'oceania']) {
      for (let seed = 1; seed <= 6; seed++) {
        const said: string[] = [];
        const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId });
        const { ctx, ac } = ctxFor(s, said, { rng: makeRng(seed) });
        const p = naranjaGame.play(ctx);
        await flush();
        // Primer escenario: decidir enseguida → aparece el segundo escenario
        ctx.root.querySelector<HTMLButtonElement>('.decision-btn')!.click();
        await flush();
        ctx.root.querySelector<HTMLButtonElement>('.choice-btn')!.click();
        await flush(20);
        const intros = said.filter((x) => x.includes('Tú quieres'));
        expect(intros.length).toBeGreaterThanOrEqual(2);
        for (const x of intros) expect(x, x).not.toMatch(/Tú quieres \S*rme(lo|la)\b/);
        ac.abort();
        await p;
      }
    }
  });

  it('lo que dice el otro personaje ("Lo quiero para…") va en primera persona, sin "su huerto"', async () => {
    for (const [lang, bad] of [['es', /dice: .*para su huerto/], ['en', /says: .*their garden/], ['fr', /dit : .*son potager/]] as const) {
      setLang(lang);
      for (let seed = 1; seed <= 6; seed++) {
        const said: string[] = [];
        const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'africa' });
        const { ctx, ac } = ctxFor(s, said, { rng: makeRng(seed), level: 1 });
        const p = naranjaGame.play(ctx);
        await flush();
        ctx.root.querySelector<HTMLButtonElement>('.ask-btn')!.click(); // nivel 1: una pregunta basta
        await flush();
        expect(said.some((x) => /dice|says|dit/.test(x))).toBe(true);
        for (const x of said) expect(x).not.toMatch(bad);
        ac.abort();
        await p;
      }
    }
  });

  it('en inglés el enunciado no dice "all want" con un solo personaje', async () => {
    setLang('en');
    const said: string[] = [];
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 7, regionId: 'america' });
    const { ctx, ac } = ctxFor(s, said);
    const p = naranjaGame.play(ctx);
    await flush();
    expect(said[0]).toMatch(/^You and \S+ want /);
    ac.abort();
    await p;
  });
});

describe('Mil usos: la lógica solo se observa si el niño elige algo', () => {
  it('pulsar ¡Listo! sin elegir nada no da una observación de lógica perfecta', async () => {
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    const { ctx } = ctxFor(s, []);
    const p = milUsosGame.play(ctx);
    await flush();
    ctx.root.querySelector<HTMLButtonElement>('[data-done]')!.click();
    const o = await p;
    expect(o.observations.find((x) => x.dim === 'logica')).toBeUndefined();
  });
});

describe('Diálogo ✓/✗: teclado y accesibilidad', () => {
  it('tiene nombre accesible, pone el foco dentro, Esc equivale a ✗ y devuelve el foco', async () => {
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    const { ctx } = ctxFor(s, []);
    const card = document.createElement('button');
    ctx.root.append(card);
    card.focus();
    const p = confirmChoice(ctx, { picture: '🍰', text: 'Comérmelo de postre' });
    const overlay = ctx.root.querySelector<HTMLElement>('.confirm-overlay')!;
    expect(overlay.getAttribute('aria-label')).toBe('Comérmelo de postre');
    expect(overlay.contains(document.activeElement)).toBe(true);
    // El foco no cae en ✓ para no confirmar sin querer con Intro
    expect((document.activeElement as HTMLElement).dataset.confirm).toBeUndefined();
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await p).toBe(false);
    expect(ctx.root.querySelector('.confirm-overlay')).toBeNull();
    expect(document.activeElement).toBe(card);
  });

});

describe('Voz: elige la variante configurada del idioma', () => {
  it('en inglés prefiere en-GB local antes que la primera voz en-US (p. ej. voces de efectos)', async () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    const voices = [
      { name: 'Albert', lang: 'en-US', localService: true, default: false },
      { name: 'Daniel', lang: 'en-GB', localService: true, default: false },
      { name: 'Mónica', lang: 'es-ES', localService: true, default: true },
    ];
    const g = globalThis as unknown as Record<string, unknown>;
    const prevUtt = g.SpeechSynthesisUtterance;
    class FakeUtt { text: string; lang = ''; rate = 1; pitch = 1; voice: unknown = null; onend: (() => void) | null = null; onerror: unknown = null; constructor(t: string) { this.text = t; } }
    g.SpeechSynthesisUtterance = FakeUtt;
    const synth = { getVoices: () => voices, speak: (u: SpeechSynthesisUtterance) => { spoken.push(u); u.onend?.(new Event('end') as SpeechSynthesisEvent); }, cancel: () => {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    try {
      setLang('en');
      await say('Hello');
      expect((spoken[0].voice as unknown as { name: string }).name).toBe('Daniel');
      setLang('es');
      await say('Hola');
      expect((spoken[1].voice as unknown as { name: string }).name).toBe('Mónica');
    } finally {
      delete (window as unknown as Record<string, unknown>).speechSynthesis;
      g.SpeechSynthesisUtterance = prevUtt;
      vi.restoreAllMocks();
    }
  });
});
