import { describe, it, expect, beforeEach } from 'vitest';
import type { GameContext, GameOutcome, RobiAnswer } from '../src/core/types';
import { newStudent } from '../src/core/storage';
import { makeRng } from '../src/core/rng';
import { CULTURES, getCulture } from '../src/data/cultures';
import { getTheme } from '../src/data/themes';
import { gameName, GAME_BY_ID } from '../src/games/registry';
import { robiGame, withoutCheer } from '../src/games/robi';
import {
  REASONINGS, FALLACIES, FALLACY_LEVEL, availableFallacies, dominio, gustosFor, planRobi, robiHistory, robiSeen, RAZONAMIENTOS_RECIENTES,
} from '../src/core/robi';
import { applyOutcome } from '../src/core/evaluation';
import { buildReport } from '../src/core/report';
import { reportView } from '../src/ui/informe';
import { setLang } from '../src/i18n';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  setLang('es');
});

const student = (age = 8) => newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age, regionId: 'america' });

/** Añade al historial una partida de Robi con estas respuestas. */
function addPlay(s: ReturnType<typeof student>, robi: RobiAnswer[]) {
  s.plays.push({ gameId: 'robi', date: Date.now(), level: 3, phase: 2, projectId: 'p', stars: 2, outcome: {
    gameId: 'robi', level: 3, abandoned: false, success: true, personalMetric: 0, observations: [], metrics: {}, durationMs: 1, tags: { robi },
  } });
}

describe('contenido de Robi', () => {
  it('cada razonamiento está completo en los tres idiomas y bien formado', () => {
    const ids = new Set<string>();
    for (const r of REASONINGS) {
      expect(ids.has(r.id), r.id).toBe(false);
      ids.add(r.id);
      for (const l of ['es', 'en', 'fr'] as const) {
        expect(r.frase[l], r.id).toBeTruthy();
        expect(r.aprende[l], r.id).toBeTruthy();
      }
      if (r.tipo === 'ninguno') expect(r.opciones, r.id).toBeUndefined();
      else {
        expect(r.opciones?.length, r.id).toBe(3);
        expect(r.opciones!.filter((o) => o.correcta), r.id).toHaveLength(1);
        for (const o of r.opciones!) for (const l of ['es', 'en', 'fr'] as const) expect(o.texto[l], r.id).toBeTruthy();
      }
    }
    // Hay contenido de cada tipo para cada gusto.
    for (const g of ['animales', 'deporte', 'comida']) for (const t of [...FALLACIES, 'ninguno']) {
      expect(REASONINGS.some((r) => r.gusto === g && r.tipo === t && !r.regiones), `${g}/${t}`).toBe(true);
    }
  });
});

