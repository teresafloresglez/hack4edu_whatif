import type { GameContext, GameDef, GameOutcome, ReciprocityStyle } from '../core/types';
import { pick } from '../core/rng';
import { fill, tr } from '../i18n';
import { ic } from '../ui/icons';
import { h, render, instruction, wait, waitFor, obs, now, isAbort, abandonedOutcome, doneButton } from './common';

// Fase 4 · Acordar · DECISIÓN con otro jugador (teoría de juegos).
// · Cuánto ofrece → justo, generoso o egoísta (sentido de la justicia)
// · Si el otro hace trampa, qué hace la ronda siguiente → castiga, perdona o copia
// · Si adivina si el otro aceptará → pensar en lo que piensa el otro

type Round = 'propose' | 'fair' | 'unfair';

const TXT = {
  you: { es: 'Tú', en: 'You', fr: 'Toi' },
  forYou: { es: '{n} para ti', en: '{n} for you', fr: '{n} pour toi' },
  forOther: { es: '{n} para {name}', en: '{n} for {name}', fr: '{n} pour {name}' },
  give: { es: 'Dar uno', en: 'Give one', fr: 'En donner un' },
  take: { es: 'Quitar uno', en: 'Take one back', fr: 'En reprendre un' },
  first: {
    es: 'Tienes {total} {treats}. Decide cuántos le das a {name}. Si a {name} no le parece bien, ¡nadie se lleva nada!',
    en: 'You have {total} {treats}. Decide how many to give {name}. If {name} thinks it is not fair, nobody gets anything!',
    fr: 'Tu as {total} {treats}. Décide combien tu en donnes à {name}. Si {name} trouve que ce n’est pas juste, personne n’a rien !',
  },
  again: { es: 'Te toca repartir otra vez. ¿Cuántos le das a {name}?', en: 'Your turn to share again. How many do you give {name}?', fr: 'À toi de partager encore. Combien en donnes-tu à {name} ?' },
  willAccept: { es: '¿Crees que {name} aceptará?', en: 'Do you think {name} will accept?', fr: 'Penses-tu que {name} va accepter ?' },
  yesWill: { es: 'Sí aceptará', en: 'Yes, they will', fr: 'Oui, il va accepter' },
  noWill: { es: 'No aceptará', en: 'No, they won’t', fr: 'Non, il ne va pas accepter' },
  accepts: { es: '¡{name} acepta!', en: '{name} accepts!', fr: '{name} accepte !' },
  rejects: { es: '{name} no acepta. Esta vez nadie se lleva nada.', en: '{name} does not accept. This time nobody gets anything.', fr: '{name} n’accepte pas. Cette fois, personne n’a rien.' },
  theyShare: {
    es: 'Ahora reparte {name}. Te da {give} y se queda {keep}. ¿Aceptas?',
    en: 'Now {name} shares. They give you {give} and keep {keep}. Do you accept?',
    fr: 'Maintenant, c’est {name} qui partage. Il te donne {give} et en garde {keep}. Tu acceptes ?',
  },
  accept: { es: 'Acepto', en: 'I accept', fr: "J'accepte" },
  reject: { es: 'No acepto', en: "I don't accept", fr: "Je n'accepte pas" },
};
const SEQ: Round[][] = [
  ['propose', 'unfair', 'propose'],
  ['propose', 'fair', 'unfair', 'propose'],
  ['propose', 'fair', 'propose', 'unfair', 'propose'],
  ['propose', 'fair', 'propose', 'unfair', 'propose'],
  ['propose', 'fair', 'propose', 'unfair', 'propose', 'propose'],
];

/** Puntuación de justicia: 50 % = 1, generoso sigue siendo alto, egoísta bajo. */
export function fairnessValue(ratio: number): number {
  if (ratio >= 0.5) return Math.max(0.6, 1 - (ratio - 0.5) * 0.8);
  return Math.max(0, ratio * 2);
}

