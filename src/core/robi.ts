import type { RobiAnswer, RobiDecision, RobiFallacy, RobiType, Student } from './types';
import type { L } from '../i18n';
import R from '../contenido/robi.json';

// IA ADAPTATIVA de «¡Robi, eso no!» (motor). Todo ocurre en el dispositivo,
// sin conexión y sin enviar nada: decide QUÉ razonamientos le tocan a cada
// niño a partir de su propio historial.
//
//   1. Tipos de fallo disponibles según el nivel (se desbloquean y acumulan).
//   2. Dominio suavizado de cada tipo: (aciertos + 1) / (intentos + 2).
//   3. Por cada razonamiento con fallo: 60 % el tipo que menos domina
//      (practicar), 40 % uno al azar (explorar). Siempre 1 razonamiento correcto.
//   4. Razonamiento concreto: de SUS gustos (el tema que ha elegido en su
//      proyecto) y de su continente, sin repetir los últimos 12; si no hay,
//      de otro gusto; y al final cualquiera del tipo.
//
// La IA GENERATIVA solo se usa fuera de la app para escribir el contenido
// (src/contenido/robi.json), que revisan personas antes de que lo vea un niño.

export type Gusto = 'animales' | 'deporte' | 'comida';

export interface Reasoning {
  id: string;
  gusto: Gusto;
  tipo: RobiType;
  escena: string;
  frase: L;
  opciones?: { texto: L; correcta: boolean }[];
  aprende: L;
  regiones?: string[];
}

export const REASONINGS: Reasoning[] = R.razonamientos as Reasoning[];

/** Nivel desde el que aparece cada tipo de fallo. */
export const FALLACY_LEVEL: Record<RobiFallacy, number> = { absurdo: 1, parecido: 2, falsaCausa: 3, generalizar: 4, alReves: 5 };
export const FALLACIES = Object.keys(FALLACY_LEVEL) as RobiFallacy[];

export const PROB_PRACTICAR_DIFICIL = 0.6;
export const RAZONAMIENTOS_RECIENTES = 12;
export const ACIERTOS_LOGRO_ROBI = 2;

/** Sus gustos salen de lo que ya sabemos del niño: el tema que ha elegido (no se le pregunta nada nuevo). */
const THEME_GUSTOS: Record<string, Gusto[]> = {
  animales: ['animales'],
  futbol: ['deporte'],
  cocina: ['comida'],
  parque: ['animales', 'deporte'],
  espacio: [],
};

/** Gustos del TEMA del proyecto actual (el primer escalón de preferencia). */
export function themeGustos(themeId?: string): Gusto[] {
  // hasOwnProperty: un tema dañado como 'constructor' no debe colarse desde Object.prototype.
  return themeId && Object.prototype.hasOwnProperty.call(THEME_GUSTOS, themeId) ? THEME_GUSTOS[themeId] : [];
}

/** Todos sus gustos: primero los del tema actual y después los de sus temas favoritos. */
export function gustosFor(student: Student, themeId?: string): Gusto[] {
  const themes = [themeId, ...student.favoriteThemes].filter((x): x is string => !!x);
  const out: Gusto[] = [];
  for (const th of themes) for (const g of themeGustos(th)) if (!out.includes(g)) out.push(g);
  return out;
}

const ROBI_TYPES: readonly string[] = ['absurdo', 'parecido', 'falsaCausa', 'generalizar', 'alReves', 'ninguno'];
export const isRobiType = (x: unknown): x is RobiType => typeof x === 'string' && ROBI_TYPES.includes(x);

/**
 * Respuestas de Robi guardadas en sus partidas anteriores (de la más antigua a la más reciente).
 * Las etiquetas vienen de localStorage sin validar: se descartan las entradas dañadas
 * para que la IA y el informe no se rompan.
 */
function answersOf(student: Student, withAbandoned: boolean): RobiAnswer[] {
  return student.plays.filter((p) => p.gameId === 'robi' && (withAbandoned || !p.outcome.abandoned)).flatMap((p) => {
    const list: unknown = p.outcome.tags?.robi;
    if (!Array.isArray(list)) return [];
    return list.filter((a): a is RobiAnswer => !!a && typeof a === 'object' && typeof a.id === 'string' && isRobiType(a.tipo))
      .map((a) => ({ id: a.id, tipo: a.tipo, acierto: a.acierto === true, conPista: a.conPista === true }));
  });
}

/** Respuestas que PUNTÚAN (partidas terminadas): dominio de la IA e informe. */
export function robiHistory(student: Student): RobiAnswer[] {
  return answersOf(student, false);
}

/** Razonamientos que ya ha VISTO (también en partidas abandonadas), del más antiguo al más reciente. */
export function robiSeen(student: Student): string[] {
  return answersOf(student, true).map((a) => a.id);
}

/**
 * Dominio suavizado: no saca conclusiones con pocos datos (nunca visto = 50 %).
 * Un acierto con pista cuenta medio.
 */
export function dominio(history: RobiAnswer[], tipo: RobiType): number {
  const mine = history.filter((h) => h.tipo === tipo);
  const ok = mine.reduce((s, h) => s + (h.acierto ? (h.conPista ? 0.5 : 1) : 0), 0);
  return (ok + 1) / (mine.length + 2);
}

export function availableFallacies(level: number): RobiFallacy[] {
  // Un nivel no numérico dejaría la lista vacía (y la partida sin fallos que elegir).
  const lv = Number.isFinite(level) ? Math.max(1, Math.min(5, level)) : 1;
  return FALLACIES.filter((f) => FALLACY_LEVEL[f] <= lv);
}

export interface RobiRound { reasoning: Reasoning; decision: RobiDecision }