describe('IA adaptativa de Robi', () => {
  it('dominio suavizado: (aciertos + 1) / (intentos + 2)', () => {
    expect(dominio([], 'absurdo')).toBeCloseTo(0.5);
    const h: RobiAnswer[] = [{ id: 'x', tipo: 'absurdo', acierto: false, conPista: false }];
    expect(dominio(h, 'absurdo')).toBeCloseTo(1 / 3);
    const nine = Array.from({ length: 10 }, (_, i) => ({ id: 'y' + i, tipo: 'parecido' as const, acierto: i < 9, conPista: false }));
    expect(dominio(nine, 'parecido')).toBeCloseTo(10 / 12);
  });

  it('los tipos se desbloquean por nivel y se acumulan', () => {
    expect(availableFallacies(1)).toEqual(['absurdo']);
    expect(availableFallacies(3)).toEqual(['absurdo', 'parecido', 'falsaCausa']);
    expect(availableFallacies(5)).toHaveLength(5);
  });

  it('cada partida: 3 razonamientos distintos, siempre uno correcto y fallos de su nivel', () => {
    for (let seed = 1; seed < 60; seed++) {
      const level = (seed % 5) + 1;
      const plan = planRobi(student(), level, { themeId: 'animales', regionId: 'europa', rng: makeRng(seed) });
      expect(plan).toHaveLength(3);
      expect(new Set(plan.map((p) => p.reasoning.id)).size).toBe(3);
      expect(plan.filter((p) => p.reasoning.tipo === 'ninguno')).toHaveLength(1);
      for (const p of plan) if (p.reasoning.tipo !== 'ninguno') expect(FALLACY_LEVEL[p.reasoning.tipo]).toBeLessThanOrEqual(level);
    }
  });

  it('usa los gustos del niño a partir del tema que ha elegido (sin preguntarle)', () => {
    const s = student();
    expect(gustosFor(s, 'futbol')).toEqual(['deporte']);
    expect(gustosFor(s, 'cocina')).toEqual(['comida']);
    for (let seed = 1; seed < 30; seed++) {
      const plan = planRobi(s, 2, { themeId: 'futbol', regionId: 'europa', rng: makeRng(seed) });
      for (const p of plan) expect(p.reasoning.gusto).toBe('deporte');
    }
  });

  it('los razonamientos de un continente solo salen a niños de ese continente', () => {
    const regional = REASONINGS.filter((r) => r.regiones);
    expect(regional.length).toBeGreaterThan(0);
    for (let seed = 1; seed < 80; seed++) {
      const plan = planRobi(student(), 5, { themeId: 'animales', regionId: 'asia', rng: makeRng(seed) });
      for (const p of plan) if (p.reasoning.regiones) expect(p.reasoning.regiones).toContain('asia');
    }
    // Y a un niño de Oceanía le sale alguna vez el suyo.
    const seen = new Set<string>();
    for (let seed = 1; seed < 80; seed++) for (const p of planRobi(student(), 2, { themeId: 'animales', regionId: 'oceania', rng: makeRng(seed) })) seen.add(p.reasoning.id);
    expect(seen.has('rg-oc')).toBe(true);
  });

  it('prioriza lo que más le cuesta (60 %) y no repite los últimos 12', () => {
    const s = student();
    // Domina absurdos y parecidos; falla las falsas causas.
    addPlay(s, [
      ...Array.from({ length: 4 }, (_, i) => ({ id: 'a' + i, tipo: 'absurdo' as const, acierto: true, conPista: false })),
      ...Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, tipo: 'parecido' as const, acierto: true, conPista: false })),
      { id: 'an5', tipo: 'falsaCausa', acierto: false, conPista: false },
    ]);
    let falsaCausa = 0, total = 0;
    for (let seed = 1; seed < 200; seed++) {
      const plan = planRobi(s, 3, { themeId: 'animales', regionId: 'europa', rng: makeRng(seed) });
      for (const p of plan) if (p.decision.tipo !== 'ninguno') { total++; if (p.decision.tipo === 'falsaCausa') falsaCausa++; }
      const practicar = plan.filter((p) => p.decision.motivo === 'practicar');
      for (const p of practicar) expect(p.decision.tipo).toBe('falsaCausa');
    }
    expect(falsaCausa / total).toBeGreaterThan(0.6);
    // Sin repetir lo reciente: an5 está entre los últimos 12.
    const recent = new Set(robiHistory(s).slice(-RAZONAMIENTOS_RECIENTES).map((h) => h.id));
    for (let seed = 1; seed < 50; seed++) {
      for (const p of planRobi(s, 3, { themeId: 'animales', regionId: 'europa', rng: makeRng(seed) })) {
        if (p.reasoning.gusto === 'animales' && p.reasoning.tipo === 'falsaCausa') expect(recent.has(p.reasoning.id) && p.reasoning.id === 'an5').toBe(false);
      }
    }
  });
});

