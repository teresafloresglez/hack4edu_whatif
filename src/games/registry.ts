import type { GameDef, PhaseId } from '../core/types';
import { tr, type L } from '../i18n';
import type { IconName } from '../ui/icons';
import { coloresGame } from './colores';
import { memoriaGame } from './memoria';
import { patronesGame } from './patrones';
import { robiGame } from './robi';
import { caminoGame } from './camino';
import { quePasariaGame, milUsosGame } from './ideas';
import { garabatoGame } from './garabato';
import { naranjaGame } from './naranja';
import { repartoGame } from './reparto';
import { reflexionGame } from './reflexion';

export const GAMES: GameDef[] = [
  coloresGame,
  memoriaGame,
  patronesGame,
  robiGame,
  caminoGame,
  quePasariaGame,
  milUsosGame,
  garabatoGame,
  naranjaGame,
  repartoGame,
  reflexionGame,
];

export const GAME_BY_ID: Record<string, GameDef> = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export const PHASES: { id: PhaseId; name: L; icon: IconName; thinking: L }[] = [
  { id: 1, name: { es: 'Investigar', en: 'Explore', fr: 'Enquêter' }, icon: 'investigar', thinking: { es: 'Concreto', en: 'Concrete', fr: 'Concret' } },
  { id: 2, name: { es: 'Planificar', en: 'Plan', fr: 'Planifier' }, icon: 'planificar', thinking: { es: 'Lógico', en: 'Logical', fr: 'Logique' } },
  { id: 3, name: { es: 'Idear', en: 'Imagine', fr: 'Imaginer' }, icon: 'idear', thinking: { es: 'Divergente', en: 'Divergent', fr: 'Divergent' } },
  { id: 4, name: { es: 'Acordar', en: 'Agree', fr: "Se mettre d'accord" }, icon: 'acordar', thinking: { es: 'Social y estratégico', en: 'Social and strategic', fr: 'Social et stratégique' } },
  { id: 5, name: { es: 'Presentar', en: 'Present', fr: 'Présenter' }, icon: 'presentar', thinking: { es: 'Metacognitivo', en: 'Metacognitive', fr: 'Métacognitif' } },
];

/** Nombre del juego en el idioma actual. */
export function gameName(id: string): { name: string; icon: string } {
  const g = GAME_BY_ID[id];
  return g ? { name: tr(g.name), icon: g.icon } : { name: id, icon: '🎮' };
}
