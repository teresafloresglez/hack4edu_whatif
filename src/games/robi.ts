import type { GameContext, GameDef, GameOutcome, RobiAnswer } from '../core/types';
import { shuffle } from '../core/rng';
import { ACIERTOS_LOGRO_ROBI, planRobi, type Reasoning } from '../core/robi';
import { fill, tr } from '../i18n';
import { ic } from '../ui/icons';
import { h, render, waitFor, wait, flash, obs, now, isAbort, abandonedOutcome, levelRel, speakButton } from './common';

// Fase 2 · Planificar · Respuesta CERRADA. «¡Robi, eso no!»: Robi, un robot
// aprendiz, dice razonamientos; el niño decide si tienen sentido y, si no,
// le explica por qué. Aprende lógica ENSEÑANDO. Mide `logica`.
// Qué razonamientos salen lo decide la IA adaptativa (src/core/robi.ts)
// a partir del tema elegido por el niño, su continente y su historial.

const TXT = {
  intro: { es: 'Robi está aprendiendo a pensar… y a veces se lía. ¿Le ayudas?', en: 'Robi is learning to think… and sometimes gets muddled. Will you help?', fr: 'Robi apprend à réfléchir… et parfois il s’emmêle. Tu l’aides ?' },
  sense: { es: '¡Tiene sentido!', en: 'It makes sense!', fr: 'Ça a du sens !' },
  nope: { es: '¡Eso no!', en: 'No way!', fr: 'Ça, non !' },
  doubt: { es: 'Mmm… ¿seguro? Escúchalo otra vez: {f}', en: 'Hmm… are you sure? Listen again: {f}', fr: 'Mmm… vraiment ? Écoute encore : {f}' },
  why: { es: '¡Vaya! ¿Me he liado? Explícame por qué.', en: 'Oops! Did I get muddled? Tell me why.', fr: 'Oups ! Je me suis emmêlé ? Explique-moi pourquoi.' },
  whyQ: { es: '¿Por qué no tiene sentido?', en: 'Why doesn’t it make sense?', fr: 'Pourquoi ça n’a pas de sens ?' },
  whyDoubt: { es: 'Mmm… ¿seguro? Piensa otra vez por qué.', en: 'Hmm… are you sure? Think again about why.', fr: 'Mmm… vraiment ? Réfléchis encore au pourquoi.' },
  thanks: { es: '¡Gracias, profe! {a}', en: 'Thanks, teacher! {a}', fr: 'Merci, prof ! {a}' },
  oops: { es: '¡No pasa nada! {c}{a}', en: 'No problem! {c}{a}', fr: 'Ce n’est pas grave ! {c}{a}' },
  wasRight: { es: 'Esta vez sí tenía sentido. ', en: 'This time it did make sense. ', fr: 'Cette fois, ça avait du sens. ' },
  next: { es: 'Siguiente', en: 'Next', fr: 'Suivant' },
};

type Mood = 'normal' | 'doubt' | 'happy';

/** Robi dibujado en SVG (mismo estilo que el resto de dibujos). */
export function robiArt(mood: Mood, size = 96): HTMLElement {
  const S = '#263238';
  const G = `stroke="${S}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = mood === 'happy'
    ? `<path d="M21 27 q4 -5 8 0 M35 27 q4 -5 8 0" fill="none" stroke="#B2FF59" stroke-width="3" stroke-linecap="round"/>`
    : mood === 'doubt'
      ? `<circle cx="25" cy="27" r="3.4" fill="#B2FF59"/><path d="M35 27 h8" stroke="#B2FF59" stroke-width="3" stroke-linecap="round"/><path d="M34 20 l9 -2" ${G}/>`
      : `<circle cx="25" cy="27" r="3.6" fill="#B2FF59"/><circle cx="39" cy="27" r="3.6" fill="#B2FF59"/>`;
  const mouth = mood === 'happy' ? `<path d="M25 34 q7 6 14 0" fill="none" stroke="#B2FF59" stroke-width="3" stroke-linecap="round"/>`
    : mood === 'doubt' ? `<path d="M25 35 q3 -3 7 0 t7 0" fill="none" stroke="#B2FF59" stroke-width="3" stroke-linecap="round"/>`
      : `<path d="M26 35 h12" stroke="#B2FF59" stroke-width="3" stroke-linecap="round"/>`;
  const span = h('span', { class: `robi-art robi-${mood}`, 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 6 v6" ${G}/><circle cx="32" cy="5" r="3" fill="#FF7043" ${G}/>
    <rect x="12" y="12" width="40" height="32" rx="10" fill="#4FC3B0" ${G}/>
    <rect x="17" y="18" width="30" height="21" rx="7" fill="#263238"/>${eyes}${mouth}
    <rect x="8" y="22" width="5" height="12" rx="2.5" fill="#80CBC4" ${G}/><rect x="51" y="22" width="5" height="12" rx="2.5" fill="#80CBC4" ${G}/>
    <rect x="20" y="44" width="24" height="14" rx="5" fill="#4FC3B0" ${G}/><circle cx="32" cy="51" r="3" fill="#FFD54F" ${G}/>
    <path d="M20 49 l-8 6 M44 49 l8 6" ${G}/></svg>`;
  return span;
}