describe('juego ¡Robi, eso no!', () => {
  function ctxFor(level: number, seed = 4): { ctx: GameContext; run: () => Promise<GameOutcome> } {
    const s = student(9);
    const root = document.createElement('div');
    document.body.append(root);
    const ctx: GameContext = {
      root, student: s, level, ageBand: 'old', culture: getCulture('america'), theme: getTheme('animales'),
      rng: makeRng(seed), say: () => Promise.resolve(), sfx: () => {}, exitSignal: new AbortController().signal, fast: true, gameName,
    };
    return { ctx, run: () => robiGame.play(ctx) };
  }
  const tick = () => new Promise((r) => setTimeout(r, 2));

  it('un niño que lo hace todo bien acierta los 3, sin pistas, y sube de nivel', async () => {
    const { ctx, run } = ctxFor(3);
    const p = run();
    for (let i = 0; i < 400; i++) {
      await tick();
      const r = ctx.root;
      const correctOption = r.querySelector<HTMLButtonElement>('[data-correct="true"]');
      if (correctOption) { correctOption.click(); continue; }
      const next = r.querySelector<HTMLButtonElement>('[data-done]');
      if (next) { next.click(); continue; }
      // Juzga mirando el plan guardado en el propio botón: tiene sentido solo si no hay opciones de «por qué».
      const yes = r.querySelector<HTMLButtonElement>('[data-robi="sense"]');
      if (yes) {
        const frase = r.querySelector('.robi-bubble p')?.textContent ?? '';
        const reasoning = (await import('../src/core/robi')).REASONINGS.find((x) => frase.includes(x.frase.es));
        (reasoning?.tipo === 'ninguno' ? yes : r.querySelector<HTMLButtonElement>('[data-robi="nope"]')!).click();
      }
      if (await Promise.race([p.then(() => true), tick().then(() => false)])) break;
    }
    const out = await p;
    expect(out.metrics.aciertos).toBe(3);
    expect(out.metrics.pistasRobi).toBe(0);
    expect(out.success).toBe(true);
    expect(out.tags?.robi).toHaveLength(3);
    expect(out.tags?.robiPlan?.filter((d) => d.tipo === 'ninguno')).toHaveLength(1);
    expect(out.observations[0].dim).toBe('logica');
    expect(out.observations[0].value).toBeGreaterThan(0.75);
  });

  it('decir «¡Eso no!» a todo no basta: falla el razonamiento correcto', async () => {
    const { ctx, run } = ctxFor(1);
    const p = run();
    for (let i = 0; i < 400; i++) {
      await tick();
      const r = ctx.root;
      const no = r.querySelector<HTMLButtonElement>('[data-robi="nope"]');
      if (no) { no.click(); continue; }
      const correctOption = r.querySelector<HTMLButtonElement>('[data-correct="true"]');
      if (correctOption) { correctOption.click(); continue; }
      r.querySelector<HTMLButtonElement>('[data-done]')?.click();
      if (await Promise.race([p.then(() => true), tick().then(() => false)])) break;
    }
    const out = await p;
    expect(out.metrics.falsosNo).toBe(1);
    expect(out.metrics.aciertos).toBe(2);
    // Y no es un logro: no sube de nivel diciendo «¡Eso no!» a todo.
    expect(out.success).toBe(false);
  });

  it('la partida alimenta la lógica del perfil y el informe muestra el marco y la IA', () => {
    const s = student(8);
    const outcome: GameOutcome = {
      gameId: 'robi', level: 3, abandoned: false, success: true, personalMetric: 30,
      observations: [{ dim: 'logica', value: 0.8, weight: 1 }], metrics: { accuracy: 1 }, durationMs: 1000,
      tags: { robi: [{ id: 'an5', tipo: 'falsaCausa', acierto: true, conPista: false }], robiPlan: [{ tipo: 'falsaCausa', motivo: 'practicar', dominio: 0.33, otroGusto: false }] },
    };
    applyOutcome(s, GAME_BY_ID.robi, outcome, { phase: 2, projectId: 'p' });
    applyOutcome(s, GAME_BY_ID.robi, { ...outcome }, { phase: 2, projectId: 'p' });
    expect(s.dims.logica.n).toBe(2);
    const el = reportView(buildReport(s));
    const box = el.querySelector('.basis-box[data-frame="robi"]')!;
    expect(box.textContent).toContain('Chase, Chin, Oppezzo y Schwartz (2009)');
    expect(box.textContent).toContain('Falsa causa 2/2');
    expect(box.textContent).toContain('practicó Falsa causa (dominio 33 %)');
  });
});

