import type { ConflictStyle, DimensionId, GameDef, GameOutcome, PhaseId, PlayRecord, Student } from './types';
import { updateLevel } from './adaptation';

// Motor de evaluación: convierte las huellas de una partida en el perfil.
// Sin IA pesada: medias ponderadas con recencia y conteos sencillos.

export const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

/** Actualiza una dimensión con una observación (media ponderada con recencia). */
export function updateDimension(student: Student, dim: DimensionId, value: number, weight: number): void {
  const st = student.dims[dim];
  const w = clamp01(weight) || 0.01;
  const v = clamp01(value);
  // Media ponderada acumulada, pero con un mínimo de 0.2 para dar peso a lo reciente.
  const alpha = Math.max(w / (st.weightSum + w), 0.2 * w);
  st.mean = st.weightSum === 0 ? v : st.mean + alpha * (v - st.mean);
  st.weightSum += w;
  st.history.push(Math.round(v * 100) / 100);
  if (st.history.length > 12) st.history.shift();
}

/** Entropía normalizada de una distribución (0 = un solo estilo, 1 = todos por igual). */
export function normalizedEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const k = counts.length;
  let h = 0;
  for (const c of counts) if (c > 0) h -= (c / total) * Math.log(c / total);
  return h / Math.log(k);
}

/** Banda de rendimiento (1..3) a partir de la precisión, para comparar con la predicción. */
export function performanceBand(accuracy: number): number {
  if (accuracy >= 0.8) return 3;
  if (accuracy >= 0.5) return 2;
  return 1;
}

/** Estrellas que VE el niño: participar, intentarlo y mejorar su propia marca (Pigmalión). */
export function computeStars(outcome: GameOutcome, previousBest: number, previousPlays: number): number {
  let stars = 1; // participar
  if (!outcome.abandoned) stars += 1; // intentarlo hasta el final
  if (!outcome.abandoned && (previousPlays === 0 || outcome.personalMetric > previousBest)) stars += 1; // mejorar su marca
  return stars;
}

export interface ApplyResult {
  stars: number;
  levelBefore: number;
  levelAfter: number;
  improved: boolean;
  record: PlayRecord;
}

/**
 * Aplica una partida al perfil del alumno. Es la ÚNICA función que
 * modifica el perfil a partir de un juego.
 */
export function applyOutcome(
  student: Student,
  game: GameDef,
  outcome: GameOutcome,
  opts: { phase: PhaseId; projectId: string; prediction?: number },
): ApplyResult {
  const lvl = student.levels[game.id] ?? { level: outcome.level, streak: 0, plays: 0, best: 0 };
  const previousBest = lvl.best;
  const previousPlays = lvl.plays;
  const levelBefore = lvl.level;

  // 1) Huellas → dimensiones (una partida cuenta una vez por dimensión)
  const touched = new Set<DimensionId>();
  for (const ob of outcome.observations) {
    if (!student.dims[ob.dim]) continue;
    // Una partida abandonada pesa la mitad: no sacamos conclusiones de un abandono.
    const w = outcome.abandoned ? ob.weight * 0.5 : ob.weight;
    updateDimension(student, ob.dim, ob.value, w);
    touched.add(ob.dim);
  }

  // 2) Datos categóricos
  const tags = outcome.tags ?? {};
  for (const s of tags.conflictStyles ?? []) student.conflictStyles[s] = (student.conflictStyles[s] ?? 0) + 1;
  for (const r of tags.reciprocity ?? []) student.reciprocity[r] = (student.reciprocity[r] ?? 0) + 1;
  if ((tags.conflictStyles?.length ?? 0) > 0) {
    // El repertorio (variedad de estilos acumulada) también es una huella del eje "conflicto".
    const styles: ConflictStyle[] = ['competir', 'ceder', 'compromiso', 'evitar', 'integrar'];
    const ent = normalizedEntropy(styles.map((s) => student.conflictStyles[s] ?? 0));
    const integra = (student.conflictStyles.integrar ?? 0) > 0 ? 0.15 : 0;
    updateDimension(student, 'conflicto', clamp01(ent + integra), 0.5);
    touched.add('conflicto');
  }

  // 3) Señales para observación (nunca diagnósticos)
  const sig = student.signals;
  sig.similarColorErrors += tags.similarColorErrors ?? 0;
  sig.otherColorErrors += tags.otherErrors ?? 0;
  sig.colorTrials += outcome.metrics.colorTrials ?? 0;
  sig.fastErrors += outcome.metrics.fastErrors ?? 0;
  sig.slowResponses += outcome.metrics.slowResponses ?? 0;
  sig.responses += outcome.metrics.responses ?? 0;
  sig.hintsUsed += outcome.metrics.hints ?? 0;
  sig.selectAll += outcome.metrics.selectAll ?? 0;
  sig.nonsensePicks += outcome.metrics.nonsense ?? 0;
  sig.nonsenseShown += outcome.metrics.nonsenseShown ?? 0;
  if (outcome.abandoned) sig.abandons += 1;

  // 4) Calibración metacognitiva: predicción frente a resultado
  let predictionError: number | undefined;
  if (opts.prediction !== undefined && !outcome.abandoned) {
    if (game.predict === 'stars') {
      const actual = performanceBand(outcome.metrics.accuracy ?? 0);
      predictionError = Math.abs(opts.prediction - actual) / 2;
      outcome.metrics.predictedBand = opts.prediction;
      outcome.metrics.actualBand = actual;
    } else if (game.predict === 'ideas') {
      const actual = outcome.metrics.ideas ?? 0;
      predictionError = Math.min(1, Math.abs(opts.prediction - actual) / Math.max(4, actual, opts.prediction));
      outcome.metrics.predictedIdeas = opts.prediction;
    }
    if (predictionError !== undefined) {
      updateDimension(student, 'metacognicion', 1 - predictionError, 0.6);
      touched.add('metacognicion');
    }
  }

  for (const d of touched) student.dims[d].n += 1;

  // 5) Niveles: 2 logros seguidos suben, 1 fallo baja.
  // En juegos sin respuesta correcta, "logro" = mejorar su propia marca.
  const improved = !outcome.abandoned && (previousPlays === 0 || outcome.personalMetric > previousBest);
  // Abandonar no es fallar: no se saca conclusión de un abandono, así que el nivel no cambia.
  let effective: boolean | null = outcome.abandoned ? null : outcome.success;
  if (!outcome.abandoned && outcome.success === null && previousPlays > 0 && outcome.personalMetric > previousBest) effective = true;
  const updated = updateLevel(lvl, effective);
  updated.plays = previousPlays + 1;
  updated.best = Math.max(previousBest, outcome.personalMetric);
  student.levels[game.id] = updated;

  // 6) Estrellas visibles
  const stars = computeStars(outcome, previousBest, previousPlays);
  student.stars += stars;

  // 7) Evidencias
  for (const ev of outcome.evidence ?? []) student.evidence.push(ev);
  if (student.evidence.length > 12) student.evidence.splice(0, student.evidence.length - 12);

  const { evidence: _ev, ...rest } = outcome;
  void _ev;
  const record: PlayRecord = {
    gameId: game.id,
    date: Date.now(),
    level: outcome.level,
    phase: opts.phase,
    projectId: opts.projectId,
    outcome: rest,
    prediction: opts.prediction,
    predictionError,
    stars,
  };
  student.plays.push(record);
  if (student.plays.length > 300) student.plays.splice(0, student.plays.length - 300);

  return { stars, levelBefore, levelAfter: updated.level, improved, record };
}
