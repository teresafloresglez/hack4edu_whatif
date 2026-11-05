import type { GameContext, GameDef, GameOutcome } from '../core/types';
import { shuffle, sample } from '../core/rng';
import { tr } from '../i18n';
import { h, render, instruction, wait, waitFor, obs, now, isAbort, abandonedOutcome, levelRel, closedSuccess } from './common';

// Fase 1 · Investigar · Respuesta cerrada. Parejas con objetos del tema.

const PAIRS = [3, 4, 5, 6, 8];

export function memoryScore(pairs: number, moves: number, knownErrors: number, opportunities: number): number {
  const eff = Math.max(0, Math.min(1, 1 - (moves - 1.5 * pairs) / (2.5 * pairs)));
  const recall = opportunities > 0 ? 1 - knownErrors / opportunities : eff;
  return Math.max(0, Math.min(1, 0.5 * eff + 0.5 * recall));
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const pairs = PAIRS[Math.max(0, Math.min(4, ctx.level - 1))];
  const pool = [...ctx.theme.items, ...ctx.culture.food];
  const faces = sample([...new Set(pool)], pairs, ctx.rng);
  const deck = shuffle([...faces, ...faces], ctx.rng).map((f, i) => ({ id: i, face: f, matched: false }));
  const seen = new Map<number, string>(); // posición → cara vista
  let moves = 0, knownErrors = 0, opportunities = 0, matched = 0;
  const maxMoves = pairs * 8;

  const cols = pairs * 2 <= 6 ? 3 : 4;
  const grid = h('div', { class: `memory-grid cols-${cols}` });
  const btns = deck.map((c) =>
    h('button', { class: 'mem-card', type: 'button', 'aria-label': tr({ es: 'Carta', en: 'Card', fr: 'Carte' }), 'data-id': String(c.id) },
      h('span', { class: 'mem-back', 'aria-hidden': 'true' }, '❓'),
      h('span', { class: 'mem-face', 'aria-hidden': 'true' }, c.face)));
  grid.append(...btns);
  render(ctx, instruction(ctx, 'memoria', tr({ es: 'Da la vuelta a dos cartas. ¡Busca las parejas iguales!', en: 'Turn over two cards. Find the matching pairs!', fr: 'Retourne deux cartes. Trouve les paires identiques !' })), grid);

  const flip = (i: number, on: boolean) => btns[i].classList.toggle('flipped', on);

  try {
    while (matched < pairs && moves < maxMoves) {
      const pickCard = (exclude: number) =>
        waitFor<number>(ctx, (done) => {
          btns.forEach((b, i) => {
            b.onclick = () => {
              if (deck[i].matched || i === exclude) return;
              ctx.sfx('tap');
              done(i);
            };
          });
          return () => btns.forEach((b) => (b.onclick = null));
        });
      const a = await pickCard(-1);
      flip(a, true);
      const b = await pickCard(a);
      flip(b, true);
      moves++;

      // ¿Podía saber dónde estaba la pareja? (memoria de trabajo)
      const knownPartner = [...seen.entries()].some(([pos, face]) => pos !== a && face === deck[a].face && !deck[pos].matched);
      if (knownPartner) opportunities++;

      if (deck[a].face === deck[b].face) {
        deck[a].matched = deck[b].matched = true;
        matched++;
        ctx.sfx('ok');
        btns[a].classList.add('matched');
        btns[b].classList.add('matched');
        await wait(ctx, 350);
      } else {
        if (knownPartner) knownErrors++;
        ctx.sfx('bad');
        btns[a].classList.add('wrong');
        btns[b].classList.add('wrong');
        await wait(ctx, 900);
        btns[a].classList.remove('wrong');
        btns[b].classList.remove('wrong');
        flip(a, false);
        flip(b, false);
      }
      seen.set(a, deck[a].face);
      seen.set(b, deck[b].face);
    }
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('memoria', ctx.level, start, [], { moves, matched });
  }

  const completed = matched === pairs;
  if (!completed) {
    btns.forEach((b) => b.classList.add('flipped'));
    await wait(ctx, 1200).catch(() => undefined);
  }
  const score = completed ? memoryScore(pairs, moves, knownErrors, opportunities) : memoryScore(pairs, maxMoves, knownErrors + 2, opportunities + 2) * 0.6;
  const accuracy = score;
  return {
    gameId: 'memoria',
    level: ctx.level,
    abandoned: false,
    success: closedSuccess(score >= 0.6 ? 0.8 : score < 0.3 ? 0.4 : 0.6),
    personalMetric: Math.round(score * 100) + ctx.level * 100,
    observations: [obs('memoria', 0.8 * score + 0.2 * levelRel(ctx), 1)],
    metrics: { accuracy, pairs, moves, knownErrors, opportunities, completed: completed ? 1 : 0 },
    durationMs: now() - start,
  };
}

export const memoriaGame: GameDef = {
  id: 'memoria',
  name: { es: 'Memoria', en: 'Memory', fr: 'Mémoire' },
  icon: '🧠',
  phase: 1,
  kind: 'cerrada',
  dims: ['memoria'],
  predict: 'stars',
  teacherInfo: {
    es: 'Parejas de cartas con objetos del tema elegido. Mide movimientos frente al mínimo y errores en cartas que ya había visto.',
    en: 'Card pairs with objects from the chosen theme. Measures moves against the minimum and mistakes on cards already seen.',
    fr: 'Paires de cartes avec des objets du thème choisi. Mesure les coups par rapport au minimum et les erreurs sur des cartes déjà vues.',
  },
  play,
};