// ── Regresiones encontradas en QA ───────────────────────────────────────
describe('regresiones de ¡Robi, eso no!', () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  function liveCtx(opts: { fast: boolean; level?: number; says?: string[] }) {
    const root = document.createElement('div');
    document.body.append(root);
    const ac = new AbortController();
    const ctx: GameContext = {
      root, student: student(9), level: opts.level ?? 3, ageBand: 'old', culture: getCulture('america'), theme: getTheme('animales'),
      rng: makeRng(4), say: (t: string) => { opts.says?.push(t); return Promise.resolve(); }, sfx: () => {}, exitSignal: ac.signal, fast: opts.fast, gameName,
    };
    const p = robiGame.play(ctx);
    return { ctx, ac, p };
  }
  const tipoOnScreen = (root: HTMLElement) => {
    const frase = root.querySelector('.robi-bubble p')?.textContent ?? '';
    return REASONINGS.find((x) => frase.includes(x.frase.es))?.tipo;
  };

  it('un doble toque no contesta la pantalla siguiente sin haberla escuchado', async () => {
    const { ctx, ac, p } = liveCtx({ fast: false });
    await sleep(5);
    const bubble = () => ctx.root.querySelector('.robi-bubble p')?.textContent;
    const first = bubble();
    // Toque inmediato (el 2.º toque de un doble toque): se ignora.
    ctx.root.querySelector<HTMLButtonElement>('[data-robi="sense"]')!.click();
    ctx.root.querySelector<HTMLButtonElement>('[data-robi="nope"]')!.click();
    await sleep(20);
    expect(bubble()).toBe(first);
    expect(ctx.root.querySelector('.robi-option')).toBeNull();
    // Un toque de verdad, pasado un momento, sí cuenta.
    await sleep(400);
    const fallacy = tipoOnScreen(ctx.root) !== 'ninguno';
    ctx.root.querySelector<HTMLButtonElement>(fallacy ? '[data-robi="nope"]' : '[data-robi="sense"]')!.click();
    await sleep(20);
    if (fallacy) {
      // La pantalla del «por qué» tampoco acepta un toque inmediato.
      ctx.root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]')!.click();
      await sleep(20);
      expect(ctx.root.querySelector('[data-done]')).toBeNull();
      await sleep(400);
      ctx.root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]')!.click();
      await sleep(600);
    }
    // Y «Siguiente» tampoco: sin el arreglo, el 2.º toque saltaba lo que Robi ha aprendido.
    const learned = bubble();
    ctx.root.querySelector<HTMLButtonElement>('[data-done]')!.click();
    await sleep(20);
    expect(bubble()).toBe(learned);
    ac.abort();
    const out = await p;
    expect(out.abandoned).toBe(true);
  });

  it('la pantalla del «por qué» se dice en UNA locución (no se corta) y cada opción tiene su 🔊', async () => {
    const says: string[] = [];
    const { ctx, ac, p } = liveCtx({ fast: true, says, level: 3 });
    for (let i = 0; i < 50 && !ctx.root.querySelector('.robi-option'); i++) {
      await sleep(3);
      const tipo = tipoOnScreen(ctx.root);
      if (ctx.root.querySelector('[data-done]')) { ctx.root.querySelector<HTMLButtonElement>('[data-done]')!.click(); continue; }
      if (!tipo) continue;
      says.length = 0;
      ctx.root.querySelector<HTMLButtonElement>(tipo === 'ninguno' ? '[data-robi="sense"]' : '[data-robi="nope"]')!.click();
      await sleep(3);
    }
    const opts = [...ctx.root.querySelectorAll<HTMLElement>('.robi-opt')];
    expect(opts).toHaveLength(3);
    // Una sola locución con el «¡Vaya!…», la pregunta y las opciones (dos seguidas: la 2.ª corta la 1.ª).
    expect(says).toHaveLength(1);
    expect(says[0]).toContain('¿Me he liado?');
    expect(says[0]).toContain('¿Por qué no tiene sentido?');
    for (const o of opts) {
      const speak = o.querySelector<HTMLButtonElement>('.speak-btn');
      expect(speak, 'cada opción se puede escuchar').not.toBeNull();
      expect(speak!.hasAttribute('data-nobot')).toBe(true);
      says.length = 0;
      speak!.click();
      expect(says).toEqual([o.querySelector('.robi-option')!.textContent]);
    }
    // Tocar el 🔊 de una opción no la elige.
    expect(ctx.root.querySelector('.robi-option')).not.toBeNull();
    ac.abort();
    await p;
  });

  it('historial dañado en localStorage: la IA y el informe no se rompen', () => {
    const s = student(8);
    const bad = (tags: unknown) => s.plays.push({ gameId: 'robi', date: Date.now(), level: 3, phase: 2, projectId: 'p', stars: 2, outcome: {
      gameId: 'robi', level: 3, abandoned: false, success: true, personalMetric: 0, observations: [], metrics: {}, durationMs: 1, tags: tags as GameOutcome['tags'],
    } });
    bad({ robi: [null, 'x', 7, { id: 1, tipo: 'absurdo' }, { id: 'an1', tipo: 'inventado' }, { id: 'an2', tipo: 'absurdo', acierto: 'si' }], robiPlan: 'x' });
    bad({ robi: 'texto', robiPlan: [null, { motivo: 'practicar', tipo: 'inventado', dominio: 0.4 }, { motivo: 'practicar', tipo: 'absurdo', dominio: 'mucho' }] });
    bad({ robi: { id: 'an3' } });
    expect(robiHistory(s)).toEqual([{ id: 'an2', tipo: 'absurdo', acierto: false, conPista: false }]);
    expect(() => planRobi(s, 3, { themeId: 'animales', regionId: 'europa', rng: makeRng(1) })).not.toThrow();
    const el = reportView(buildReport(s));
    const box = el.querySelector('.basis-box[data-frame="robi"]')!;
    expect(box.textContent).toContain('Absurdos 0/1');
    expect(box.textContent).not.toMatch(/NaN|undefined/);
    expect(box.textContent).not.toContain('última partida');
    // Un plan que es un texto (tiene .length pero no .find) tampoco rompe el informe.
    const s2 = student(8);
    s2.plays.push({ gameId: 'robi', date: Date.now(), level: 3, phase: 2, projectId: 'p', stars: 2, outcome: {
      gameId: 'robi', level: 3, abandoned: false, success: true, personalMetric: 0, observations: [], metrics: {}, durationMs: 1, tags: { robiPlan: 'x' } as unknown as GameOutcome['tags'],
    } });
    expect(() => reportView(buildReport(s2))).not.toThrow();
  });

  it('temas dañados o sin gustos y niveles no numéricos no dejan la partida sin razonamientos', () => {
    const s = student(8);
    s.favoriteThemes = ['constructor', '__proto__', 'toString'];
    expect(gustosFor(s, 'espacio')).toEqual([]);
    expect(availableFallacies(Number.NaN)).toEqual(['absurdo']);
    for (const level of [Number.NaN, 0, -3, 99]) {
      const plan = planRobi(s, level, { themeId: 'espacio', regionId: 'africa', rng: makeRng(3) });
      expect(plan).toHaveLength(3);
      expect(plan.filter((p) => p.reasoning.tipo === 'ninguno')).toHaveLength(1);
      for (const p of plan) expect(p.decision.tipo).toBe(p.reasoning.tipo);
    }
  });

  it('Robi no da las gracias dos veces («¡Gracias, profe! ¡Gracias!…»)', () => {
    for (const r of REASONINGS) for (const l of ['es', 'en', 'fr'] as const) {
      expect(r.aprende[l], `${r.id}/${l}`).not.toMatch(/^¡?\s*(gracias|thanks|thank you|merci)\b/i);
    }
  });
});

