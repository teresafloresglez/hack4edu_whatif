import type { ConflictStyle, GameContext, GameDef, GameOutcome } from '../core/types';
import { shuffle, sample } from '../core/rng';
import { fill, tr, type L } from '../i18n';
import { ic, type IconName } from '../ui/icons';
import { avatarArt } from '../ui/avatars';
import { h, render, instruction, wait, waitFor, obs, now, isAbort, abandonedOutcome } from './common';

// Fase 4 · Acordar · Respuesta de DECISIÓN (integración de conflictos).
// No hay estilo correcto: se observa el repertorio y si explora antes de decidir.
//   Quedármelo → competir · Dárselo → ceder · Partirlo → compromiso
//   Irme → evitar · Preguntar y encontrar algo para los dos → integrar

interface Want { icon: string; text: L }
interface Scenario { emoji: string; the: L; pron: L; one: L; you: Want; other: Want; third: Want; integrate: L }

const W = (icon: string, es: string, en: string, fr: string): Want => ({ icon, text: { es, en, fr } });
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

const TXT = {
  intro: {
    es: 'Tú y {others} queréis {the}. Solo hay {one}. Tú quieres {want}. ¿Qué haces?',
    en: 'You and {others} want {the}. There is only {one}. You want to {want}. What do you do?',
    fr: "Toi et {others}, vous voulez {the}. Il n'y en a qu'{one}. Tu veux {want}. Que fais-tu ?",
  },
  and: { es: ' y ', en: ' and ', fr: ' et ' },
  you: { es: 'Tú', en: 'You', fr: 'Toi' },
  ask: { es: '¿Para qué?', en: 'What for?', fr: 'Pour quoi faire ?' },
  askAria: { es: 'Preguntar a {name}', en: 'Ask {name}', fr: 'Demander à {name}' },
  vague: {
    es: '{name} dice: {Pron} quiero para una cosa muy importante. ¡Pregúntale otra vez!',
    en: '{name} says: I want it for something very important. Ask again!',
    fr: '{name} dit : je {pron} veux pour une chose très importante. Redemande-lui !',
  },
  reveal: { es: '{name} dice: {Pron} quiero para {want}.', en: '{name} says: I want it to {want}.', fr: '{name} dit : je {pron} veux pour {want}.' },
  keep: { es: 'Me {pron} quedo yo', en: 'I keep it', fr: 'Je {pron} garde' },
  give: { es: 'Se {pron} doy a {others}', en: 'I give it to {others}', fr: 'Je {pron} donne à {others}' },
  split: { es: '{Pron} partimos', en: 'We split it', fr: 'On {pron} partage' },
  leave: { es: 'Me voy', en: 'I walk away', fr: "Je m'en vais" },
  each: { es: 'Cada uno se queda con la parte que necesita', en: 'Everyone gets the part they need', fr: 'Chacun garde la partie dont il a besoin' },
  nowKnow: { es: '¡Ahora sabes lo que quiere cada uno! {text}.', en: 'Now you know what everyone wants! {text}.', fr: 'Maintenant tu sais ce que chacun veut ! {text}.' },
  feel: { es: '¿Cómo crees que se siente {name} ahora?', en: 'How do you think {name} feels now?', fr: 'Comment penses-tu que {name} se sent maintenant ?' },
  happy: { es: 'Contento', en: 'Happy', fr: 'Content' },
  normal: { es: 'Normal', en: 'Okay', fr: 'Normal' },
  sad: { es: 'Triste', en: 'Sad', fr: 'Triste' },
};