export function fairnessStyle(ratio: number): 'egoista' | 'justo' | 'generoso' {
  if (ratio < 0.35) return 'egoista';
  if (ratio > 0.65) return 'generoso';
  return 'justo';
}

export function reciprocityOf(before: number, after: number, unfairRatio: number): ReciprocityStyle {
  if (Math.abs(after - unfairRatio) <= 0.1 && after < before - 0.1) return 'copia';
  if (after < before - 0.15) return 'castiga';
  return 'perdona';
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const total = ctx.ageBand === 'young' ? 6 : 10;
  const seq = SEQ[Math.max(0, Math.min(4, ctx.level - 1))];
  // Las personas se nombran solo por su nombre (sin emojis de caras).
  const partner = { name: pick(ctx.culture.names, ctx.rng) };
  const T = ctx.culture.treats;
  const unpredictable = ctx.level >= 4;

  const offers: number[] = []; // ratios ofrecidos
  let predictions = 0, predictionsOk = 0, unfairAccepted = 0, unfairRejected = 0;
  let afterUnfair: number | null = null;
  let beforeUnfairAvg = 0.5;
  let pendingReciprocity = false;
  const unfairRatio = 1 / total;
  const reciprocity: ReciprocityStyle[] = [];
  const styles: string[] = [];

  const plates = (mine: number, theirs: number) =>
    h('div', { class: 'plates' },
      h('div', { class: 'plate' }, h('div', { class: 'plate-owner' }, h('span', {}, tr(TXT.you))),
        h('div', { class: 'plate-items', 'aria-label': fill(tr(TXT.forYou), { n: mine }) }, T.emoji.repeat(mine) || '·')),
      h('div', { class: 'plate' }, h('div', { class: 'plate-owner' }, h('span', {}, partner.name)),
        h('div', { class: 'plate-items', 'aria-label': fill(tr(TXT.forOther), { n: theirs, name: partner.name }) }, T.emoji.repeat(theirs) || '·')));

  try {
    for (let r = 0; r < seq.length; r++) {
      const kind = seq[r];
      if (kind === 'propose') {
        let give = 0;
        const area = h('div', {});
        const draw = () => area.replaceChildren(plates(total - give, give));
        draw();
        const giveBtn = h('button', { class: 'big-btn icon-only', type: 'button', 'data-act': 'give', 'aria-label': tr(TXT.give) }, ic('giveOne', 56));
        const takeBtn = h('button', { class: 'big-btn icon-only', type: 'button', 'data-act': 'take', 'aria-label': tr(TXT.take) }, ic('takeOne', 56));
        const done = doneButton();
        render(ctx,
          instruction(ctx, T.emoji, r === 0
            ? fill(tr(TXT.first), { total, treats: tr(T.name), name: partner.name })
            : fill(tr(TXT.again), { name: partner.name })),
          area, h('div', { class: 'row-center' }, takeBtn, giveBtn), h('div', { class: 'row-center' }, done));
        await waitFor<void>(ctx, (finish) => {
          giveBtn.onclick = () => { if (give < total) { give++; ctx.sfx('tap'); draw(); } };
          takeBtn.onclick = () => { if (give > 0) { give--; ctx.sfx('tap'); draw(); } };
          done.onclick = () => finish();
        });
        const ratio = give / total;
        offers.push(ratio);
        styles.push(fairnessStyle(ratio));
        if (pendingReciprocity) {
          afterUnfair = ratio;
          reciprocity.push(reciprocityOf(beforeUnfairAvg, ratio, unfairRatio));
          pendingReciprocity = false;
        }

        // ¿Aceptará? (anticipar lo que piensa el otro)
        const yes = h('button', { class: 'choice-btn', type: 'button', 'data-pred': 'yes', 'aria-label': tr(TXT.yesWill) }, ic('thumbUp', 64));
        const no = h('button', { class: 'choice-btn', type: 'button', 'data-pred': 'no', 'aria-label': tr(TXT.noWill) }, ic('thumbDown', 64));
        render(ctx, instruction(ctx, T.emoji, fill(tr(TXT.willAccept), { name: partner.name })), plates(total - give, give), h('div', { class: 'choice-grid cols-2' }, yes, no));
        const pred = await waitFor<boolean>(ctx, (finish) => {
          yes.onclick = () => finish(true);
          no.onclick = () => finish(false);
        });
        const threshold = unpredictable ? 0.2 + ctx.rng() * 0.3 : 0.3;
        const accepts = ratio >= threshold - 1e-9;
        predictions++;
        if (pred === accepts) predictionsOk++;
        ctx.sfx(accepts ? 'ok' : 'bad');
        render(ctx,
          instruction(ctx, accepts ? 'faceHappy' : 'faceAngry', fill(tr(accepts ? TXT.accepts : TXT.rejects), { name: partner.name })),
          accepts ? plates(total - give, give) : plates(0, 0));
        await wait(ctx, 1600);
      } else {
        const give = kind === 'fair' ? Math.round(total / 2) : 1;
        if (kind === 'unfair') beforeUnfairAvg = offers.length ? offers.reduce((a, b) => a + b, 0) / offers.length : 0.5;
        const yes = h('button', { class: 'choice-btn', type: 'button', 'aria-label': tr(TXT.accept) }, ic('thumbUp', 64));
        const no = h('button', { class: 'choice-btn', type: 'button', 'aria-label': tr(TXT.reject) }, ic('thumbDown', 64));
        render(ctx,
          instruction(ctx, T.emoji, fill(tr(TXT.theyShare), { name: partner.name, give, keep: total - give })),
          plates(give, total - give), h('div', { class: 'choice-grid cols-2' }, yes, no));
        const acc = await waitFor<boolean>(ctx, (finish) => {
          yes.onclick = () => finish(true);
          no.onclick = () => finish(false);
        });
        ctx.sfx('tap');
        if (kind === 'unfair') {
          if (acc) unfairAccepted++;
          else unfairRejected++;
          pendingReciprocity = true;
        }
        await wait(ctx, 500);
      }
    }
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('reparto', ctx.level, start, [], { offers: offers.length });
  }

  const meanOffer = offers.length ? offers.reduce((a, b) => a + b, 0) / offers.length : 0;
  const justice = offers.length ? offers.map(fairnessValue).reduce((a, b) => a + b, 0) / offers.length : 0.5;
  ctx.sfx('win');
  return {
    gameId: 'reparto',
    level: ctx.level,
    abandoned: false,
    success: null,
    personalMetric: predictionsOk,
    observations: [
      obs('justicia', justice, 0.8),
      obs('perspectiva', predictions ? predictionsOk / predictions : 0.5, 0.7),
    ],
    metrics: {
      meanOffer, predictions, predictionsOk, unfairAccepted, unfairRejected,
      afterUnfair: afterUnfair ?? -1,
      egoista: styles.filter((s) => s === 'egoista').length,
      justo: styles.filter((s) => s === 'justo').length,
      generoso: styles.filter((s) => s === 'generoso').length,
    },
    tags: { reciprocity },
    durationMs: now() - start,
  };
}

export const repartoGame: GameDef = {
  id: 'reparto',
  name: { es: 'El reparto', en: 'Sharing out', fr: 'Le partage' },
  icon: '🍬',
  phase: 4,
  kind: 'decision',
  dims: ['justicia', 'perspectiva'],
  predict: 'none',
  teacherInfo: {
    es: 'Repartir con un personaje (juego del ultimátum). Mide si reparte de forma justa, generosa o egoísta, cómo reacciona cuando el otro hace trampa y si anticipa si aceptará.',
    en: 'Sharing with a character (ultimatum game). Measures whether they share fairly, generously or selfishly, how they react when the other cheats and whether they anticipate acceptance.',
    fr: 'Partager avec un personnage (jeu de l’ultimatum). Mesure s’il partage de façon juste, généreuse ou égoïste, sa réaction quand l’autre triche et s’il anticipe l’acceptation.',
  },
  play,
};