// ── Revisión de código y contenido (estrategias, IA, contenido) ─────────
describe('Robi: no se gana sin pensar', () => {
  type Strategy = (root: HTMLElement, rnd: () => number) => HTMLButtonElement | null;
  /** Juega una partida entera con una estrategia (modo rápido). */
  async function playWith(level: number, seed: number, strategy: Strategy, opts: { student?: ReturnType<typeof student>; says?: string[]; lang?: 'es' | 'en' | 'fr' } = {}) {
    if (opts.lang) setLang(opts.lang);
    const root = document.createElement('div');
    document.body.append(root);
    const s = opts.student ?? student(9);
    const ctx: GameContext = {
      root, student: s, level, ageBand: 'old', culture: getCulture('america'), theme: getTheme('animales'),
      rng: makeRng(seed), say: (t: string) => { opts.says?.push(t); return Promise.resolve(); }, sfx: () => {}, exitSignal: new AbortController().signal, fast: true, gameName,
    };
    const rnd = makeRng(seed * 31 + 7);
    let finished = false;
    const p = robiGame.play(ctx).finally(() => { finished = true; });
    for (let i = 0; i < 600 && !finished; i++) {
      await new Promise((r) => setTimeout(r, 1));
      strategy(root, rnd)?.click();
    }
    const out = await p;
    root.remove();
    return out;
  }
  const btns = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && !b.hasAttribute('data-nobot'));
  const nopeAll: Strategy = (root, rnd) => root.querySelector<HTMLButtonElement>('[data-robi="nope"]') ?? (btns(root)[Math.floor(rnd() * btns(root).length)] ?? null);
  const random: Strategy = (root, rnd) => { const b = btns(root); return b[Math.floor(rnd() * b.length)] ?? null; };
  const tipoOf = (root: HTMLElement) => {
    const f = root.querySelector('.robi-bubble p')?.textContent ?? '';
    return REASONINGS.find((x) => f.includes(x.frase.es) || f.includes(x.frase.en) || f.includes(x.frase.fr))?.tipo;
  };

  it('«¡Eso no!» a todo nunca es logro (niveles 1, 3 y 5)', async () => {
    for (const level of [1, 3, 5]) for (let seed = 1; seed <= 12; seed++) {
      const out = await playWith(level, seed, nopeAll);
      expect(out.success, `nivel ${level} semilla ${seed}`).toBe(false);
    }
  });

  it('tocar al azar casi nunca es logro (niveles 1, 3 y 5)', async () => {
    for (const level of [1, 3, 5]) {
      let wins = 0;
      const N = 40;
      for (let seed = 1; seed <= N; seed++) if ((await playWith(level, seed, random)).success) wins++;
      // Antes del arreglo, ~70 % de logros al azar; ahora la gran mayoría no lo es.
      expect(wins / N, `nivel ${level}`).toBeLessThan(0.35);
    }
  });

  it('acertar el juicio solo al 2.º intento no puntúa, aunque el niño siga al porqué', async () => {
    let wrongFirst = new Set<string>();
    const strat: Strategy = (root) => {
      const f = root.querySelector('.robi-bubble p')?.textContent ?? '';
      const judge = root.querySelector('[data-robi]');
      if (judge) {
        const tipo = tipoOf(root);
        const key = f.replace(/^.*?: /, '');
        // Primero se equivoca; en la duda, acierta.
        const firstTime = !f.startsWith('Mmm');
        if (firstTime) wrongFirst.add(key);
        const right = tipo === 'ninguno' ? 'sense' : 'nope';
        return root.querySelector<HTMLButtonElement>(`[data-robi="${firstTime ? (right === 'sense' ? 'nope' : 'sense') : right}"]`);
      }
      return root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]') ?? root.querySelector<HTMLButtonElement>('[data-done]');
    };
    const out = await playWith(3, 5, strat);
    expect(wrongFirst.size).toBeGreaterThan(0);
    expect(out.metrics.aciertos).toBe(0);
    expect(out.success).toBe(false);
    expect(out.tags?.robi?.every((a) => !a.acierto)).toBe(true);
    wrongFirst = new Set();
  });

  it('en el porqué no se gana por eliminación (niveles 1–2: tras un fallo queda 1 opción)', async () => {
    const strat: Strategy = (root) => {
      if (root.querySelector('[data-robi]')) return root.querySelector<HTMLButtonElement>(`[data-robi="${tipoOf(root) === 'ninguno' ? 'sense' : 'nope'}"]`);
      return root.querySelector<HTMLButtonElement>('.robi-option[data-correct="false"]:not([disabled])')
        ?? root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]') ?? root.querySelector<HTMLButtonElement>('[data-done]');
    };
    for (const level of [1, 2]) {
      const out = await playWith(level, 3, strat);
      // Solo puntúa el razonamiento correcto; los dos fallos se explican, no se ganan.
      expect(out.metrics.aciertos).toBe(1);
      expect(out.success).toBe(false);
    }
  });

  it('acierto con pista (nivel 3+): conPista y menos lógica que a la primera', async () => {
    const perfect: Strategy = (root) => root.querySelector('[data-robi]')
      ? root.querySelector<HTMLButtonElement>(`[data-robi="${tipoOf(root) === 'ninguno' ? 'sense' : 'nope'}"]`)
      : root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]') ?? root.querySelector<HTMLButtonElement>('[data-done]');
    const oneMiss: Strategy = (root) => root.querySelector('[data-robi]')
      ? perfect(root, () => 0)
      : (root.querySelector('.robi-option[disabled]') ? null : root.querySelector<HTMLButtonElement>('.robi-option[data-correct="false"]'))
        ?? root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]') ?? root.querySelector<HTMLButtonElement>('[data-done]');
    const a = await playWith(3, 9, perfect);
    const b = await playWith(3, 9, oneMiss);
    expect(b.tags?.robi?.filter((x) => x.tipo !== 'ninguno').every((x) => x.acierto && x.conPista)).toBe(true);
    expect(b.metrics.pistasRobi).toBe(2);
    expect(b.observations[0].value).toBeLessThan(a.observations[0].value);
    expect(dominio([{ id: 'x', tipo: 'absurdo', acierto: true, conPista: true }], 'absurdo')).toBeCloseTo(1.5 / 3);
  });

  it('el porqué tiene 2 opciones en niveles 1–2 y 3 desde el nivel 3', async () => {
    for (const level of [1, 2, 3, 4, 5]) {
      let seen = 0;
      const strat: Strategy = (root) => {
        const n = root.querySelectorAll('.robi-option').length;
        if (n && !seen) seen = n;
        return root.querySelector('[data-robi]')
          ? root.querySelector<HTMLButtonElement>(`[data-robi="${tipoOf(root) === 'ninguno' ? 'sense' : 'nope'}"]`)
          : root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]') ?? root.querySelector<HTMLButtonElement>('[data-done]');
      };
      await playWith(level, 2, strat);
      expect(seen, `nivel ${level}`).toBe(level <= 2 ? 2 : 3);
    }
  });

  it('tras un fallo, Robi no empieza su explicación con «¡Claro!» y en francés dice « vraiment ? »', async () => {
    const says: string[] = [];
    const strat: Strategy = (root) => {
      if (root.querySelector('[data-robi]')) return root.querySelector<HTMLButtonElement>(`[data-robi="${tipoOf(root) === 'ninguno' ? 'nope' : 'sense'}"]`);
      return root.querySelector<HTMLButtonElement>('[data-done]');
    };
    await playWith(2, 4, strat, { says, lang: 'fr' });
    expect(says.some((t) => t.startsWith('Mmm… vraiment ? Écoute encore'))).toBe(true);
    expect(says.join('\n')).not.toContain('tu es sûr');
    const oops = says.filter((t) => t.startsWith('Ce n’est pas grave !'));
    expect(oops).toHaveLength(3);
    for (const t of oops) expect(t).not.toMatch(/\. (Bien sûr|D’accord|Compris|Super|Je vois|J’ai compris|C’est ça|Ah|Ouf|Maintenant, je sais) !/);
    expect(withoutCheer('¡Claro! El sol sale.')).toBe('El sol sale.');
    expect(withoutCheer('D’accord ! Ils sautent.')).toBe('Ils sautent.');
    expect(withoutCheer('¡Bien!')).toBe('¡Bien!');
    expect(withoutCheer('Sin exclamación inicial.')).toBe('Sin exclamación inicial.');
  });

  it('abandonar en cada fase: sin listeners colgando y las respuestas dadas cuentan como vistas (sin puntuar)', async () => {
    for (const phase of ['juzgar', 'porque', 'aprende'] as const) {
      const ac = new AbortController();
      const active = new Set<unknown>();
      const add = ac.signal.addEventListener.bind(ac.signal);
      const remove = ac.signal.removeEventListener.bind(ac.signal);
      ac.signal.addEventListener = ((t: string, l: EventListenerOrEventListenerObject, o?: AddEventListenerOptions) => { active.add(l); add(t, l, o); }) as typeof ac.signal.addEventListener;
      ac.signal.removeEventListener = ((t: string, l: EventListenerOrEventListenerObject, o?: EventListenerOptions) => { active.delete(l); remove(t, l, o); }) as typeof ac.signal.removeEventListener;
      const root = document.createElement('div');
      document.body.append(root);
      const s = student(9);
      const ctx: GameContext = {
        root, student: s, level: 3, ageBand: 'old', culture: getCulture('america'), theme: getTheme('animales'),
        rng: makeRng(6), say: () => Promise.resolve(), sfx: () => {}, exitSignal: ac.signal, fast: true, gameName,
      };
      const p = robiGame.play(ctx);
      let answered = 0;
      const atPhase = () => phase === 'juzgar' ? answered >= 1 && !!root.querySelector('[data-robi]')
        : phase === 'porque' ? !!root.querySelector('.robi-option') : !!root.querySelector('[data-done]');
      for (let i = 0; i < 300 && !atPhase(); i++) {
        await new Promise((r) => setTimeout(r, 1));
        if (atPhase()) break;
        if (root.querySelector('[data-robi]')) root.querySelector<HTMLButtonElement>(`[data-robi="${tipoOf(root) === 'ninguno' ? 'sense' : 'nope'}"]`)!.click();
        else if (root.querySelector('.robi-option')) root.querySelector<HTMLButtonElement>('.robi-option[data-correct="true"]')!.click();
        else if (root.querySelector('[data-done]')) { root.querySelector<HTMLButtonElement>('[data-done]')!.click(); answered++; }
      }
      expect(atPhase(), phase).toBe(true);
      // Mientras espera, solo hay UNA escucha de salida (la de la espera actual): no se acumulan.
      expect(active.size, phase).toBe(1);
      ac.abort();
      const out = await p;
      expect(out.abandoned).toBe(true);
      expect(out.success).toBe(false);
      expect(active.size, phase).toBe(0);
      expect(out.tags?.robi).toHaveLength(answered);
      // Guardada: cuenta como vista para no repetirla, pero no para el dominio.
      s.plays.push({ gameId: 'robi', date: Date.now(), level: 3, phase: 2, projectId: 'p', stars: 0, outcome: out });
      expect(robiSeen(s)).toHaveLength(answered);
      expect(robiHistory(s)).toHaveLength(0);
      root.remove();
    }
  });
});