/** Prepara los 3 razonamientos de una partida para este niño. */
export function planRobi(student: Student, level: number, opts: { themeId?: string; regionId: string; rng: () => number }): RobiRound[] {
  const { rng } = opts;
  const history = robiHistory(student);
  const seen = robiSeen(student);
  const recent = new Set(seen.slice(-RAZONAMIENTOS_RECIENTES));
  // Cuándo lo vio por última vez (índice en `seen`; -1 = nunca).
  const lastSeen = new Map<string, number>();
  seen.forEach((id, i) => lastSeen.set(id, i));
  const allGustos = gustosFor(student, opts.themeId);
  // Primer escalón: el tema del proyecto actual; si no da gustos (p. ej. 'espacio'), sus favoritos.
  const temaGustos = themeGustos(opts.themeId);
  const primary = temaGustos.length ? temaGustos : allGustos;
  const likes = (gs: Gusto[]) => (r: Reasoning) => gs.length === 0 || gs.includes(r.gusto);
  const used = new Set<string>();
  const fits = (r: Reasoning) => !r.regiones || r.regiones.includes(opts.regionId);
  const pickFrom = <T,>(list: T[]): T => list[Math.floor(rng() * list.length)];

  const chooseReasoning = (tipo: RobiType): { r: Reasoning; otroGusto: boolean } => {
    // Todos los escalones respetan su continente (`fits`) y no repiten en la partida (`used`).
    const ofType = REASONINGS.filter((r) => r.tipo === tipo && fits(r) && !used.has(r.id));
    const fresh = ofType.filter((r) => !recent.has(r.id));
    // Preferencia: de su continente y su tema; de su tema; de sus otros gustos; cualquiera sin ver hace poco.
    const tiers = [
      fresh.filter((r) => !!r.regiones && likes(primary)(r)),
      fresh.filter(likes(primary)),
      fresh.filter(likes(allGustos)),
      fresh,
    ];
    const otro = (r: Reasoning) => allGustos.length > 0 && !allGustos.includes(r.gusto);
    for (const tier of tiers) {
      if (tier.length) {
        const r = pickFrom(tier);
        return { r, otroGusto: otro(r) };
      }
    }
    // Sin razonamientos frescos: el que vio hace más tiempo.
    if (ofType.length) {
      const age = (r: Reasoning) => lastSeen.get(r.id) ?? -1;
      const oldest = Math.min(...ofType.map(age));
      const r = pickFrom(ofType.filter((x) => age(x) === oldest));
      return { r, otroGusto: otro(r) };
    }
    // Último recurso (contenido agotado): nunca repite en la partida ni sale de su continente.
    const r = REASONINGS.find((x) => !used.has(x.id) && fits(x) && x.tipo === tipo)
      ?? REASONINGS.find((x) => !used.has(x.id) && fits(x))
      ?? REASONINGS.find((x) => !used.has(x.id))!;
    return { r, otroGusto: otro(r) };
  };

  const available = availableFallacies(level);
  const chooseType = (): { tipo: RobiFallacy; motivo: 'practicar' | 'explorar' } => {
    if (rng() < PROB_PRACTICAR_DIFICIL) {
      const min = Math.min(...available.map((t) => dominio(history, t)));
      const weakest = available.filter((t) => dominio(history, t) === min);
      // Todos empatados (p. ej. un niño nuevo): no hay nada que «practicar», es explorar.
      return { tipo: pickFrom(weakest), motivo: weakest.length === available.length ? 'explorar' : 'practicar' };
    }
    return { tipo: pickFrom(available), motivo: 'explorar' };
  };

  // Siempre uno correcto: así no basta con decir «¡Eso no!» a todo.
  const plan: { tipo: RobiType; motivo: RobiDecision['motivo'] }[] = [{ tipo: 'ninguno', motivo: 'correcto' }, chooseType(), chooseType()];
  const rounds = plan.map(({ tipo: wanted, motivo }) => {
    const { r, otroGusto } = chooseReasoning(wanted);
    used.add(r.id);
    // La decisión describe lo que de verdad sale (solo difiere si el contenido se agotara).
    const tipo = r.tipo;
    return { reasoning: r, decision: { tipo, motivo: tipo === wanted ? motivo : 'explorar' as const, dominio: Math.round(dominio(history, tipo) * 100) / 100, otroGusto } };
  });
  // Barajar para que el correcto no salga siempre en la misma posición.
  for (let i = rounds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
  }
  return rounds;
}

/** Desglose por tipo para el docente: aciertos e intentos de cada tipo. */
export function robiBreakdown(student: Student): { tipo: RobiType; ok: number; n: number }[] {
  const h = robiHistory(student);
  return ([...FALLACIES, 'ninguno'] as RobiType[]).map((tipo) => {
    const mine = h.filter((x) => x.tipo === tipo);
    return { tipo, ok: mine.filter((x) => x.acierto).length, n: mine.length };
  }).filter((x) => x.n > 0);
}

export const TYPE_LABEL: Record<RobiType, L> = {
  absurdo: { es: 'Absurdos', en: 'Absurd ideas', fr: 'Absurdités' },
  parecido: { es: 'Parecido no es igual', en: 'Similar is not the same', fr: 'Semblable n’est pas pareil' },
  falsaCausa: { es: 'Falsa causa', en: 'False cause', fr: 'Fausse cause' },
  generalizar: { es: 'Generalizar con un caso', en: 'Generalising from one case', fr: 'Généraliser à partir d’un cas' },
  alReves: { es: 'Darle la vuelta a la regla', en: 'Reversing the rule', fr: 'Renverser la règle' },
  ninguno: { es: 'Razonamientos correctos', en: 'Correct reasoning', fr: 'Raisonnements corrects' },
};
