import type { PhaseId, ProjectState, Student } from './types';
import { planPhase, type Candidate } from './adaptation';
import { getTheme } from '../data/themes';
import { uid } from './storage';

// Aprendizaje Basado en Proyectos: los minijuegos son las FASES de un proyecto.
// Avanzar de fase depende de PARTICIPAR, no de acertar.

export function currentProject(student: Student): ProjectState | undefined {
  return student.projects.find((p) => p.id === student.currentProjectId && !p.finishedAt);
}

export function startProject(student: Student, themeId: string, candidates: Candidate[], rng: () => number): ProjectState {
  const p: ProjectState = {
    id: uid(),
    themeId,
    startedAt: Date.now(),
    phase: 1,
    played: {},
    plan: [],
    productItems: [],
  };
  p.plan = planPhase(student, 1, candidates, rng);
  student.projects.push(p);
  student.currentProjectId = p.id;
  student.favoriteThemes = [themeId, ...student.favoriteThemes.filter((t) => t !== themeId)].slice(0, 5);
  return p;
}

/** Registra que se ha jugado (o intentado) un juego de la fase y añade un objeto al producto. */
export function markPlayed(project: ProjectState, gameId: string, earnedItem: boolean): void {
  const list = project.played[project.phase] ?? [];
  list.push(gameId);
  project.played[project.phase] = list;
  const i = project.plan.indexOf(gameId);
  if (i >= 0) project.plan.splice(i, 1);
  if (earnedItem) {
    const items = getTheme(project.themeId).items;
    project.productItems.push(items[project.productItems.length % items.length]);
  }
}

/** Si la fase está completa, pasa a la siguiente y planifica sus juegos. Devuelve true si cambió. */
export function advanceIfDone(student: Student, project: ProjectState, candidates: Candidate[], rng: () => number): boolean {
  if (project.plan.length > 0 || project.finishedAt) return false;
  if (project.phase >= 5) {
    project.finishedAt = Date.now();
    if (student.currentProjectId === project.id) student.currentProjectId = undefined;
    return true;
  }
  project.phase = (project.phase + 1) as PhaseId;
  project.plan = project.phase === 5 ? ['reflexion'] : planPhase(student, project.phase, candidates, rng);
  // Si una fase no tuviera juegos, saltarla.
  if (project.plan.length === 0) return advanceIfDone(student, project, candidates, rng) || true;
  return true;
}

export function projectPlays(student: Student, projectId: string) {
  return student.plays.filter((p) => p.projectId === projectId);
}