describe('Robi: IA adaptativa (revisión)', () => {
  it('ventana de 12 recientes con varias partidas: los 12 últimos no salen; también los vistos en abandonos', () => {
    const s = student();
    const ids = REASONINGS.filter((r) => !r.regiones).map((r) => r);
    // 5 partidas × 3 razonamientos (15): los 3 más antiguos ya pueden volver a salir.
    for (let k = 0; k < 5; k++) addPlay(s, ids.slice(k * 3, k * 3 + 3).map((r) => ({ id: r.id, tipo: r.tipo, acierto: true, conPista: false })));
    const last12 = new Set(ids.slice(3, 15).map((r) => r.id));
    expect(robiSeen(s).slice(-RAZONAMIENTOS_RECIENTES)).toEqual([...last12]);
    for (let seed = 1; seed < 80; seed++) for (const p of planRobi(s, 5, { themeId: 'animales', regionId: 'europa', rng: makeRng(seed) })) {
      expect(last12.has(p.reasoning.id), p.reasoning.id).toBe(false);
    }
    // Una partida abandonada también cuenta como vista.
    const ab = REASONINGS.find((r) => r.id === 'de11')!;
    expect(robiSeen(s)).not.toContain(ab.id);
    s.plays.push({ gameId: 'robi', date: Date.now(), level: 3, phase: 2, projectId: 'p', stars: 0, outcome: {
      gameId: 'robi', level: 3, abandoned: true, success: false, personalMetric: 0, observations: [], metrics: {}, durationMs: 1, tags: { robi: [{ id: ab.id, tipo: 'ninguno', acierto: false, conPista: false }] },
    } });
    const before = planRobi(student(), 5, { themeId: 'futbol', regionId: 'europa', rng: makeRng(1) }).length;
    expect(before).toBe(3);
    for (let seed = 1; seed < 40; seed++) for (const p of planRobi(s, 5, { themeId: 'futbol', regionId: 'europa', rng: makeRng(seed) })) expect(p.reasoning.id).not.toBe(ab.id);
    // …pero no puntúa: el dominio de «ninguno» no cambia.
    expect(robiHistory(s).some((a) => a.id === ab.id)).toBe(false);
  });

  it('sin razonamientos frescos elige el que vio hace más tiempo', () => {
    const s = student();
    const absurdos = REASONINGS.filter((r) => r.tipo === 'absurdo' && !r.regiones);
    expect(absurdos.length).toBeLessThanOrEqual(RAZONAMIENTOS_RECIENTES);
    addPlay(s, absurdos.map((r) => ({ id: r.id, tipo: 'absurdo', acierto: true, conPista: false })));
    const oldest2 = absurdos.slice(0, 2).map((r) => r.id).sort();
    for (let seed = 1; seed < 30; seed++) {
      const got = planRobi(s, 1, { themeId: 'animales', regionId: 'europa', rng: makeRng(seed) }).filter((p) => p.reasoning.tipo === 'absurdo').map((p) => p.reasoning.id).sort();
      expect(got).toEqual(oldest2);
    }
  });

  it('contenido agotado: nunca repite id ni saca razonamientos de otro continente', () => {
    const backup = REASONINGS.slice();
    try {
      const keep = ['an1', 'an11', 'co11', 'rg-oc', 'rg-am'];
      REASONINGS.splice(0, REASONINGS.length, ...backup.filter((r) => keep.includes(r.id)));
      for (let seed = 1; seed < 30; seed++) {
        const plan = planRobi(student(), 2, { themeId: 'futbol', regionId: 'africa', rng: makeRng(seed) });
        expect(new Set(plan.map((p) => p.reasoning.id)).size).toBe(3);
        for (const p of plan) {
          expect(p.reasoning.regiones, p.reasoning.id).toBeUndefined();
          expect(p.decision.tipo).toBe(p.reasoning.tipo);
        }
      }
    } finally {
      REASONINGS.splice(0, REASONINGS.length, ...backup);
    }
  });

  it('prefiere el tema actual frente a sus favoritos', () => {
    const s = student();
    s.favoriteThemes = ['cocina', 'animales'];
    expect(gustosFor(s, 'futbol')).toEqual(['deporte', 'comida', 'animales']);
    for (let seed = 1; seed < 40; seed++) {
      for (const p of planRobi(s, 3, { themeId: 'futbol', regionId: 'asia', rng: makeRng(seed) })) expect(p.reasoning.gusto).toBe('deporte');
    }
    // Con un tema sin gustos ('espacio') usa sus favoritos.
    for (let seed = 1; seed < 20; seed++) {
      for (const p of planRobi(s, 1, { themeId: 'espacio', regionId: 'asia', rng: makeRng(seed) })) expect(['comida', 'animales']).toContain(p.reasoning.gusto);
    }
  });

  it('un niño nuevo (todo empatado) explora: el informe no dice «practicó» sin datos', () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const p of planRobi(student(), 4, { themeId: 'animales', regionId: 'europa', rng: makeRng(seed) })) {
        expect(p.decision.motivo).not.toBe('practicar');
      }
    }
  });
});

