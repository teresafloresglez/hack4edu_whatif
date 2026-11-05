import type { DimensionId, Student } from './types';
import { STRONG_THRESHOLD } from './adaptation';
import { MIN_EVIDENCE } from './report';
import { ALL_DIMS } from './dimensions';
import S from '../contenido/superpoderes.json';

// Superpoderes: los puntos fuertes del niño contados como superpoderes para
// motivarle (efecto Pigmalión). El niño NUNCA ve puntuaciones: solo qué
// superpoderes tiene. Se ganan con lo que va logrando (una dimensión que
// llega a punto fuerte con al menos 2 partidas) y, una vez ganados, se
// conservan aunque una partida salga peor.

export type PowerInfo = (typeof S.powers)[keyof typeof S.powers];

export function powerInfo(id: DimensionId): PowerInfo {
  return S.powers[id];
}

/** Dimensiones que ahora mismo cumplen la regla de punto fuerte. */
export function strongNow(student: Student): DimensionId[] {
  return ALL_DIMS.filter((d) => {
    const st = student.dims[d];
    return st && st.n >= MIN_EVIDENCE && st.mean >= STRONG_THRESHOLD;
  });
}

/** Superpoderes conseguidos (guardados), en el orden de las dimensiones. */
export function earnedPowers(student: Student): DimensionId[] {
  const set = new Set(student.powers ?? []);
  return ALL_DIMS.filter((d) => set.has(d));
}

/** Añade los superpoderes recién conseguidos y los devuelve (para celebrarlos). */
export function syncPowers(student: Student): DimensionId[] {
  const have = new Set(student.powers ?? []);
  const fresh = strongNow(student).filter((d) => !have.has(d));
  if (fresh.length) student.powers = [...have, ...fresh];
  return fresh;
}
