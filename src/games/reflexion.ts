import type { GameContext, GameDef, GameOutcome, PlayRecord } from '../core/types';
import { fill, tr, type L } from '../i18n';
import { ic, type IconName } from '../ui/icons';
import { confirmChoice } from './common';
import { t } from '../i18n/strings';
import { h, render, instruction, wait, waitFor, obs, now, isAbort, abandonedOutcome } from './common';

// Fase 5 · Presentar y reflexionar (metacognición).
// El niño ve su producto final y responde: ¿qué fue lo más difícil?
// ¿cómo te has sentido? ¿qué harías distinto? Comparamos "lo más difícil"
// con el juego donde de verdad le costó más → calibración metacognitiva.

/** Rendimiento normalizado de una partida (0..1) para comparar juegos entre sí. */
export function playPerformance(p: PlayRecord): number {
  const o = p.outcome;
  if (o.abandoned) return 0;
  const vals = o.observations.map((x) => x.value);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.5;
}

/** Juego con peor rendimiento en el proyecto (el que objetivamente costó más). */
export function hardestGame(plays: PlayRecord[]): string | null {
  const byGame = new Map<string, number[]>();
  for (const p of plays) {
    if (p.gameId === 'reflexion') continue;
    byGame.set(p.gameId, [...(byGame.get(p.gameId) ?? []), playPerformance(p)]);
  }
  let worst: string | null = null, worstVal = Infinity;
  for (const [g, vals] of byGame) {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (m < worstVal) { worstVal = m; worst = g; }
  }
  return worst;
}

const CHANGES: { id: string; icon: IconName; text: L }[] = [
  { id: 'despacio', icon: 'slow', text: { es: 'Ir más despacio y pensar', en: 'Go more slowly and think', fr: 'Aller plus lentement et réfléchir' } },
  { id: 'pistas', icon: 'help', text: { es: 'Pedir más ayuda', en: 'Ask for more help', fr: "Demander plus d'aide" } },
  { id: 'ideas', icon: 'ideas', text: { es: 'Probar ideas nuevas', en: 'Try new ideas', fr: 'Essayer de nouvelles idées' } },
  { id: 'preguntar', icon: 'talk', text: { es: 'Preguntar más a los demás', en: 'Ask the others more', fr: 'Poser plus de questions aux autres' } },
  { id: 'nada', icon: 'same', text: { es: 'Lo haría igual', en: 'I would do it the same', fr: 'Je ferais pareil' } },
];

const FEELINGS: { icon: IconName; text: L }[] = [
  { icon: 'faceGreat', text: { es: 'Muy contento', en: 'Very happy', fr: 'Très content' } },
  { icon: 'faceHappy', text: { es: 'Contento', en: 'Happy', fr: 'Content' } },
  { icon: 'faceOk', text: { es: 'Normal', en: 'Okay', fr: 'Normal' } },
  { icon: 'faceWorried', text: { es: 'Preocupado', en: 'Worried', fr: 'Inquiet' } },
];