describe('Robi: validación del contenido', () => {
  it('gusto, tipo, regiones, escena y opciones bien formados', () => {
    for (const r of REASONINGS) {
      expect(['animales', 'deporte', 'comida'], r.id).toContain(r.gusto);
      expect([...FALLACIES, 'ninguno'], r.id).toContain(r.tipo);
      expect(r.escena.trim(), r.id).not.toBe('');
      if (r.regiones) {
        expect(r.regiones.length, r.id).toBeGreaterThan(0);
        for (const g of r.regiones) expect(CULTURES.map((c) => c.id), r.id).toContain(g);
      }
      if (r.opciones) expect(r.opciones[0].correcta, `${r.id}: la primera opción es la correcta`).toBe(true);
      for (const l of ['es', 'en', 'fr'] as const) expect(r.aprende[l], r.id).not.toMatch(/^¡?\s*(gracias|thanks|merci)/i);
    }
  });

  it('de11 ya no es una regla al revés («ha entrado… ¡es gol!») y an2 es «al revés»', () => {
    const by = (id: string) => REASONINGS.find((r) => r.id === id)!;
    expect(by('de11').tipo).toBe('ninguno');
    expect(by('de11').frase.es).toContain('¡Necesitamos un balón!');
    expect(by('de11').frase.es).not.toContain('gol');
    expect(by('an2').tipo).toBe('alReves');
  });
});
