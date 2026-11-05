import type { AreaId, ConflictStyle, DimensionId, ReciprocityStyle, Student } from './types';
import { AREAS, DIMENSIONS, DIM_BY_ID } from './dimensions';
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from './adaptation';
import { fill, tr, type L } from '../i18n';
import { getTheme } from '../data/themes';

// Informe para el docente. Agregado, nunca de una sola partida, y con
// lenguaje de OBSERVACIÓN (no de diagnóstico).

export const MIN_EVIDENCE = 2;

export type DimStatus = 'fortaleza' | 'en_desarrollo' | 'crecimiento' | 'sin_datos';

export interface DimReport {
  id: DimensionId;
  label: string;
  area: AreaId;
  score: number | null; // 0..100
  n: number;
  status: DimStatus;
  confidence: 'baja' | 'media' | 'alta';
  trend: 'sube' | 'baja' | 'estable' | null;
}

export interface Signal {
  id: string;
  title: string;
  text: string;
  suggestion: string;
}

export interface StudentReport {
  student: Student;
  generatedAt: number;
  gamesPlayed: number;
  projectsDone: number;
  totalMinutes: number;
  dims: DimReport[];
  areas: { id: AreaId; label: string; icon: string; color: string; score: number | null }[];
  strengths: DimReport[];
  growth: DimReport[];
  conflict: { style: ConflictStyle; pct: number }[];
  reciprocity: { style: ReciprocityStyle; count: number }[];
  workStyle: string[];
  signals: Signal[];
  recommendations: { dim: DimReport; classroom: string[]; games: string[] }[];
  enoughData: boolean;
}

export function dimStatus(mean: number, n: number): DimStatus {
  if (n < MIN_EVIDENCE) return 'sin_datos';
  if (mean >= STRONG_THRESHOLD) return 'fortaleza';
  if (mean < WEAK_THRESHOLD) return 'crecimiento';
  return 'en_desarrollo';
}

export const STATUS_LABEL: Record<DimStatus, L> = {
  fortaleza: { es: 'Punto fuerte', en: 'Strength', fr: 'Point fort' },
  en_desarrollo: { es: 'En desarrollo', en: 'Developing', fr: 'En développement' },
  crecimiento: { es: 'Área en crecimiento', en: 'Growth area', fr: 'Point à développer' },
  sin_datos: { es: 'Aún sin datos suficientes', en: 'Not enough data yet', fr: 'Pas encore assez de données' },
};

function trendOf(history: number[]): DimReport['trend'] {
  if (history.length < 4) return null;
  const half = Math.floor(history.length / 2);
  const a = history.slice(0, half).reduce((x, y) => x + y, 0) / half;
  const b = history.slice(half).reduce((x, y) => x + y, 0) / (history.length - half);
  if (b - a > 0.08) return 'sube';
  if (a - b > 0.08) return 'baja';
  return 'estable';
}