/**
 * Robi con su bocadillo: lo que dice se lee en voz alta. `speech` permite leer
 * algo más largo que el bocadillo (p. ej. la pregunta y las opciones) en UNA
 * sola locución: dos `say` seguidos se cortan (el segundo cancela el primero).
 */
function robiSays(ctx: GameContext, mood: Mood, text: string, speech = text): HTMLElement {
  void ctx.say(speech);
  return h('div', { class: 'robi-row' }, robiArt(mood, 92),
    h('div', { class: 'robi-bubble', role: 'note' }, h('p', {}, text), speakButton(ctx, speech)));
}

/**
 * Toques que llegan justo después de cambiar de pantalla son el segundo toque
 * de un doble toque en el botón anterior (que estaba en el mismo sitio): se ignoran
 * para que el niño no conteste sin haber escuchado a Robi.
 */
export const ROBI_TAP_GUARD_MS = 350;
function tapGuard(ctx: GameContext): () => boolean {
  const shown = now();
  return () => !!ctx.fast || now() - shown >= ROBI_TAP_GUARD_MS;
}

/**
 * Tras un fallo, «¡No pasa nada!» + «¡Claro! …» suena raro: se quita la exclamación
 * inicial del «aprende» («¡Claro!», «Of course!», « D’accord ! »…), si queda algo detrás.
 */
export function withoutCheer(text: string): string {
  const rest = text.replace(/^¡?[^!.?¡]{1,30}?\s?!\s*/u, '');
  return rest.trim() ? rest : text;
}

const dots = (i: number, n: number) => h('div', { class: 'progress-dots robi-dots', 'aria-hidden': 'true' },
  ...Array.from({ length: n }, (_, k) => h('span', { class: 'dot' + (k < i ? ' done' : k === i ? ' now' : '') })));

