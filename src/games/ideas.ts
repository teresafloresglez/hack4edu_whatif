import type { Evidence, GameContext, GameDef, GameOutcome } from '../core/types';
import { shuffle, pick } from '../core/rng';
import { loadIdeaFreq } from '../core/storage';
import { WHAT_IF_PROMPTS, USES_BANK, ideaPrior, type IdeaCard } from '../data/ideas';
import { h, render, instruction, waitFor, obs, now, isAbort, abandonedOutcome, doneButton, wait, confirmChoice } from './common';
import { canRecord, startRecording } from './recorder';
import { fill, tr } from '../i18n';
import { ic } from '../ui/icons';

const TXT = {
  usesQ: { es: '¿Para qué podrías usar {obj}? ¡Piensa en muchas cosas distintas!', en: 'What could you use {obj} for? Think of lots of different things!', fr: 'À quoi pourrais-tu utiliser {obj} ? Pense à plein de choses différentes !' },
  young: { es: ' Toca todas las ideas que se te ocurran.', en: ' Tap all the ideas you can think of.', fr: ' Touche toutes les idées qui te viennent.' },
  old: { es: ' Elige todas las ideas que quieras, o graba la tuya.', en: ' Choose as many ideas as you like, or record your own.', fr: ' Choisis toutes les idées que tu veux, ou enregistre la tienne.' },
  usesYoung: { es: ' Toca una idea para escucharla y elige con el tic o la cruz.', en: ' Tap an idea to hear it, then choose with the tick or the cross.', fr: ' Touche une idée pour l’écouter, puis choisis avec la coche ou la croix.' },
  usesOld: { es: ' Toca una idea para escucharla y confirma con el tic (✓) o descártala con la cruz (✗). Ojo: ¡algunas no tienen sentido!', en: ' Tap an idea to hear it, then keep it with the tick (✓) or drop it with the cross (✗). Careful: some make no sense!', fr: ' Touche une idée pour l’écouter, puis garde-la avec la coche (✓) ou écarte-la avec la croix (✗). Attention : certaines n’ont aucun sens !' },
  keep: { es: 'Sí, me vale', en: 'Yes, it works', fr: 'Oui, ça marche' },
  drop: { es: 'No', en: 'No', fr: 'Non' },
  record: { es: 'Grabar mi idea', en: 'Record my idea', fr: 'Enregistrer mon idée' },
  myIdea: { es: 'Mi idea', en: 'My idea', fr: 'Mon idée' },
  ownLabel: { es: 'Idea propia · {q}', en: 'Own idea · {q}', fr: 'Idée personnelle · {q}' },
};

// Fase 3 · Idear · Respuesta ABIERTA (Torrance). No hay respuestas malas:
// · Nº de ideas → fluidez · Nº de categorías → flexibilidad
// · Lo poco que otros niños de su REGIÓN eligen esas ideas → originalidad

const PRIOR_STRENGTH = 10; // cuántos "niños virtuales" vale la frecuencia previa

/** Frecuencia estimada de una idea en la región (previa + niños reales del dispositivo). */
export function ideaFrequency(card: IdeaCard, regionId: string, promptId: string): number {
  const store = loadIdeaFreq()[`${regionId}:${promptId}`];
  const prior = ideaPrior(card, regionId);
  const players = store?.players ?? 0;
  const count = store?.counts[card.id] ?? 0;
  return (prior * PRIOR_STRENGTH + count) / (PRIOR_STRENGTH + players);
}

export interface IdeaScores {
  fluency: number; flexibility: number; originality: number; ideas: number; categories: number; selectAll: boolean;
  /** tarjetas sin sentido elegidas (no cuentan como ideas válidas) */
  nonsense: number;
}

export function scoreIdeas(
  selected: IdeaCard[], ownIdeas: number, deckSize: number, regionId: string, promptId: string, expected: number,
): IdeaScores {
  // Las respuestas sin sentido no son ideas válidas (Torrance: solo cuentan las pertinentes).
  const valid = selected.filter((c) => !c.nonsense);
  const nonsense = selected.length - valid.length;
  const ideas = valid.length + ownIdeas;
  const cats = new Set(valid.map((c) => c.cat)).size + Math.min(ownIdeas, 2);
  const deckCats = 9;
  const fluency = Math.min(1, ideas / expected);
  const flexibility = ideas === 0 ? 0 : Math.min(1, cats / Math.min(ideas, deckCats, 5));
  const origValues = [
    ...valid.map((c) => 1 - ideaFrequency(c, regionId, promptId)),
    ...Array.from({ length: ownIdeas }, () => 0.75), // idea propia grabada: probablemente original
  ];
  const originality = origValues.length ? origValues.reduce((a, b) => a + b, 0) / origValues.length : 0;
  const selectAll = deckSize >= 6 && selected.length >= Math.ceil(deckSize * 0.85);
  return { fluency, flexibility, originality, ideas, categories: cats, selectAll, nonsense };
}

interface IdeaRound { promptId: string; icon: string; question: string; cards: IdeaCard[] }