function scenarios(ctx: GameContext): Scenario[] {
  const f = ctx.culture.fruit;
  const one = f.id === 'naranja' ? { es: 'una', en: 'one', fr: 'une' } : { es: 'uno', en: 'one', fr: 'une' };
  const base = { emoji: f.emoji, the: f.the, pron: f.pron, one };
  const fruit: Scenario =
    f.id === 'mango'
      ? { ...base, you: W('😋', 'comer la pulpa', 'eat the flesh', 'manger la chair'), other: W('🌱', 'plantar el hueso', 'plant the stone', 'planter le noyau'), third: W('🥤', 'hacer un batido con un trocito', 'make a smoothie with a little piece', 'faire un smoothie avec un petit morceau'), integrate: { es: 'Tú te comes la pulpa y le das el hueso para plantar', en: 'You eat the flesh and give them the stone to plant', fr: 'Tu manges la chair et tu lui donnes le noyau à planter' } }
      : f.id === 'platano'
        ? { ...base, you: W('😋', 'comerlo', 'eat it', 'la manger'), other: W('🪴', 'usar la piel como abono para el huerto', 'use the peel as compost for the garden', 'utiliser la peau comme engrais pour le potager'), third: W('🐒', 'dar un poquito al mono', 'give a little bit to the monkey', 'en donner un petit bout au singe'), integrate: { es: 'Tú te comes el plátano y le das la piel para su huerto', en: 'You eat the banana and give them the peel for their garden', fr: 'Tu manges la banane et tu lui donnes la peau pour son potager' } }
        : { ...base, you: W('🥤', 'hacer zumo', 'make juice', 'faire du jus'), other: W('🍰', 'usar la cáscara para un bizcocho', 'use the peel for a cake', 'utiliser l’écorce pour un gâteau'), third: W('🌱', 'plantar las semillas', 'plant the seeds', 'planter les pépins'), integrate: { es: 'Tú haces zumo y le das la cáscara para el bizcocho', en: 'You make juice and give them the peel for the cake', fr: 'Tu fais du jus et tu lui donnes l’écorce pour le gâteau' } };
  return [
    fruit,
    { emoji: '🍉', the: { es: 'la sandía', en: 'the watermelon', fr: 'la pastèque' }, pron: { es: 'la', en: 'it', fr: 'la' }, one: { es: 'una', en: 'one', fr: 'une' },
      you: W('😋', 'comerla', 'eat it', 'la manger'), other: W('🌱', 'plantar las pepitas', 'plant the seeds', 'planter les pépins'), third: W('🥁', 'usar la corteza de tambor', 'use the rind as a drum', 'utiliser l’écorce comme tambour'),
      integrate: { es: 'Tú te comes la sandía y le das las pepitas para plantar', en: 'You eat the watermelon and give them the seeds to plant', fr: 'Tu manges la pastèque et tu lui donnes les pépins à planter' } },
    { emoji: '🥥', the: { es: 'el coco', en: 'the coconut', fr: 'la noix de coco' }, pron: { es: 'lo', en: 'it', fr: 'la' }, one: { es: 'uno', en: 'one', fr: 'une' },
      you: W('🥤', 'beber su agua', 'drink its water', 'boire son eau'), other: W('🥁', 'hacer un tambor con la cáscara', 'make a drum from the shell', 'faire un tambour avec la coque'), third: W('🍬', 'rallar un poco para un dulce', 'grate a little for a sweet', 'en râper un peu pour une douceur'),
      integrate: { es: 'Tú te bebes el agua y le das la cáscara para el tambor', en: 'You drink the water and give them the shell for the drum', fr: 'Tu bois l’eau et tu lui donnes la coque pour le tambour' } },
    { emoji: '🌽', the: { es: 'la mazorca', en: 'the corn cob', fr: "l'épi de maïs" }, pron: { es: 'la', en: 'it', fr: 'le' }, one: { es: 'una', en: 'one', fr: 'un' },
      you: W('😋', 'comer los granos', 'eat the kernels', 'manger les grains'), other: W('🪆', 'hacer una muñeca con las hojas', 'make a doll from the leaves', 'faire une poupée avec les feuilles'), third: W('🐔', 'dar unos granos a las gallinas', 'give some kernels to the hens', 'donner quelques grains aux poules'),
      integrate: { es: 'Tú te comes los granos y le das las hojas para la muñeca', en: 'You eat the kernels and give them the leaves for the doll', fr: 'Tu manges les grains et tu lui donnes les feuilles pour la poupée' } },
  ];
}

type Feeling = 'feliz' | 'normal' | 'triste';
const FEEL_ICON: Record<Feeling, IconName> = { feliz: 'faceHappy', normal: 'faceOk', triste: 'faceSad' };
const FEEL_LABEL: Record<Feeling, L> = { feliz: TXT.happy, normal: TXT.normal, triste: TXT.sad };

