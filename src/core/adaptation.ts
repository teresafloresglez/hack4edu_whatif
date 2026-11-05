import type { DimensionId, GameLevelState, PhaseId, Student } from './types';

// Adaptación por reglas y estadística sencilla (sin IA pesada):
//  · Dentro de cada juego: 2 logros seguidos suben un nivel, 1 fallo baja uno.
//  · Entre juegos: un "selector" puntúa cada juego candidato según lo que
//    el perfil necesita trabajar, lo poco que sabemos aún y lo que se le da bien.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

/** Nivel de entrada según la edad (6–7 más bajo, 9–10 más alto). */
export function entryLevel(age: number): number {
  if (age <= 7) return 1;
  if (age === 8) return 2;
  return 3;
}

export function ageBand(age: number): 'young' | 'old' {
  return age <= 7 ? 'young' : 'old';
}

export function levelFor(student: Student, gameId: string): number {
  return student.levels[gameId]?.level ?? entryLevel(student.age);
}

/** success: true = logro, false = fallo, null = neutro (no cambia). */
export function updateLevel(state: GameLevelState, success: boolean | null): GameLevelState {
  const s = { ...state };
  if (success === true) {
    s.streak += 1;
    if (s.streak >= 2) {
      s.level = Math.min(MAX_LEVEL, s.level + 1);
      s.streak = 0;
    }
  } else if (success === false) {
    s.level = Math.max(MIN_LEVEL, s.level - 1);
    s.streak = 0;
  }
  return s;
}

export interface Candidate {
  id: string;
  phase: PhaseId;
  dims: DimensionId[];
}

export const WEAK_THRESHOLD = 0.4;
export const STRONG_THRESHOLD = 0.7;

/** Dimensiones débiles con datos suficientes (nunca concluimos con una sola partida). */
export function weakDims(student: Student): DimensionId[] {
  return (Object.keys(student.dims) as DimensionId[]).filter((d) => {
    const st = student.dims[d];
    return st.n >= 2 && st.mean < WEAK_THRESHOLD;
  });
}

export function strongDims(student: Student): DimensionId[] {
  return (Object.keys(student.dims) as DimensionId[]).filter((d) => {
    const st = student.dims[d];
    return st.n >= 2 && st.mean >= STRONG_THRESHOLD;
  });
}

export interface ScoredCandidate {
  id: string;
  score: number;
  reason: 'reforzar' | 'explorar' | 'potenciar' | 'variar';
}

/** Puntúa los juegos candidatos. Explicable y determinista salvo un pequeño ruido. */
export function scoreCandidates(student: Student, candidates: Candidate[], rng: () => number): ScoredCandidate[] {
  const recent = student.plays.slice(-6).map((p) => p.gameId);
  return candidates.map((c) => {
    const states = c.dims.map((d) => student.dims[d]).filter(Boolean);
    const known = states.filter((s) => s.n > 0);
    const need = known.length ? known.reduce((a, s) => a + (1 - s.mean), 0) / known.length : 0.5;
    const strength = known.length ? known.reduce((a, s) => a + s.mean, 0) / known.length : 0.5;
    const plays = student.levels[c.id]?.plays ?? 0;
    const uncertainty = 1 / Math.sqrt(plays + 1);
    const recencyPenalty = recent.filter((g) => g === c.id).length * 0.08;
    const score = 0.45 * need + 0.3 * uncertainty + 0.15 * strength + 0.1 * rng() - recencyPenalty;
    let reason: ScoredCandidate['reason'] = 'variar';
    if (plays === 0) reason = 'explorar';
    else if (need >= 1 - WEAK_THRESHOLD) reason = 'reforzar';
    else if (strength >= STRONG_THRESHOLD) reason = 'potenciar';
    return { id: c.id, score, reason };
  });
}

/**
 * Elige los juegos de una fase del proyecto.
 * - Niños de 6–7: proyectos más cortos (1 juego por fase).
 * - Niños de 8–10: 2 juegos por fase.
 * - Si hay una dimensión débil que se trabaja en esta fase, se añade
 *   una ronda extra de ese juego (repetición para mejorar).
 */
export function planPhase(student: Student, phase: PhaseId, all: Candidate[], rng: () => number): string[] {
  const candidates = all.filter((c) => c.phase === phase);
  if (candidates.length === 0) return [];
  const base = ageBand(student.age) === 'young' ? 1 : 2;
  const count = Math.min(base, candidates.length);
  const ranked = scoreCandidates(student, candidates, rng).sort((a, b) => b.score - a.score);
  const plan = ranked.slice(0, count).map((r) => r.id);

  const weak = new Set(weakDims(student));
  const reinforce = ranked.find((r) => {
    const c = candidates.find((x) => x.id === r.id)!;
    return c.dims.some((d) => weak.has(d));
  });
  if (reinforce) plan.push(reinforce.id);
  return plan;
}

/** Recomendación de práctica libre (fuera del proyecto): el juego que más lo necesita. */
export function suggestPractice(student: Student, all: Candidate[], rng: () => number): string | null {
  const ranked = scoreCandidates(student, all, rng).sort((a, b) => b.score - a.score);
  return ranked[0]?.id ?? null;
}
