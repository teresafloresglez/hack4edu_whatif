import type { GameContext, GameDef, GameOutcome } from '../core/types';
import { shuffle, sample, pick } from '../core/rng';
import {
  h, render, instruction, wait, waitFor, flash, obs, now, speedScore, isAbort, abandonedOutcome,
  expectedResponseMs, levelRel, closedSuccess,
} from './common';
import { tr } from '../i18n';
import { BASIC_COLORS, SHAPES, type ShapeId, shapeEl } from './shapes';

// Fase 2 · Planificar · Respuesta cerrada.
// Al subir de nivel: patrones más largos y reglas combinadas (forma + color).

type Token = { kind: 'emoji'; v: string } | { kind: 'shape'; shape: ShapeId; color: string };

const key = (t: Token) => (t.kind === 'emoji' ? t.v : `${t.shape}-${t.color}`);

const SIMPLE_RULES = [
  [0, 1], // AB
  [0, 0, 1], // AAB
  [0, 1, 2], // ABC
  [0, 1, 1], // ABB
  [0, 0, 1, 1], // AABB
  [0, 1, 2, 1], // ABCB
];

export interface PatternTrial {
  shown: (Token | null)[]; // null = hueco
  answer: Token;
  options: Token[];
}

export function buildPattern(level: number, items: string[], rng: () => number): PatternTrial {
  const lv = Math.max(1, Math.min(5, level));
  const nOptions = lv <= 2 ? 3 : 4;
  let seq: Token[];
  if (lv <= 3) {
    const rule = lv === 1 ? SIMPLE_RULES[0] : lv === 2 ? pick(SIMPLE_RULES.slice(0, 3), rng) : pick(SIMPLE_RULES.slice(2), rng);
    const symbols = sample([...new Set(items)], 3, rng);
    const len = rule.length * (lv === 1 ? 3 : 2) + 1;
    seq = Array.from({ length: len }, (_, i) => ({ kind: 'emoji', v: symbols[rule[i % rule.length]] }) as Token);
  } else {
    // Regla combinada: la forma sigue un ciclo y el color otro distinto.
    const shapes = sample(SHAPES, 3, rng);
    const colors = sample(BASIC_COLORS, 3, rng);
    const shapeRule = pick([[0, 1], [0, 1, 2]], rng);
    const colorRule = shapeRule.length === 2 ? [0, 1, 2] : [0, 1];
    const len = lv === 4 ? 7 : 9;
    seq = Array.from({ length: len }, (_, i) => ({
      kind: 'shape', shape: shapes[shapeRule[i % shapeRule.length]], color: colors[colorRule[i % colorRule.length]],
    }) as Token);
  }
  // Hueco: al final; en nivel 5, a veces en medio.
  const hole = lv === 5 && rng() < 0.5 ? Math.floor(seq.length / 2) : seq.length - 1;
  const answer = seq[hole];
  const shown = seq.map((t, i) => (i === hole ? null : t));
  const distract = new Map<string, Token>();
  for (const t of seq) if (key(t) !== key(answer)) distract.set(key(t), t);
  if (answer.kind === 'shape') {
    for (const s of SHAPES) distract.set(`${s}-${answer.color}`, { kind: 'shape', shape: s, color: answer.color });
    for (const c of BASIC_COLORS) distract.set(`${answer.shape}-${c}`, { kind: 'shape', shape: answer.shape, color: c });
  } else {
    for (const it of items) if (it !== answer.v) distract.set(it, { kind: 'emoji', v: it });
  }
  distract.delete(key(answer));
  // Priorizar los que aparecen en la secuencia (más difíciles).
  const inSeq = [...distract.values()].filter((t) => seq.some((s) => key(s) === key(t)));
  const others = [...distract.values()].filter((t) => !inSeq.includes(t));
  const chosen = [...shuffle(inSeq, rng), ...shuffle(others, rng)].slice(0, nOptions - 1);
  return { shown, answer, options: shuffle([answer, ...chosen], rng) };
}