async function playRound(ctx: GameContext, r: Reasoning, idx: number, total: number, firstAction: () => void): Promise<RobiAnswer> {
  const frase = tr(r.frase);
  const fallacy = r.tipo !== 'ninguno';
  let errors = 0;
  let acierto = false;
  // ¿Juzgó bien a la PRIMERA? El reintento es de dos botones: acertarlo por descarte no cuenta.
  let firstTry = false;
  // ¿Eligió bien el porqué? (aunque no puntúe, Robi se lo agradece)
  let whyOk = false;
  const scene = () => h('div', { class: 'robi-scene' + (errors > 0 ? ' glow' : '') }, r.escena);

  // 1 · Juzgar (con segunda oportunidad)
  let judged = false;
  while (!judged) {
    const yes = h('button', { class: 'robi-judge yes', type: 'button', 'data-robi': 'sense', 'aria-label': tr(TXT.sense) }, ic('thumbUp', 40), h('span', {}, tr(TXT.sense)));
    const no = h('button', { class: 'robi-judge no', type: 'button', 'data-robi': 'nope', 'aria-label': tr(TXT.nope) }, ic('thumbDown', 40), h('span', {}, tr(TXT.nope)));
    render(ctx, dots(idx, total),
      robiSays(ctx, errors ? 'doubt' : 'normal', errors ? fill(tr(TXT.doubt), { f: frase }) : (idx === 0 ? tr(TXT.intro) + ' ' : '') + frase),
      scene(), h('div', { class: 'robi-judges' }, yes, no));
    const ready = tapGuard(ctx);
    const saysSense = await waitFor<boolean>(ctx, (done) => {
      yes.onclick = () => { if (!ready()) return; firstAction(); done(true); };
      no.onclick = () => { if (!ready()) return; firstAction(); done(false); };
    });
    const right = saysSense === !fallacy;
    if (right) {
      ctx.sfx('tap');
      judged = true;
      firstTry = errors === 0;
      acierto = !fallacy && firstTry;
    } else {
      ctx.sfx('bad');
      flash(saysSense ? yes : no, 'bad');
      errors++;
      await wait(ctx, 600);
      if (errors >= 2) judged = true;
    }
  }

  // 2 · Explicar por qué (solo si Robi se había liado y el niño lo ha visto; también
  //     si lo vio al 2.º intento, para aprender, aunque esa ronda ya no puntúe)
  if (fallacy && errors < 2 && r.opciones) {
    const correct = r.opciones.find((o) => o.correcta)!;
    const wrong = shuffle(r.opciones.filter((o) => !o.correcta), ctx.rng).slice(0, ctx.level <= 2 ? 1 : 2);
    const options = shuffle([correct, ...wrong], ctx.rng);
    // Cada opción lleva su 🔊: un niño que aún no lee puede escucharlas una a una.
    const grid = h('div', { class: 'robi-why' }, ...options.map((o) =>
      h('div', { class: 'robi-opt' },
        h('button', { class: 'choice-btn robi-option', type: 'button', 'data-correct': String(o.correcta), 'aria-label': tr(o.texto) }, h('span', {}, tr(o.texto))),
        speakButton(ctx, tr(o.texto)))));
    const speech = tr(TXT.why) + ' ' + tr(TXT.whyQ) + ' ' + options.map((o) => tr(o.texto)).join('. ');
    render(ctx, dots(idx, total), robiSays(ctx, 'doubt', tr(TXT.why), speech), scene(), h('p', { class: 'robi-whyq' }, tr(TXT.whyQ)), grid);
    const ready = tapGuard(ctx);
    let solved = false;
    while (!solved) {
      const btn = await waitFor<HTMLButtonElement>(ctx, (done) => {
        grid.querySelectorAll<HTMLButtonElement>('.robi-option:not([disabled])').forEach((b) => (b.onclick = () => { if (ready()) done(b); }));
      });
      if (btn.dataset.correct === 'true') {
        ctx.sfx('ok');
        flash(btn, 'ok');
        whyOk = true;
        acierto = firstTry;
        solved = true;
      } else {
        ctx.sfx('bad');
        flash(btn, 'bad');
        btn.disabled = true;
        errors++;
        // Si solo queda una opción, elegirla sería ganar por eliminación: Robi lo explica.
        const left = grid.querySelectorAll('.robi-option:not([disabled])').length;
        if (errors >= 2 || left <= 1) solved = true;
        else void ctx.say(tr(TXT.whyDoubt));
      }
      await wait(ctx, 500);
    }
  }

  // 3 · Robi aprende
  const aprende = tr(r.aprende);
  const correctText = r.opciones?.find((o) => o.correcta);
  const thanked = acierto || whyOk;
  const msg = thanked
    ? fill(tr(TXT.thanks), { a: aprende })
    : fill(tr(TXT.oops), { c: fallacy ? (correctText ? tr(correctText.texto) + '. ' : '') : tr(TXT.wasRight), a: withoutCheer(aprende) });
  const next = h('button', { class: 'big-btn done-btn', type: 'button', 'data-done': 'true', 'aria-label': tr(TXT.next) }, ic('next', 36), h('span', { class: 'btn-label' }, tr(TXT.next)));
  ctx.sfx(thanked ? 'win' : 'tap');
  render(ctx, dots(idx + 1, total), robiSays(ctx, thanked ? 'happy' : 'normal', msg), scene(), h('div', { class: 'row-center' }, next));
  const ready = tapGuard(ctx);
  await waitFor<void>(ctx, (done) => { next.onclick = () => { if (ready()) done(); }; }, 45000, () => undefined);
  return { id: r.id, tipo: r.tipo, acierto, conPista: acierto && errors > 0 };
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  let firstMs = 0;
  const firstAction = () => { if (!firstMs) firstMs = now() - start; };
  const rounds = planRobi(ctx.student, ctx.level, { themeId: ctx.theme.id, regionId: ctx.culture.id, rng: ctx.rng });
  const answers: RobiAnswer[] = [];
  try {
    for (const [i, round] of rounds.entries()) answers.push(await playRound(ctx, round.reasoning, i, rounds.length, firstAction));
  } catch (e) {
    if (!isAbort(e)) throw e;
    // Las respuestas ya dadas se guardan para que cuenten como VISTAS (no repetirlas), pero sin puntuar.
    return { ...abandonedOutcome('robi', ctx.level, start, [], { aciertos: answers.filter((a) => a.acierto).length }), tags: { robi: answers } };
  }

  const aciertos = answers.filter((a) => a.acierto).length;
  const pistas = answers.filter((a) => a.conPista).length;
  const accuracy = aciertos / answers.length;
  // Cada razonamiento: acierto = 1, acierto con pista = 0,75 (como un error en las respuestas cerradas), fallo = 0.
  const quality = answers.reduce((s, a) => s + (a.acierto ? (a.conPista ? 0.75 : 1) : 0), 0) / answers.length;
  // Decir «¡Eso no!» a un razonamiento correcto: posible respuesta sin pensar (para el informe).
  const falsosNo = answers.filter((a) => a.tipo === 'ninguno' && !a.acierto).length;
  ctx.sfx('win');
  return {
    gameId: 'robi',
    level: ctx.level,
    abandoned: false,
    // Logro: suficientes aciertos Y sin decir «¡Eso no!» al razonamiento correcto
    // (así contestar «¡Eso no!» a todo, o al azar, no sube de nivel).
    success: aciertos >= ACIERTOS_LOGRO_ROBI && falsosNo === 0,
    // Sin ningún acierto no hay marca que superar (el nivel solo suma si ha acertado algo).
    personalMetric: aciertos > 0 ? aciertos * 10 - pistas + ctx.level * 5 : 0,
    observations: [obs('logica', 0.75 * quality + 0.25 * levelRel(ctx), 1)],
    metrics: { accuracy, aciertos, rondas: answers.length, pistasRobi: pistas, falsosNo, firstActionMs: Math.round(firstMs) },
    tags: { robi: answers, robiPlan: rounds.map((r) => r.decision) },
    durationMs: now() - start,
  };
}