const TXT = {
  look: { es: '¡Mira {product}! Lo has construido tú. ¡Enséñaselo a tus compañeros!', en: 'Look at {product}! You built it. Show it to your classmates!', fr: 'Regarde {product} ! C’est toi qui l’as construit. Montre-le à tes camarades !' },
  yourDrawing: { es: 'Tu dibujo', en: 'Your drawing', fr: 'Ton dessin' },
  hardest: { es: '¿Qué juego fue el más difícil para ti?', en: 'Which game was the hardest for you?', fr: 'Quel jeu a été le plus difficile pour toi ?' },
  felt: { es: '¿Cómo te has sentido haciendo el proyecto?', en: 'How did you feel doing the project?', fr: "Comment t'es-tu senti pendant le projet ?" },
  change: { es: 'Si lo hicieras otra vez, ¿qué harías distinto? Toca una opción para escucharla y elige con el tic o la cruz.', en: 'If you did it again, what would you do differently? Tap an option to hear it, then choose with the tick or the cross.', fr: 'Si tu recommençais, que ferais-tu autrement ? Touche une option pour l’écouter, puis choisis avec la coche ou la croix.' },
  confirm: { es: '{text}. ¿Es esto lo que harías?', en: '{text}. Is this what you would do?', fr: '{text}. C’est ce que tu ferais ?' },
};

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const project = ctx.project;
  const plays = ctx.projectPlays ?? [];
  const items = project?.productItems ?? [];
  const doodle = [...ctx.student.evidence].reverse().find((e) => e.kind === 'dibujo');

  try {
    // 1) Presentar el producto final
    const scene = h('div', { class: 'product-scene', style: { background: ctx.theme.bg } },
      h('div', { class: 'product-base' }, ctx.theme.productBase),
      h('div', { class: 'product-items' }, ...items.map((it, i) => h('span', { class: 'product-item', style: { animationDelay: `${i * 0.12}s` } }, it))),
      doodle ? h('img', { class: 'product-doodle', src: doodle.ref, alt: tr(TXT.yourDrawing) }) : null);
    const next = h('button', { class: 'big-btn icon-only', type: 'button', 'aria-label': t('next') }, ic('next', 52));
    render(ctx, instruction(ctx, 'reflexion', fill(tr(TXT.look), { product: tr(ctx.theme.product) })), scene, h('div', { class: 'row-center' }, next));
    ctx.sfx('win');
    await waitFor<void>(ctx, (d) => { next.onclick = () => d(); }, 60000, () => undefined);

    // 2) ¿Qué fue lo más difícil?
    const played = [...new Set(plays.map((p) => p.gameId).filter((g) => g !== 'reflexion'))];
    let chosenHard: string | null = null;
    if (played.length >= 2 && ctx.gameName) {
      const grid = h('div', { class: 'choice-grid cols-3' }, ...played.map((g) => {
        const info = ctx.gameName!(g);
        return h('button', { class: 'choice-btn game-pick', type: 'button', 'data-game': g, 'aria-label': info.name }, ic(g, 56), h('span', { class: 'small-label' }, info.name));
      }));
      render(ctx, instruction(ctx, '🤔', tr(TXT.hardest)), grid);
      chosenHard = await waitFor<string>(ctx, (d) => {
        grid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => d(b.dataset.game!)));
      });
      ctx.sfx('tap');
    }

    // 3) ¿Cómo te has sentido?
    const fgrid = h('div', { class: 'choice-grid cols-4' }, ...FEELINGS.map((f, i) =>
      h('button', { class: 'choice-btn', type: 'button', 'data-i': String(i), 'aria-label': tr(f.text) }, ic(f.icon, 60), h('span', { class: 'small-label' }, tr(f.text)))));
    render(ctx, instruction(ctx, '💛', tr(TXT.felt)), fgrid);
    const feeling = await waitFor<number>(ctx, (d) => {
      fgrid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => d(Number(b.dataset.i))));
    });
    ctx.sfx('tap');

    // 4) ¿Qué harías distinto?
    // Cada opción se LEE EN VOZ ALTA al tocarla y se confirma con ✓ (o se descarta con ✗).
    const cgrid = h('div', { class: 'choice-grid cols-2' }, ...CHANGES.map((c) =>
      h('button', { class: 'choice-btn change-btn', type: 'button', 'data-c': c.id, 'aria-label': tr(c.text) }, ic(c.icon, 56), h('span', { class: 'small-label' }, tr(c.text)))));
    render(ctx, instruction(ctx, '🔄', tr(TXT.change)), cgrid);
    let change = '';
    while (!change) {
      const picked = await waitFor<string>(ctx, (d) => {
        cgrid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => d(b.dataset.c!)));
        return () => cgrid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = null));
      });
      ctx.sfx('tap');
      const c = CHANGES.find((x) => x.id === picked)!;
      const ok = await confirmChoice(ctx, { picture: ic(c.icon, 96), text: fill(tr(TXT.confirm), { text: tr(c.text) }) });
      if (ok) change = picked;
    }
    ctx.sfx('ok');

    const real = hardestGame(plays);
    const calibrated = chosenHard !== null && real !== null ? chosenHard === real : null;
    if (project) project.reflection = { hardestGame: chosenHard ?? undefined, feeling, change, calibrated: calibrated ?? undefined };
    await wait(ctx, 200);
    return {
      gameId: 'reflexion',
      level: ctx.level,
      abandoned: false,
      success: null,
      personalMetric: 1,
      observations: calibrated === null ? [] : [obs('metacognicion', calibrated ? 0.85 : 0.35, 0.5)],
      metrics: { feeling, calibrated: calibrated === null ? -1 : calibrated ? 1 : 0 },
      durationMs: now() - start,
    };
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('reflexion', ctx.level, start);
  }
}

export const reflexionGame: GameDef = {
  id: 'reflexion',
  name: { es: 'Mi proyecto', en: 'My project', fr: 'Mon projet' },
  icon: '🏆',
  phase: 5,
  kind: 'reflexion',
  dims: ['metacognicion'],
  predict: 'none',
  teacherInfo: {
    es: 'Presenta el producto final y responde preguntas de cierre (en "¿Qué harías distinto?" cada opción se lee en voz alta y se confirma con ✓ o ✗). Compara lo que dice que fue más difícil con lo que de verdad le costó más.',
    en: 'Presents the final product and answers closing questions (in "What would you do differently?" each option is read aloud and confirmed with ✓ or ✗). Compares what they say was hardest with what was really hardest for them.',
    fr: 'Présente le produit final et répond aux questions de clôture (dans « Que ferais-tu autrement ? » chaque option est lue à voix haute et confirmée par ✓ ou ✗). Compare ce qu’il dit avoir trouvé le plus difficile avec ce qui l’a vraiment été.',
  },
  play,
};