function tokenEl(t: Token | null, size: number): HTMLElement {
  if (!t) return h('span', { class: 'pattern-hole', 'aria-label': tr({ es: 'hueco', en: 'gap', fr: 'trou' }) }, '❔');
  if (t.kind === 'emoji') return h('span', { class: 'pattern-emoji', style: { fontSize: `${size * 0.8}px` } }, t.v);
  return shapeEl(t.shape, t.color, size);
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const trials = 5;
  let correct = 0, done = 0, fastErrors = 0, slow = 0;
  const rts: number[] = [];
  const expected = expectedResponseMs(ctx) * 1.3;
  const size = ctx.ageBand === 'young' ? 52 : 44;

  try {
    for (let t = 0; t < trials; t++) {
      const trial = buildPattern(ctx.level, ctx.theme.items, ctx.rng);
      const row = h('div', { class: 'pattern-row' }, ...trial.shown.map((x) => tokenEl(x, size)));
      const opts = h('div', { class: 'choice-grid cols-' + Math.min(4, trial.options.length) });
      const buttons = trial.options.map((o) => {
        const b = h('button', { class: 'choice-btn', type: 'button', 'aria-label': tr({ es: 'opción', en: 'option', fr: 'option' }) }, tokenEl(o, size + 10));
        opts.append(b);
        return { b, o };
      });
      render(ctx,
        t === 0 ? instruction(ctx, 'patrones', tr({ es: '¿Qué va en el hueco? Mira cómo se repite y toca la pieza que falta.', en: 'What goes in the gap? Look at how it repeats and tap the missing piece.', fr: 'Qu’est-ce qui va dans le trou ? Regarde comment ça se répète et touche la pièce qui manque.' })) : null,
        h('div', { class: 'progress-dots', 'aria-hidden': 'true' }, ...Array.from({ length: trials }, (_, i) => h('span', { class: i < t ? 'dot done' : i === t ? 'dot now' : 'dot' }))),
        row, opts);
      const t0 = now();
      const chosen = await waitFor<Token>(ctx, (done) => {
        for (const { b, o } of buttons) b.onclick = () => done(o);
      });
      const rt = now() - t0;
      rts.push(rt);
      done++;
      if (rt > expected * 2.5) slow++;
      const btn = buttons.find((x) => x.o === chosen)!.b;
      if (key(chosen) === key(trial.answer)) {
        correct++;
        ctx.sfx('ok');
        flash(btn, 'ok');
        row.querySelector('.pattern-hole')?.replaceWith(tokenEl(trial.answer, size));
      } else {
        ctx.sfx('bad');
        flash(btn, 'bad');
        if (rt < 1000) fastErrors++;
        buttons.find((x) => key(x.o) === key(trial.answer))?.b.classList.add('reveal');
      }
      await wait(ctx, 900);
    }
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('patrones', ctx.level, start, [], { responses: done });
  }

  const accuracy = done ? correct / done : 0;
  const meanRt = rts.reduce((a, b) => a + b, 0) / Math.max(1, rts.length);
  return {
    gameId: 'patrones',
    level: ctx.level,
    abandoned: false,
    success: closedSuccess(accuracy),
    personalMetric: correct * 10 + ctx.level,
    observations: [
      obs('logica', 0.65 * accuracy + 0.15 * speedScore(meanRt, expected) + 0.2 * levelRel(ctx), 1),
      obs('autorregulacion', 1 - fastErrors / Math.max(1, done), 0.25),
    ],
    metrics: { accuracy, correct, trials: done, meanRtMs: Math.round(meanRt), fastErrors, slowResponses: slow, responses: done },
    durationMs: now() - start,
  };
}

export const patronesGame: GameDef = {
  id: 'patrones',
  name: { es: 'Patrones', en: 'Patterns', fr: 'Suites' },
  icon: '🧩',
  phase: 2,
  kind: 'cerrada',
  dims: ['logica'],
  predict: 'stars',
  teacherInfo: {
    es: 'Completar series. En niveles altos combinan dos reglas (forma y color). Mide aciertos y rapidez.',
    en: 'Complete sequences. Higher levels combine two rules (shape and colour). Measures accuracy and speed.',
    fr: 'Compléter des suites. Aux niveaux élevés, deux règles se combinent (forme et couleur). Mesure la justesse et la rapidité.',
  },
  play,
};