export const robiGame: GameDef = {
  id: 'robi',
  name: { es: '¡Robi, eso no!', en: 'Robi, no way!', fr: 'Robi, ça non !' },
  icon: '🤖',
  phase: 2,
  kind: 'cerrada',
  dims: ['logica'],
  predict: 'stars',
  teacherInfo: {
    es: 'Robi, un robot aprendiz, dice razonamientos: unos tienen sentido y otros no (absurdos, parecidos, falsas causas, generalizaciones, reglas al revés). El niño decide y le explica por qué: aprende lógica enseñando. Una IA adaptativa del propio dispositivo elige qué tipo practicar según lo que más le cuesta, el tema que ha elegido y su continente, sin conexión ni envío de datos.',
    en: 'Robi, a learner robot, says pieces of reasoning: some make sense and some do not (absurd ideas, look-alikes, false causes, generalisations, reversed rules). The child decides and explains why: they learn logic by teaching. An adaptive AI on the device chooses what to practise based on what they find hardest, the theme they chose and their continent, offline and without sending data.',
    fr: 'Robi, un robot apprenti, dit des raisonnements : certains ont du sens, d’autres non (absurdités, ressemblances, fausses causes, généralisations, règles renversées). L’enfant décide et lui explique pourquoi : il apprend la logique en enseignant. Une IA adaptative sur l’appareil choisit quoi travailler selon ce qui lui coûte le plus, le thème choisi et son continent, sans connexion ni envoi de données.',
  },
  play,
};

