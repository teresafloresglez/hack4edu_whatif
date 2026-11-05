import type { GameContext, GameDef, GameOutcome } from '../core/types';
import { shuffle, pick } from '../core/rng';
import {
  h, render, instruction, wait, waitFor, flash, obs, now, speedScore, isAbort, abandonedOutcome,
  expectedResponseMs, levelRel, closedSuccess,
} from './common';
import { tr } from '../i18n';
import { BASIC_COLORS, COLOR_BY_ID, COLORS, SHAPES, SHAPE_NAME, type ShapeId, shapeEl } from './shapes';

// Fase 1 · Investigar · Respuesta cerrada.
// Busca la figura igual al modelo. Al subir de nivel: más elementos,
// menos tiempo y colores parecidos (apartado 3.B del proyecto).

interface Item { shape: ShapeId; color: string }

const LEVELS = [
  { options: 4, trials: 6, timeMs: 0, similar: 0, shapes: 3 },
  { options: 6, trials: 7, timeMs: 0, similar: 1, shapes: 4 },
  { options: 6, trials: 8, timeMs: 9000, similar: 2, shapes: 5 },
  { options: 9, trials: 8, timeMs: 7000, similar: 3, shapes: 6 },
  { options: 9, trials: 9, timeMs: 5500, similar: 4, shapes: 6 },
];

const same = (a: Item, b: Item) => a.shape === b.shape && a.color === b.color;