/** Cómo se sentiría el otro según el estilo elegido (para "ponerse en su lugar"). */
export function expectedFeeling(style: ConflictStyle): Feeling[] {
  switch (style) {
    case 'competir': return ['triste'];
    case 'ceder': return ['feliz'];
    case 'integrar': return ['feliz'];
    case 'compromiso': return ['normal', 'feliz'];
    case 'evitar': return ['normal', 'triste'];
  }
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const all = scenarios(ctx);
  // El primero siempre es la fruta de su región; el segundo, otro objeto al azar.
  const scen = [all[0], ...sample(all.slice(1), 1, ctx.rng)];
  const styles: ConflictStyle[] = [];
  let questions = 0, usefulQuestions = 0, questionsNeeded = 0, feelOk = 0, feelAsked = 0, integrations = 0;
  const decisionTimes: number[] = [];

  try {
    for (let si = 0; si < scen.length; si++) {
      const s = scen[si];
      const three = ctx.level >= 4;
      const overlap = ctx.level >= 5 && si === 1; // a veces los intereses chocan de verdad
      const qPerChar = ctx.level >= 3 ? 2 : 1;
      const names = shuffle(ctx.culture.names, ctx.rng).slice(0, three ? 2 : 1);
      const avatars = shuffle(ctx.culture.people, ctx.rng);
      const others = names.map((n, i) => ({
        name: n,
        avatar: avatars[i],
        want: overlap && i === 0 ? s.you : i === 0 ? s.other : s.third,
        asked: 0,
      }));
      questionsNeeded += others.length * qPerChar;
      const everyone = others.map((o) => o.name).join(tr(TXT.and));
      const pron = tr(s.pron);
      const P = { pron, Pron: cap(pron), others: everyone };
      const intro = fill(tr(TXT.intro), { others: everyone, the: tr(s.the), one: tr(s.one), want: tr(s.you.text) });

      const bubbles = new Map<string, HTMLElement>();
      const peopleRow = h('div', { class: 'people-row' },
        h('div', { class: 'person you' }, h('span', { class: 'person-avatar' }, avatarArt(ctx.student.avatar, 52)), h('span', { class: 'person-name' }, tr(TXT.you)),
          h('span', { class: 'bubble' }, s.you.icon)),
        h('div', { class: 'object-center' }, s.emoji),
        ...others.map((o) => {
          const bubble = h('span', { class: 'bubble' }, '❔');
          bubbles.set(o.name, bubble);
          const ask = h('button', { class: 'ask-btn', type: 'button', 'data-ask': o.name, 'aria-label': fill(tr(TXT.askAria), { name: o.name }) }, ic('ask', 30), h('span', { class: 'ask-label' }, tr(TXT.ask)));
          return h('div', { class: 'person' }, h('span', { class: 'person-avatar' }, o.avatar), h('span', { class: 'person-name' }, o.name), bubble, ask);
        }));

      const optionDefs: { style: ConflictStyle; icon: IconName; label: string }[] = [
        { style: 'competir', icon: 'keep', label: fill(tr(TXT.keep), P) },
        { style: 'ceder', icon: 'give', label: fill(tr(TXT.give), P) },
        { style: 'compromiso', icon: 'split', label: fill(tr(TXT.split), P) },
        { style: 'evitar', icon: 'leave', label: fill(tr(TXT.leave), P) },
      ];
      const optionsBox = h('div', { class: 'decision-grid' });
      const drawOptions = () => {
        optionsBox.replaceChildren(...optionDefs.map((o) =>
          h('button', { class: 'decision-btn' + (o.style === 'integrar' ? ' integrate' : ''), type: 'button', 'data-style': o.style, 'aria-label': o.label },
            h('span', { class: 'decision-icon' }, ic(o.icon, 56)), h('span', { class: 'decision-label' }, o.label))));
      };
      drawOptions();
      render(ctx, instruction(ctx, s.emoji, intro), peopleRow, optionsBox);

      const t0 = now();
      let style: ConflictStyle | null = null;
      while (!style) {
        const action = await waitFor<string>(ctx, (done) => {
          peopleRow.querySelectorAll<HTMLButtonElement>('.ask-btn').forEach((b) => (b.onclick = () => done('ask:' + b.dataset.ask)));
          optionsBox.querySelectorAll<HTMLButtonElement>('.decision-btn').forEach((b) => (b.onclick = () => done('opt:' + b.dataset.style)));
        });
        if (action.startsWith('ask:')) {
          const o = others.find((x) => x.name === action.slice(4))!;
          o.asked++;
          questions++;
          // Explorar = conocer a TODOS; repetir la misma pregunta no cuenta más.
          if (o.asked <= qPerChar) usefulQuestions++;
          ctx.sfx('tap');
          const bubble = bubbles.get(o.name)!;
          if (o.asked < qPerChar) {
            bubble.textContent = '🤔';
            await ctx.say(fill(tr(TXT.vague), { ...P, name: o.name }));
          } else {
            bubble.textContent = o.want.icon;
            bubble.classList.add('revealed');
            await ctx.say(fill(tr(TXT.reveal), { ...P, name: o.name, want: tr(o.want.text) }));
          }
          const allKnown = others.every((x) => x.asked >= qPerChar);
          const compatible = others.every((x) => x.want !== s.you);
          if (allKnown && compatible && !optionDefs.some((x) => x.style === 'integrar')) {
            const text = tr(three ? TXT.each : s.integrate);
            optionDefs.push({ style: 'integrar', icon: 'integrate', label: text });
            drawOptions();
            void ctx.say(fill(tr(TXT.nowKnow), { text }));
          }
          continue;
        }
        style = action.slice(4) as ConflictStyle;
      }
      decisionTimes.push(now() - t0);
      styles.push(style);
      if (style === 'integrar') integrations++;
      ctx.sfx('ok');

      // ¿Cómo se siente el otro? (ponerse en su lugar)
      const other = others[0];
      const feelGrid = h('div', { class: 'choice-grid cols-3' },
        ...(['feliz', 'normal', 'triste'] as Feeling[]).map((f) => h('button', { class: 'choice-btn', type: 'button', 'data-feel': f, 'aria-label': tr(FEEL_LABEL[f]) },
          ic(FEEL_ICON[f], 64), h('span', { class: 'small-label' }, tr(FEEL_LABEL[f])))));
      render(ctx, instruction(ctx, other.avatar, fill(tr(TXT.feel), { name: other.name })), h('div', { class: 'object-center big' }, other.avatar), feelGrid);
      const feel = await waitFor<Feeling>(ctx, (done) => {
        feelGrid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => done(b.dataset.feel as Feeling)));
      });
      feelAsked++;
      // En el caso de intereses que chocan, "ceder" no hace feliz a todos igual; aceptamos más.
      if (expectedFeeling(style).includes(feel) || (overlap && feel !== 'feliz')) feelOk++;
      ctx.sfx('tap');
      await wait(ctx, 300);
    }
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('naranja', ctx.level, start, [], { questions });
  }

  const exploration = questionsNeeded ? Math.min(1, usefulQuestions / questionsNeeded) : 0;
  const meanDecision = decisionTimes.reduce((a, b) => a + b, 0) / Math.max(1, decisionTimes.length);
  render(ctx, h('div', { class: 'object-center big' }, ic('acordar', 120)));
  ctx.sfx('win');
  await wait(ctx, 500).catch(() => undefined);
  return {
    gameId: 'naranja',
    level: ctx.level,
    abandoned: false,
    success: null,
    personalMetric: questions + integrations,
    observations: [
      obs('conflicto', 0.25 + 0.6 * exploration + (integrations > 0 ? 0.15 : 0), 0.6),
      obs('perspectiva', feelAsked ? feelOk / feelAsked : 0.5, 0.6),
    ],
    metrics: { questions, questionsNeeded, exploration, integrations, decisionMs: Math.round(meanDecision), feelOk, feelAsked },
    tags: { conflictStyles: styles },
    durationMs: now() - start,
  };
}

export const naranjaGame: GameDef = {
  id: 'naranja',
  name: { es: 'La naranja', en: 'The orange', fr: "L'orange" },
  icon: '🍊',
  phase: 4,
  kind: 'decision',
  dims: ['conflicto', 'perspectiva'],
  predict: 'none',
  teacherInfo: {
    es: 'Dos (o tres) personajes quieren lo mismo. Observa el estilo (competir, ceder, compromiso, evitar, integrar), cuántas preguntas hace antes de decidir y si anticipa cómo se siente el otro.',
    en: 'Two (or three) characters want the same thing. Observes the style (compete, give in, compromise, avoid, integrate), how many questions they ask before deciding and whether they anticipate how the other feels.',
    fr: 'Deux (ou trois) personnages veulent la même chose. Observe le style (rivaliser, céder, compromis, éviter, intégrer), le nombre de questions avant de décider et s’il anticipe ce que ressent l’autre.',
  },
  play,
};