function roundFor(gameId: 'quepasaria' | 'milusos', ctx: GameContext): IdeaRound {
  if (gameId === 'quepasaria') {
    const abs = ctx.level <= 2 ? 1 : ctx.level === 3 ? 2 : 3;
    const pool = WHAT_IF_PROMPTS.filter((p) => p.absurdity === abs);
    const p = pick(pool.length ? pool : WHAT_IF_PROMPTS, ctx.rng);
    return { promptId: p.id, icon: p.emoji, question: tr(p.question), cards: p.cards };
  }
  const objs = ctx.culture.objects.filter((o) => USES_BANK[o.id]);
  const o = objs.length ? pick(objs, ctx.rng) : { id: 'cubo', emoji: '🪣', name: { es: 'un cubo', en: 'a bucket', fr: 'un seau' } };
  return {
    // Mismo id que en versiones anteriores para conservar las frecuencias guardadas.
    promptId: 'usos_' + o.name.es.replace(/\s+/g, '_'),
    icon: o.emoji,
    question: fill(tr(TXT.usesQ), { obj: tr(o.name) }),
    cards: USES_BANK[o.id] ?? USES_BANK['cubo'],
  };
}

/** Baraja: menos tarjetas de apoyo al subir de nivel; en Mil usos siempre 2 sin sentido. */
export function buildDeck(gameId: 'quepasaria' | 'milusos', cards: IdeaCard[], level: number, rng: () => number): IdeaCard[] {
  const deckSize = [10, 9, 8, 7, 6][Math.max(0, Math.min(4, level - 1))];
  const valid = shuffle(cards.filter((c) => !c.nonsense), rng);
  const nonsense = gameId === 'milusos' ? shuffle(cards.filter((c) => c.nonsense), rng).slice(0, 2) : [];
  return shuffle([...valid.slice(0, Math.max(1, deckSize - nonsense.length)), ...nonsense], rng);
}

function makePlay(gameId: 'quepasaria' | 'milusos') {
  return async function play(ctx: GameContext): Promise<GameOutcome> {
    const start = now();
    const round = roundFor(gameId, ctx);
    const deck = buildDeck(gameId, round.cards, ctx.level, ctx.rng);
    const selected = new Set<IdeaCard>();
    const evidence: Evidence[] = [];
    let ownIdeas = 0;
    let confirming = false;

    const mark = (b: HTMLButtonElement, card: IdeaCard, on: boolean) => {
      if (on) selected.add(card);
      else selected.delete(card);
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', String(on));
      counter.textContent = '💡'.repeat(Math.min(selected.size + ownIdeas, 12)) || '·';
    };

    const grid = h('div', { class: 'idea-grid' });
    for (const card of deck) {
      const text = tr(card.text);
      const b = h('button', { class: 'idea-card', type: 'button', 'aria-pressed': 'false', 'aria-label': text },
        h('span', { class: 'idea-emoji', 'aria-hidden': 'true' }, card.emoji),
        h('span', { class: 'idea-text' }, text));
      b.onclick = async () => {
        if (gameId === 'milusos') {
          // Mil usos: la opción se lee en voz alta y se confirma con ✓ o se descarta con ✗.
          if (confirming) return;
          confirming = true;
          ctx.sfx('tap');
          try {
            const ok = await confirmChoice(ctx, { picture: card.emoji, text, yes: tr(TXT.keep), no: tr(TXT.drop) });
            mark(b, card, ok);
          } catch {
            /* salió del juego mientras confirmaba */
          } finally {
            confirming = false;
          }
          return;
        }
        const on = !selected.has(card);
        mark(b, card, on);
        if (on) void ctx.say(text);
        ctx.sfx('tap');
      };
      grid.append(b);
    }
    const counter = h('div', { class: 'idea-counter', 'aria-live': 'polite' }, '·');
    let micBtn: HTMLButtonElement | null = null;
    let rec: ReturnType<typeof startRecording> | null = null;
    let recording: Promise<void> | null = null;
    if (canRecord() && !ctx.fast) {
      micBtn = h('button', { class: 'mic-btn', type: 'button', 'aria-label': tr(TXT.record) }, ic('mic', 36), h('span', { class: 'btn-label' }, tr(TXT.myIdea)));
      micBtn.onclick = () => {
        if (rec) {
          rec.stop();
          return;
        }
        micBtn!.classList.add('recording');
        rec = startRecording(8000);
        recording = handleRecording(rec);
      };
    }
    const handleRecording = async (current: ReturnType<typeof startRecording>) => {
      const r = await current.result;
      rec = null;
      recording = null;
      micBtn?.classList.remove('recording');
      if (r && !ctx.exitSignal.aborted) {
        ownIdeas++;
        evidence.push({ kind: 'audio', ref: r.key, label: fill(tr(TXT.ownLabel), { q: round.question }), date: Date.now() });
        counter.textContent = '💡'.repeat(Math.min(selected.size + ownIdeas, 12));
        ctx.sfx('ok');
      }
    };
    /** Si estaba grabando al pulsar ✅ o 🏠, se apaga el micrófono ya (y se guarda la idea si termina). */
    const stopMic = async (keep: boolean) => {
      const pending = recording;
      rec?.stop();
      if (keep && pending) await pending;
    };
    const done = doneButton();
    render(ctx,
      instruction(ctx, round.icon, round.question + tr(gameId === 'milusos'
        ? (ctx.ageBand === 'young' ? TXT.usesYoung : TXT.usesOld)
        : (ctx.ageBand === 'young' ? TXT.young : TXT.old))),
      grid, counter, h('div', { class: 'row-center' }, micBtn, done));

    try {
      await waitFor<void>(ctx, (finish) => {
        done.onclick = () => { if (!confirming) finish(); };
      }, 150000, () => undefined);
    } catch (e) {
      if (!isAbort(e)) throw e;
      void stopMic(false);
      return abandonedOutcome(gameId, ctx.level, start, [], { ideas: selected.size + ownIdeas });
    }
    await stopMic(true);

    const expected = (ctx.ageBand === 'young' ? 3 : 4) + Math.floor((ctx.level - 1) / 2);
    const sel = [...selected];
    const s = scoreIdeas(sel, ownIdeas, deck.length, ctx.student.regionId, round.promptId, expected);
    // Si eligió casi todo sin discriminar, la observación es poco fiable.
    const w = s.selectAll ? 0.35 : 1;
    const nonsenseShown = deck.filter((c) => c.nonsense).length;
    if (s.ideas > 0) {
      ctx.sfx('win');
      await wait(ctx, 400).catch(() => undefined);
    }
    return {
      gameId,
      level: ctx.level,
      abandoned: false,
      success: null, // abierta: el "logro" es mejorar su propia marca
      personalMetric: s.ideas,
      observations: [
        ...(s.ideas === 0
          ? [obs('fluidez', 0, 0.6)]
          : [obs('fluidez', s.fluency, w), obs('flexibilidad', s.flexibility, w), obs('originalidad', s.originality, w * 0.9)]),
        // Distinguir usos posibles de imposibles también es razonar
        // (solo si eligió algo: pulsar ¡Listo! sin elegir nada no demuestra lógica).
        ...(nonsenseShown > 0 && sel.length > 0 ? [obs('logica', 1 - s.nonsense / nonsenseShown, 0.3)] : []),
      ],
      metrics: {
        ideas: s.ideas, ownIdeas, categories: s.categories, deck: deck.length,
        fluency: s.fluency, flexibility: s.flexibility, originality: s.originality, selectAll: s.selectAll ? 1 : 0,
        nonsense: s.nonsense, nonsenseShown,
      },
      tags: { ideaIds: sel.map((c) => c.id), promptId: round.promptId },
      evidence,
      durationMs: now() - start,
    };
  };
}

