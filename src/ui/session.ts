import type { DimensionId, GameDef, GameOutcome, PhaseId, Settings, Student } from '../core/types';
import { syncPowers } from '../core/superpowers';
import { ageBand, levelFor } from '../core/adaptation';
import { applyOutcome, type ApplyResult } from '../core/evaluation';
import { currentProject, markPlayed, advanceIfDone, projectPlays } from '../core/project';
import { recordIdeas, saveStudent } from '../core/storage';
import { makeRng } from '../core/rng';
import { say, sfx } from '../core/voice';
import { getCulture } from '../data/cultures';
import { getTheme } from '../data/themes';
import { GAMES, GAME_BY_ID, gameName } from '../games/registry';

// Ejecuta UNA partida de principio a fin: contexto → juego → evaluación → guardado.
// Separado de la interfaz para poder probarlo automáticamente.

export const CANDIDATES = GAMES.filter((g) => g.id !== 'reflexion').map((g) => ({ id: g.id, phase: g.phase, dims: g.dims }));

/**
 * Repara un proyecto guardado que no se podría continuar (datos antiguos o
 * importados: juegos que ya no existen, fase fuera de rango, plan vacío).
 * Devuelve true si cambió algo. El proyecto nunca debe quedarse bloqueado.
 */
export function repairProject(student: Student): boolean {
  const project = currentProject(student);
  if (!project) return false;
  let changed = false;
  if (!Array.isArray(project.plan)) {
    project.plan = [];
    changed = true;
  }
  if (!project.played || typeof project.played !== 'object') {
    project.played = {};
    changed = true;
  }
  if (!Array.isArray(project.productItems)) {
    project.productItems = [];
    changed = true;
  }
  if (!(project.phase >= 1 && project.phase <= 5) || !Number.isInteger(project.phase)) {
    project.phase = Math.min(5, Math.max(1, Math.round(Number(project.phase) || 1))) as PhaseId;
    changed = true;
  }
  const valid = project.plan.filter((id) => !!GAME_BY_ID[id]);
  if (valid.length !== project.plan.length) {
    project.plan = valid;
    changed = true;
  }
  if (project.plan.length === 0) {
    if (project.phase === 5) project.plan = ['reflexion'];
    else advanceIfDone(student, project, CANDIDATES, makeRng());
    changed = true;
  }
  return changed;
}

export interface RunResult {
  outcome: GameOutcome;
  applied: ApplyResult;
  earnedItem: string | null;
  phaseChanged: boolean;
  projectFinished: boolean;
  /** Superpoderes conseguidos en esta partida (para celebrarlos). */
  newPowers: DimensionId[];
}

export async function runGame(opts: {
  student: Student;
  game: GameDef;
  root: HTMLElement;
  exitSignal: AbortSignal;
  prediction?: number;
  settings?: Settings;
  fast?: boolean;
  seed?: number;
  sayFn?: (t: string) => Promise<void>;
}): Promise<RunResult> {
  const { student, game } = opts;
  const project = currentProject(student);
  const inProject = !!project && (project.plan.includes(game.id) || game.id === 'reflexion');
  const theme = getTheme(project?.themeId ?? student.favoriteThemes[0] ?? 'parque');
  const rng = makeRng(opts.seed ?? Date.now());
  const level = levelFor(student, game.id);
  // La voz nunca debe retrasar la salida (🏠): si el niño sale, la espera termina ya.
  const baseSay = opts.sayFn ?? say;
  const signal = opts.exitSignal;
  const sayUntilExit = (t: string): Promise<void> =>
    signal.aborted
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          const onAbort = () => resolve();
          signal.addEventListener('abort', onAbort, { once: true });
          baseSay(t).then(resolve, resolve).finally(() => signal.removeEventListener('abort', onAbort));
        });

  const outcome = await game.play({
    root: opts.root,
    student,
    level,
    ageBand: ageBand(student.age),
    culture: getCulture(student.regionId),
    theme,
    rng,
    say: sayUntilExit,
    sfx,
    exitSignal: opts.exitSignal,
    fast: opts.fast,
    project,
    projectPlays: project ? projectPlays(student, project.id) : [],
    gameName,
  });

  const phase: PhaseId = inProject && project ? project.phase : game.phase;
  const applied = applyOutcome(student, game, outcome, { phase, projectId: inProject && project ? project.id : 'libre', prediction: opts.prediction });
  const newPowers = syncPowers(student);

  // Originalidad: alimentar las frecuencias de la región con las ideas de este niño.
  if (!outcome.abandoned && outcome.tags?.promptId && outcome.tags.ideaIds) {
    recordIdeas(student.regionId, outcome.tags.promptId, outcome.tags.ideaIds);
  }

  let earnedItem: string | null = null;
  let phaseChanged = false;
  let projectFinished = false;
  if (inProject && project) {
    // Participar (no acertar) hace avanzar. Si abandona dos veces el mismo juego, también cuenta.
    const abandonsHere = student.plays.filter((p) => p.projectId === project.id && p.gameId === game.id && p.outcome.abandoned).length;
    const participated = !outcome.abandoned || abandonsHere >= 2;
    if (participated) {
      const before = project.productItems.length;
      markPlayed(project, game.id, !outcome.abandoned && game.id !== 'reflexion');
      if (project.productItems.length > before) earnedItem = project.productItems[project.productItems.length - 1];
      phaseChanged = advanceIfDone(student, project, CANDIDATES, rng);
      projectFinished = !!project.finishedAt;
    }
  }
  saveStudent(student);
  return { outcome, applied, earnedItem, phaseChanged, projectFinished, newPowers };
}
