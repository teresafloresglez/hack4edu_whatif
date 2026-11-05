import { describe, it, expect, beforeEach } from 'vitest';
import type { GameContext, GameDef, GameOutcome } from '../src/core/types';
import { newStudent, normalizeStudent, saveSettings, loadSettings } from '../src/core/storage';
import { makeRng } from '../src/core/rng';
import { CULTURES, getCulture, normalizeRegionId } from '../src/data/cultures';
import { getTheme } from '../src/data/themes';
import { gameName } from '../src/games/registry';
import { repartoGame } from '../src/games/reparto';
import { caminoGame, buildMap, fullPath, shortestPath, KEY_DIRS } from '../src/games/camino';
import { garabatoGame, DOODLE_CATEGORIES } from '../src/games/garabato';
import { flash } from '../src/games/common';

// Cambios v3: continentes, reparto sin caras, camino con teclado y llave, garabato con categorías.

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

const tick = (ms = 2) => new Promise((r) => setTimeout(r, ms));

function makeCtx(game: GameDef, over: Partial<GameContext> = {}): { ctx: GameContext; run: () => Promise<GameOutcome> } {
  const student = newStudent({ name: 'QA', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
  const root = document.createElement('div');
  document.body.append(root);
  const ac = new AbortController();
  const ctx: GameContext = {
    root, student, level: 1, ageBand: 'old', culture: getCulture('america'), theme: getTheme('parque'),
    rng: makeRng(5), say: () => Promise.resolve(), sfx: () => {}, exitSignal: ac.signal, fast: true, gameName, ...over,
  };
  return { ctx, run: () => game.play(ctx) };
}

// Caras de personas (con o sin tono de piel).
const PERSON_EMOJI = /[\u{1F466}-\u{1F469}\u{1F9D1}\u{1F464}]/u;

describe('continentes', () => {
  it('son exactamente los cinco continentes, sin tonos de piel', () => {
    expect(CULTURES.map((c) => c.name.es)).toEqual(['África', 'América', 'Asia', 'Europa', 'Oceanía']);
    for (const c of CULTURES) for (const p of c.people) expect(p).not.toMatch(/[\u{1F3FB}-\u{1F3FF}]/u);
  });

  it('las regiones antiguas se convierten en su continente', () => {
    expect(normalizeRegionId('latam')).toBe('america');
    expect(normalizeRegionId('africa_oeste')).toBe('africa');
    expect(normalizeRegionId('asia_sur')).toBe('asia');
    expect(normalizeRegionId('general')).toBe('europa');
    expect(normalizeRegionId('xx')).toBe('america');
    const old = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 8, regionId: 'africa_este' });
    expect(normalizeStudent(old).regionId).toBe('africa');
    saveSettings({ ...loadSettings(), defaultRegion: 'latam' });
    expect(loadSettings().defaultRegion).toBe('america');
  });
});

describe('el reparto', () => {
  it('a las personas se las nombra solo por su nombre (sin emojis de caras)', async () => {
    const { ctx, run } = makeCtx(repartoGame);
    const p = run();
    const seen: string[] = [];
    for (let i = 0; i < 400; i++) {
      await tick();
      seen.push(...[...ctx.root.querySelectorAll('.plate-owner, .instruction-icon')].map((e) => e.textContent ?? ''));
      const b = ctx.root.querySelector<HTMLButtonElement>('[data-done], [data-pred="yes"], .choice-btn');
      b?.click();
      if (await Promise.race([p.then(() => true), tick(1).then(() => false)])) break;
    }
    await p;
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) expect(s).not.toMatch(PERSON_EMOJI);
    expect(seen.some((s) => s.includes('🦁'))).toBe(false);
  });
});

describe('el camino', () => {
  it('se puede mover con las flechas del teclado', async () => {
    const { ctx, run } = makeCtx(caminoGame);
    const p = run();
    await tick(5);
    const heroCell = () => [...ctx.root.querySelectorAll('.cell')].findIndex((c) => c.querySelector('.hero'));
    const before = heroCell();
    // Prueba las cuatro direcciones hasta que alguna mueva al explorador.
    let moved = false;
    for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await tick(3);
      if (heroCell() !== before) { moved = true; break; }
    }
    expect(moved).toBe(true);
    expect(KEY_DIRS.ArrowUp).toBe('up');
    // Terminar la partida pulsando direcciones al azar.
    const dirs = ['up', 'down', 'left', 'right'];
    for (let i = 0; i < 2000; i++) {
      const done = await Promise.race([p.then(() => true), tick(1).then(() => false)]);
      if (done) break;
      ctx.root.querySelector<HTMLButtonElement>(`[data-dir="${dirs[i % 4]}"]`)?.click();
    }
    await p;
  });

  it('en niveles altos el último mapa tiene una llave que obliga a desviarse', () => {
    for (let seed = 1; seed < 30; seed++) {
      const m = buildMap(5, makeRng(seed), true);
      expect(m.key).toBeDefined();
      const direct = shortestPath(m)!;
      const viaKey = fullPath(m, m.start, false)!;
      expect(viaKey.some((p) => p[0] === m.key![0] && p[1] === m.key![1])).toBe(true);
      expect(viaKey.length).toBeGreaterThanOrEqual(direct.length);
    }
    expect(buildMap(2, makeRng(3)).key).toBeUndefined();
  });

  it('nivel 5: la llave aparece en el último mapa y la partida termina', async () => {
    const { ctx, run } = makeCtx(caminoGame, { level: 5 });
    const p = run();
    let sawKey = false;
    const dirs = ['up', 'right', 'down', 'left'];
    const r = makeRng(9);
    for (let i = 0; i < 5000; i++) {
      const done = await Promise.race([p.then(() => true), tick(1).then(() => false)]);
      if (done) break;
      if (ctx.root.querySelector('.cell.key')) sawKey = true;
      ctx.root.querySelector<HTMLButtonElement>(`[data-dir="${dirs[Math.floor(r() * 4)]}"]`)?.click();
    }
    const out = await p;
    expect(sawKey).toBe(true);
    expect(out.metrics.keysCollected).toBeGreaterThanOrEqual(0);
  });
});

describe('garabato', () => {
  it('pregunta qué es y ofrece categorías generales', async () => {
    const { ctx, run } = makeCtx(garabatoGame);
    const p = run();
    await tick(5);
    ctx.root.querySelector<HTMLButtonElement>('[data-done]')!.click();
    await tick(5);
    expect(ctx.root.textContent).toContain('¿Qué es tu dibujo?');
    const labels = [...ctx.root.querySelectorAll<HTMLButtonElement>('[data-label]')].map((b) => b.dataset.label);
    expect(labels).toEqual(DOODLE_CATEGORIES.map((c) => c.id));
    expect(labels).toContain('animal');
    expect(labels).toContain('agua');
    ctx.root.querySelector<HTMLButtonElement>('[data-label="animal"]')!.click();
    const out = await p;
    expect(out.tags?.ideaIds).toEqual(['g_animal']);
  });
});

describe('respuesta incorrecta', () => {
  it('lo elegido mal se queda en rojo; el tablero solo avisa un momento', async () => {
    const btn = document.createElement('button');
    flash(btn, 'bad');
    expect(btn.classList.contains('wrong')).toBe(true);
    const board = document.createElement('div');
    board.className = 'board';
    flash(board, 'bad');
    expect(board.classList.contains('wrong')).toBe(false);
    await new Promise((r) => setTimeout(r, 650));
    expect(board.classList.contains('flash-bad')).toBe(false);
  });
});