export function buildReport(student: Student): StudentReport {
  const dims: DimReport[] = DIMENSIONS.map((d) => {
    const st = student.dims[d.id];
    const status = dimStatus(st.mean, st.n);
    return {
      id: d.id,
      label: tr(d.label),
      area: d.area,
      score: st.n > 0 ? Math.round(st.mean * 100) : null,
      n: st.n,
      status,
      confidence: st.n >= 5 ? 'alta' : st.n >= MIN_EVIDENCE ? 'media' : 'baja',
      trend: trendOf(st.history),
    };
  });

  const areas = (Object.keys(AREAS) as AreaId[]).map((id) => {
    const ds = dims.filter((d) => d.area === id && d.score !== null && d.n >= 1);
    const score = ds.length ? Math.round(ds.reduce((a, d) => a + d.score!, 0) / ds.length) : null;
    return { id, ...AREAS[id], label: tr(AREAS[id].label), score };
  });

  const withData = dims.filter((d) => d.status !== 'sin_datos');
  const strengths = withData.filter((d) => d.status === 'fortaleza').sort((a, b) => b.score! - a.score!).slice(0, 3);
  const growth = withData.filter((d) => d.status === 'crecimiento').sort((a, b) => a.score! - b.score!).slice(0, 3);

  const cs = student.conflictStyles;
  const csTotal = Object.values(cs).reduce((a, b) => a + b, 0);
  const conflict = (Object.keys(cs) as ConflictStyle[])
    .map((style) => ({ style, pct: csTotal ? Math.round((cs[style] / csTotal) * 100) : 0 }))
    .filter((x) => x.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const reciprocity = (Object.keys(student.reciprocity) as ReciprocityStyle[])
    .map((style) => ({ style, count: student.reciprocity[style] }))
    .filter((x) => x.count > 0);

  const gamesPlayed = student.plays.filter((p) => p.gameId !== 'reflexion').length;
  const totalMinutes = Math.round(student.plays.reduce((a, p) => a + (p.outcome.durationMs || 0), 0) / 60000);

  return {
    student,
    generatedAt: Date.now(),
    gamesPlayed,
    projectsDone: student.projects.filter((p) => p.finishedAt).length,
    totalMinutes,
    dims,
    areas,
    strengths,
    growth,
    conflict,
    reciprocity,
    workStyle: workStyle(student),
    signals: signals(student, dims),
    recommendations: growth.map((d) => ({ dim: d, classroom: DIM_BY_ID[d.id].classroom.map(tr), games: DIM_BY_ID[d.id].games })),
    enoughData: gamesPlayed >= 4,
  };
}

function workStyle(s: Student): string[] {
  const out: string[] = [];
  const plays = s.plays.filter((p) => !p.outcome.abandoned);
  const preds = s.plays.filter((p) => p.outcome.metrics.predictedBand !== undefined && p.outcome.metrics.actualBand !== undefined);
  if (preds.length >= 3) {
    const bias = preds.reduce((a, p) => a + (p.outcome.metrics.predictedBand - p.outcome.metrics.actualBand), 0) / preds.length;
    if (bias >= 0.8) out.push(tr({ es: 'Suele esperar mejores resultados de los que obtiene: conviene ayudarle a revisar su trabajo antes de darlo por terminado.', en: 'Usually expects better results than they get: help them check their work before calling it finished.', fr: 'Attend souvent de meilleurs résultats que ceux obtenus : aidez-le à relire son travail avant de le considérer comme fini.' }));
    else if (bias <= -0.8) out.push(tr({ es: 'Suele esperar peores resultados de los que obtiene: puede necesitar refuerzo de su confianza (efecto Pigmalión).', en: 'Usually expects worse results than they get: may need their confidence boosted (Pygmalion effect).', fr: 'Attend souvent de moins bons résultats que ceux obtenus : peut avoir besoin d’être conforté (effet Pygmalion).' }));
    else out.push(tr({ es: 'Sus predicciones sobre cómo le irá suelen ser acertadas.', en: 'Their predictions about how they will do are usually accurate.', fr: 'Ses prédictions sur ses résultats sont généralement justes.' }));
  }
  const camino = plays.filter((p) => p.gameId === 'camino');
  if (camino.length) {
    const first = camino.reduce((a, p) => a + (p.outcome.metrics.firstMoveMs ?? 0), 0) / camino.length;
    if (first > 0 && first < 800) out.push(tr({ es: 'Empieza a moverse casi sin mirar el mapa: tiende a actuar antes de planificar.', en: 'Starts moving almost without looking at the map: tends to act before planning.', fr: 'Commence à bouger presque sans regarder la carte : a tendance à agir avant de planifier.' }));
    else if (first >= 2000) out.push(tr({ es: 'Se toma su tiempo para observar antes de empezar: planifica.', en: 'Takes time to look before starting: plans ahead.', fr: 'Prend le temps d’observer avant de commencer : planifie.' }));
  }
  if (s.signals.hintsUsed > 0) out.push(fill(tr({ es: 'Ha pedido ayuda (pistas) {n} vez/veces.', en: 'Has asked for help (hints) {n} time(s).', fr: 'A demandé de l’aide (indices) {n} fois.' }), { n: s.signals.hintsUsed }));
  const fav = s.favoriteThemes[0];
  if (fav) out.push(fill(tr({ es: 'Temas que elige: {list}. Úselos para motivarle en clase.', en: 'Themes they choose: {list}. Use them to motivate them in class.', fr: 'Thèmes choisis : {list}. Utilisez-les pour le motiver en classe.' }), { list: s.favoriteThemes.map((id) => tr(getTheme(id).name)).join(', ') }));
  return out;
}

/** Señales para OBSERVAR en el aula. Nunca son un diagnóstico. */
function signals(s: Student, dims: DimReport[]): Signal[] {
  const out: Signal[] = [];
  const sig = s.signals;
  const low = (id: DimensionId, thr = 0.35, n = 3) => s.dims[id].n >= n && s.dims[id].mean < thr;
  const add = (id: string, title: L, text: L, suggestion: L) => out.push({ id, title: tr(title), text: tr(text), suggestion: tr(suggestion) });

  const colorErr = sig.similarColorErrors, shapeErr = sig.otherColorErrors;
  if (sig.colorTrials >= 12 && colorErr >= 4 && colorErr / (colorErr + shapeErr + 1) >= 0.7) {
    add('color',
      { es: 'Distinción de colores', en: 'Telling colours apart', fr: 'Distinction des couleurs' },
      { es: 'Confunde a menudo colores parecidos (por ejemplo rojo, verde o marrón) aunque reconoce bien las formas.', en: 'Often mixes up similar colours (for example red, green or brown) although they recognise shapes well.', fr: 'Confond souvent des couleurs proches (par exemple rouge, vert ou marron) alors qu’il reconnaît bien les formes.' },
      { es: 'Observe si le ocurre también con objetos reales. Si es así, puede ser útil una revisión de la vista y evitar usar solo el color para dar información.', en: 'Watch whether this also happens with real objects. If so, an eye check may help, and avoid using colour alone to convey information.', fr: 'Observez si cela arrive aussi avec des objets réels. Si oui, un contrôle de la vue peut être utile ; évitez de transmettre une information uniquement par la couleur.' });
  }
  if (sig.responses >= 15 && sig.fastErrors / sig.responses >= 0.25) {
    add('impulso',
      { es: 'Respuestas muy rápidas', en: 'Very quick answers', fr: 'Réponses très rapides' },
      { es: 'Responde muy deprisa y se equivoca a menudo en esas respuestas rápidas.', en: 'Answers very quickly and often gets those quick answers wrong.', fr: 'Répond très vite et se trompe souvent dans ces réponses rapides.' },
      { es: 'Rutina de "para, mira y responde". Observe si en el aula también le cuesta esperar o mantener la atención.', en: 'Use a "stop, look and answer" routine. Watch whether waiting or staying focused is also hard in class.', fr: 'Routine « stop, regarde et réponds ». Observez si, en classe aussi, il a du mal à attendre ou à rester concentré.' });
  }
  if (sig.responses >= 15 && sig.slowResponses / sig.responses >= 0.4) {
    add('ritmo',
      { es: 'Ritmo de respuesta', en: 'Response pace', fr: 'Rythme de réponse' },
      { es: 'Necesita bastante más tiempo que otros niños de su edad para responder.', en: 'Needs quite a lot more time than other children their age to answer.', fr: 'A besoin de nettement plus de temps que les enfants de son âge pour répondre.' },
      { es: 'Ofrezca más tiempo y menos estímulos a la vez. Compruebe que entiende bien la voz y las instrucciones (idioma, audición).', en: 'Allow more time and fewer things at once. Check that they understand the voice and instructions well (language, hearing).', fr: 'Laissez plus de temps et moins de stimuli à la fois. Vérifiez qu’il comprend bien la voix et les consignes (langue, audition).' });
  }
  if (low('memoria') && low('atencion')) {
    add('visual',
      { es: 'Procesar y recordar lo que ve', en: 'Processing and remembering what they see', fr: 'Traiter et retenir ce qu’il voit' },
      { es: 'En varios juegos distintos le cuesta fijarse en los detalles y recordar lo que acaba de ver.', en: 'In several different games they find it hard to notice details and remember what they have just seen.', fr: 'Dans plusieurs jeux différents, il a du mal à repérer les détails et à retenir ce qu’il vient de voir.' },
      { es: 'Si también lo observa en el aula y se mantiene en el tiempo, puede ser útil comentarlo con el equipo de orientación.', en: 'If you also see this in class and it persists over time, it may help to discuss it with the school support team.', fr: 'Si vous l’observez aussi en classe et que cela dure, il peut être utile d’en parler à l’équipe d’accompagnement.' });
  }
  const lowCount = dims.filter((x) => x.n >= 2 && x.score !== null && x.score < 35).length;
  if (lowCount >= 6) {
    add('global',
      { es: 'Dificultad en muchos juegos', en: 'Difficulty in many games', fr: 'Difficulté dans de nombreux jeux' },
      { es: 'Los resultados están por debajo de lo esperado para su edad en la mayoría de los juegos.', en: 'Results are below what is expected for their age in most games.', fr: 'Les résultats sont en dessous de ce qui est attendu pour son âge dans la plupart des jeux.' },
      { es: 'Antes de sacar conclusiones, compruebe que entiende la mecánica (acompáñele en una partida). Si persiste, puede ser útil una valoración especializada.', en: 'Before drawing conclusions, check that they understand how the games work (play one with them). If it persists, a specialist assessment may help.', fr: 'Avant de conclure, vérifiez qu’il comprend le fonctionnement (accompagnez-le pendant une partie). Si cela persiste, un bilan spécialisé peut être utile.' });
  }
  if (low('perspectiva') && s.dims.conflicto.n >= 3 && s.dims.conflicto.mean < 0.4) {
    add('social',
      { es: 'Ponerse en el lugar del otro', en: "Putting themselves in others' shoes", fr: 'Se mettre à la place de l’autre' },
      { es: 'Le cuesta anticipar lo que sienten o harán los demás y usa casi siempre la misma estrategia ante un conflicto.', en: 'Finds it hard to anticipate what others feel or will do, and nearly always uses the same strategy in a conflict.', fr: 'A du mal à anticiper ce que les autres ressentent ou vont faire et utilise presque toujours la même stratégie face à un conflit.' },
      { es: 'Juegos de rol y cuentos donde se pregunte "¿cómo se siente?". Observe cómo se relaciona en el recreo.', en: 'Role play and stories asking "how do they feel?". Watch how they get on with others at break time.', fr: 'Jeux de rôle et histoires où l’on demande « comment se sent-il ? ». Observez ses relations pendant la récréation.' });
  }
  const totalPlays = s.plays.length;
  if (sig.abandons >= 3 && sig.abandons / Math.max(1, totalPlays) >= 0.3) {
    add('abandono',
      { es: 'Abandona las tareas', en: 'Leaves tasks unfinished', fr: 'Abandonne les tâches' },
      { es: 'Deja a medias muchos juegos.', en: 'Leaves many games half-finished.', fr: 'Laisse beaucoup de jeux en cours.' },
      { es: 'Proponga tareas cortas con éxito asegurado y celebre el esfuerzo, no el resultado. Observe si ocurre ante la frustración o por cansancio.', en: 'Offer short tasks they can succeed at and praise effort, not results. Watch whether it happens out of frustration or tiredness.', fr: 'Proposez des tâches courtes à réussite assurée et valorisez l’effort, pas le résultat. Observez si cela arrive par frustration ou par fatigue.' });
  }
  if (sig.selectAll >= 2) {
    add('todo',
      { es: 'Elige sin discriminar', en: 'Chooses without discriminating', fr: 'Choisit sans discernement' },
      { es: 'En los juegos de ideas tiende a tocar todas las tarjetas sin pararse a pensar.', en: 'In the idea games they tend to tap every card without stopping to think.', fr: 'Dans les jeux d’idées, il a tendance à toucher toutes les cartes sans réfléchir.' },
      { es: 'Pídale que explique en voz alta una o dos ideas que de verdad le gusten.', en: 'Ask them to explain out loud one or two ideas they really like.', fr: 'Demandez-lui d’expliquer à voix haute une ou deux idées qu’il aime vraiment.' });
  }
  if (sig.nonsenseShown >= 6 && sig.nonsensePicks / sig.nonsenseShown >= 0.5) {
    add('sinsentido',
      { es: 'Acepta usos sin sentido', en: 'Accepts nonsense uses', fr: 'Accepte des usages absurdes' },
      { es: 'En "Mil usos" confirma a menudo usos imposibles (por ejemplo, comerse un cubo).', en: 'In "A thousand uses" they often confirm impossible uses (for example, eating a bucket).', fr: 'Dans « Mille usages », il confirme souvent des usages impossibles (par exemple, manger un seau).' },
      { es: 'Compruebe que entiende la pregunta y el idioma de la voz. Juegue a "¿esto se puede o no se puede hacer?" con objetos reales.', en: 'Check that they understand the question and the language of the voice. Play "can you or can’t you do this?" with real objects.', fr: 'Vérifiez qu’il comprend la question et la langue de la voix. Jouez à « est-ce possible ou pas ? » avec des objets réels.' });
  }
  return out;
}

export const CONFLICT_LABEL: Record<ConflictStyle, L> = {
  competir: { es: 'Competir', en: 'Compete', fr: 'Rivaliser' },
  ceder: { es: 'Ceder', en: 'Give in', fr: 'Céder' },
  compromiso: { es: 'Compromiso', en: 'Compromise', fr: 'Compromis' },
  evitar: { es: 'Evitar', en: 'Avoid', fr: 'Éviter' },
  integrar: { es: 'Integrar', en: 'Integrate', fr: 'Intégrer' },
};

export const RECIPROCITY_LABEL: Record<ReciprocityStyle, L> = {
  castiga: { es: 'Castiga (ofrece menos tras una trampa)', en: 'Punishes (offers less after cheating)', fr: 'Punit (offre moins après une triche)' },
  perdona: { es: 'Perdona (sigue igual)', en: 'Forgives (carries on the same)', fr: 'Pardonne (continue pareil)' },
  copia: { es: 'Copia (devuelve lo mismo)', en: 'Copies (gives back the same)', fr: 'Copie (rend la pareille)' },
};