export const quePasariaGame: GameDef = {
  id: 'quepasaria',
  name: { es: '¿Qué pasaría si…?', en: 'What would happen if…?', fr: 'Que se passerait-il si… ?' },
  icon: '💭',
  phase: 3,
  kind: 'abierta',
  dims: ['fluidez', 'flexibilidad', 'originalidad'],
  predict: 'ideas',
  teacherInfo: {
    es: 'Situaciones de cotidianas a muy absurdas. Elige tarjetas o graba ideas propias. Mide cantidad (fluidez), variedad (flexibilidad) y rareza en su región (originalidad).',
    en: 'Situations from everyday to very absurd. Choose cards or record your own ideas. Measures quantity (fluency), variety (flexibility) and rarity in their region (originality).',
    fr: 'Situations du quotidien aux plus absurdes. Choisir des cartes ou enregistrer ses idées. Mesure la quantité (fluidité), la variété (flexibilité) et la rareté dans sa région (originalité).',
  },
  play: makePlay('quepasaria'),
};

export const milUsosGame: GameDef = {
  id: 'milusos',
  name: { es: 'Mil usos', en: 'A thousand uses', fr: 'Mille usages' },
  icon: '🪣',
  phase: 3,
  kind: 'abierta',
  dims: ['fluidez', 'flexibilidad', 'originalidad'],
  predict: 'ideas',
  teacherInfo: {
    es: 'Usos alternativos de un objeto cotidiano de su región (Torrance). Incluye 2 usos sin sentido: no cuentan como ideas y elegirlos se registra. Cada opción se lee en voz alta y se confirma con ✓ o ✗. Mide fluidez, flexibilidad y originalidad.',
    en: 'Alternative uses for an everyday object from their region (Torrance). Includes 2 nonsense uses: they do not count as ideas and choosing them is recorded. Each option is read aloud and confirmed with ✓ or ✗. Measures fluency, flexibility and originality.',
    fr: 'Usages alternatifs d’un objet du quotidien de sa région (Torrance). Comprend 2 usages absurdes : ils ne comptent pas comme idées et leur choix est enregistré. Chaque option est lue à voix haute et confirmée par ✓ ou ✗. Mesure fluidité, flexibilité et originalité.',
  },
  play: makePlay('milusos'),
};