export function buildTrial(level: number, rng: () => number): { target: Item; options: Item[] } {
  const L = LEVELS[Math.max(0, Math.min(4, level - 1))];
  const shapes = SHAPES.slice(0, L.shapes);
  const colorPool = L.similar > 0 ? COLORS.map((c) => c.id) : BASIC_COLORS;
  const target: Item = { shape: pick(shapes, rng), color: pick(level >= 3 ? colorPool : BASIC_COLORS, rng) };
  const opts: Item[] = [target];
  const add = (it: Item) => {
    if (!opts.some((o) => same(o, it))) opts.push(it);
  };
  // Siempre un distractor de misma forma y otro color (mide discriminación de color).
  const sims = COLOR_BY_ID[target.color].similar.filter((c) => COLOR_BY_ID[c]);
  for (let i = 0; i < L.similar && i < sims.length; i++) add({ shape: target.shape, color: sims[i] });
  add({ shape: target.shape, color: pick(BASIC_COLORS.filter((c) => c !== target.color), rng) });
  // Uno de mismo color y otra forma (mide discriminación de forma).
  add({ shape: pick(shapes.filter((s) => s !== target.shape), rng), color: target.color });
  let guard = 0;
  while (opts.length < L.options && guard++ < 200) {
    add({ shape: pick(shapes, rng), color: pick(colorPool, rng) });
  }
  return { target, options: shuffle(opts.slice(0, L.options), rng) };
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const L = LEVELS[Math.max(0, Math.min(4, ctx.level - 1))];
  let correct = 0, done = 0, similarColorErrors = 0, otherErrors = 0, fastErrors = 0, slow = 0, rgConfusions = 0;
  const rts: number[] = [];
  const expected = expectedResponseMs(ctx);

  try {
    for (let t = 0; t < L.trials; t++) {
      const { target, options } = buildTrial(ctx.level, ctx.rng);
      const progress = h('div', { class: 'progress-dots', 'aria-hidden': 'true' },
        ...Array.from({ length: L.trials }, (_, i) => h('span', { class: i < t ? 'dot done' : i === t ? 'dot now' : 'dot' })));
      const model = h('div', { class: 'model-card' }, shapeEl(target.shape, target.color, ctx.ageBand === 'young' ? 110 : 90));
      const grid = h('div', { class: `choice-grid cols-${options.length > 6 ? 3 : options.length > 4 ? 3 : 2}` });
      const buttons = options.map((it) => {
        const b = h('button', { class: 'choice-btn', type: 'button', 'aria-label': `${tr(SHAPE_NAME[it.shape])} ${tr(COLOR_BY_ID[it.color].name)}` },
          shapeEl(it.shape, it.color, ctx.ageBand === 'young' ? 72 : 60));
        grid.append(b);
        return { b, it };
      });
      let timerBar: HTMLElement | null = null;
      if (L.timeMs && t > 0) {
        timerBar = h('div', { class: 'timer-bar' }, h('span', { style: { animationDuration: `${ctx.fast ? 0.03 : L.timeMs / 1000}s` } }));
      }
      render(ctx,
        t === 0 ? instruction(ctx, 'investigar', tr({ es: 'Mira bien la figura de arriba. ¡Toca la que es igual!', en: 'Look carefully at the shape at the top. Tap the one that is the same!', fr: 'Regarde bien la forme en haut. Touche celle qui est pareille !' })) : null,
        progress, model, timerBar, grid);

      const t0 = now();
      const chosen = await waitFor<Item | null>(ctx, (done) => {
        for (const { b, it } of buttons) b.onclick = () => done(it);
      }, (L.timeMs && t > 0) ? L.timeMs : undefined, () => null); // 1.ª figura sin reloj: mientras suena el enunciado
      const rt = now() - t0;
      done++;
      rts.push(rt);
      if (rt > expected * 2.5) slow++;

      const chosenBtn = buttons.find((x) => x.it === chosen)?.b;
      if (chosen && same(chosen, target)) {
        correct++;
        ctx.sfx('ok');
        if (chosenBtn) flash(chosenBtn, 'ok');
      } else {
        ctx.sfx('bad');
        if (chosenBtn) flash(chosenBtn, 'bad');
        if (chosen) {
          if (chosen.shape === target.shape) {
            similarColorErrors++;
            const a = COLOR_BY_ID[chosen.color].rg, b = COLOR_BY_ID[target.color].rg;
            if (a && b && a !== b) rgConfusions++;
          } else otherErrors++;
          if (rt < 900) fastErrors++;
        }
        // Mostrar la correcta (aprender del error).
        buttons.find((x) => same(x.it, target))?.b.classList.add('reveal');
      }
      await wait(ctx, 700);
    }
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('colores', ctx.level, start, [], { responses: done, colorTrials: done });
  }

  const accuracy = done ? correct / done : 0;
  const meanRt = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : expected;
  const speed = speedScore(meanRt, expected);
  return {
    gameId: 'colores',
    level: ctx.level,
    abandoned: false,
    success: closedSuccess(accuracy),
    personalMetric: correct * 10 + ctx.level,
    observations: [
      obs('atencion', 0.6 * accuracy + 0.25 * speed + 0.15 * levelRel(ctx), 1),
      obs('autorregulacion', 1 - fastErrors / Math.max(1, done), 0.3),
    ],
    metrics: {
      accuracy, correct, trials: done, meanRtMs: Math.round(meanRt), fastErrors, slowResponses: slow,
      responses: done, colorTrials: done, rgConfusions,
    },
    tags: { similarColorErrors, otherErrors },
    durationMs: now() - start,
  };
}

export const coloresGame: GameDef = {
  id: 'colores',
  name: { es: 'Colores y formas', en: 'Colours and shapes', fr: 'Couleurs et formes' },
  icon: '🎨',
  phase: 1,
  kind: 'cerrada',
  dims: ['atencion', 'autorregulacion'],
  predict: 'stars',
  teacherInfo: {
    es: 'Buscar la figura idéntica entre distractores de color y forma. Mide aciertos, rapidez e impulsividad; distingue errores de color y de forma.',
    en: 'Find the identical shape among colour and shape distractors. Measures accuracy, speed and impulsiveness; separates colour errors from shape errors.',
    fr: 'Trouver la forme identique parmi des distracteurs de couleur et de forme. Mesure la justesse, la rapidité et l’impulsivité ; distingue erreurs de couleur et de forme.',
  },
  play,
};
