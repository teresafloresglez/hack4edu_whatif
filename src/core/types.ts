import type { L, Lang } from '../i18n';

// ─────────────────────────────────────────────────────────────
// WHAT IF? — Contrato de "huellas" entre los juegos y el motor
// de evaluación (apartado 2 y 4 del documento del proyecto).
// Cada juego SOLO produce un GameOutcome; el motor lo traduce a
// dimensiones del perfil. Así nadie pisa el trabajo de otro.
// ─────────────────────────────────────────────────────────────

/** Dimensiones internas del perfil. El niño nunca las ve. */
export type DimensionId =
  | 'atencion' // percepción visual, discriminar colores y formas
  | 'memoria' // memoria de trabajo visual
  | 'logica' // patrones y reglas
  | 'planificacion' // pensar antes de actuar, eficiencia en rutas
  | 'fluidez' // nº de ideas (Torrance)
  | 'flexibilidad' // variedad de categorías (Torrance)
  | 'originalidad' // rareza de las ideas frente a su región (Torrance)
  | 'elaboracion' // detalle (Torrance)
  | 'justicia' // sentido de la justicia en repartos
  | 'perspectiva' // ponerse en el lugar del otro (anticipar)
  | 'conflicto' // repertorio de estilos ante conflictos + explorar antes de decidir
  | 'autorregulacion' // persistencia, control del impulso, pedir ayuda cuando hace falta
  | 'metacognicion'; // calibración entre lo que predice y lo que hace

export type AreaId = 'concreto' | 'logico' | 'creatividad' | 'social' | 'autorregulacion';

export type ResponseKind = 'cerrada' | 'abierta' | 'decision' | 'proceso' | 'reflexion';

export type PhaseId = 1 | 2 | 3 | 4 | 5;

/** Una huella: una observación de una dimensión en una partida (0..1). */
export interface Observation {
  dim: DimensionId;
  value: number; // 0..1
  weight: number; // fiabilidad de la observación (0..1]
}

export type ConflictStyle = 'competir' | 'ceder' | 'compromiso' | 'evitar' | 'integrar';
export type ReciprocityStyle = 'castiga' | 'perdona' | 'copia';

/** Lo que devuelve cualquier minijuego al terminar. */
export interface GameOutcome {
  gameId: string;
  level: number;
  abandoned: boolean;
  /** true = logro (sube), false = fallo (baja), null = neutro (no cambia nivel). */
  success: boolean | null;
  /** Métrica principal para "mejorar su propia marca" (más = mejor). */
  personalMetric: number;
  observations: Observation[];
  /** Métricas crudas que se guardan para el informe del docente. */
  metrics: Record<string, number>;
  /** Datos categóricos (estilos de conflicto, ideas elegidas…). */
  tags?: {
    conflictStyles?: ConflictStyle[];
    reciprocity?: ReciprocityStyle[];
    ideaIds?: string[];
    promptId?: string;
    similarColorErrors?: number;
    otherErrors?: number;
    /** ¡Robi, eso no!: respuesta a cada razonamiento (para la IA adaptativa y el informe). */
    robi?: RobiAnswer[];
    /** ¡Robi, eso no!: por qué eligió la IA cada razonamiento de la partida. */
    robiPlan?: RobiDecision[];
  };
  /** Evidencias para el docente (dibujos, audios). */
  evidence?: Evidence[];
  durationMs: number;
}

export interface Evidence {
  kind: 'dibujo' | 'audio';
  /** Para dibujo: dataURL pequeño. Para audio: clave en IndexedDB. */
  ref: string;
  label: string;
  date: number;
}

export interface DimensionState {
  mean: number; // 0..1 media ponderada (con recencia)
  n: number; // nº de partidas que aportan a la dimensión
  weightSum: number;
  history: number[]; // últimos valores (máx. 12)
}

export interface GameLevelState {
  level: number;
  streak: number;
  plays: number;
  best: number; // mejor marca personal (personalMetric)
}

export interface PlayRecord {
  gameId: string;
  date: number;
  level: number;
  phase: PhaseId;
  projectId: string;
  outcome: Omit<GameOutcome, 'evidence'>;
  prediction?: number; // 1..3 estrellas o nº de ideas que predijo
  predictionError?: number; // 0..1
  stars: number;
}

export interface ProjectState {
  id: string;
  themeId: string;
  startedAt: number;
  finishedAt?: number;
  phase: PhaseId;
  /** juegos jugados en cada fase (ids) */
  played: Record<number, string[]>;
  /** juegos planificados para la fase actual */
  plan: string[];
  /** objetos del producto final ganados (emoji) */
  productItems: string[];
  reflection?: { hardestGame?: string; feeling?: number; change?: string; calibrated?: boolean };
}

export interface Student {
  id: string;
  name: string;
  avatar: string; // emoji
  color: string;
  age: number; // 6..10
  regionId: string;
  createdAt: number;
  stars: number;
  dims: Record<DimensionId, DimensionState>;
  levels: Record<string, GameLevelState>;
  plays: PlayRecord[];
  conflictStyles: Record<ConflictStyle, number>;
  reciprocity: Record<ReciprocityStyle, number>;
  evidence: Evidence[];
  projects: ProjectState[];
  currentProjectId?: string;
  favoriteThemes: string[];
  /** Superpoderes conseguidos (puntos fuertes que ve el niño, sin puntuaciones). */
  powers?: DimensionId[];
  /** contadores para señales de observación */
  signals: {
    similarColorErrors: number;
    otherColorErrors: number;
    colorTrials: number;
    abandons: number;
    fastErrors: number; // respuestas muy rápidas y erróneas
    slowResponses: number;
    responses: number;
    selectAll: number; // eligió casi todas las tarjetas
    hintsUsed: number;
    nonsensePicks: number; // usos sin sentido confirmados en Mil usos
    nonsenseShown: number; // usos sin sentido mostrados
  };
}

export interface Settings {
  teacherPin: string;
  defaultRegion: string;
  voiceRate: number;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  classProject?: string; // modo clase: tema común lanzado por el docente
  lang: Lang; // idioma de la app (es, en, fr)
}

export interface Culture {
  id: string;
  name: L;
  names: string[]; // nombres de personajes
  /** Fruta de La naranja: `the` lleva artículo determinado; `pron` es el pronombre de objeto. */
  fruit: { id: 'naranja' | 'mango' | 'platano'; emoji: string; the: L; pron: L };
  treats: { emoji: string; name: L }; // para El reparto (plural)
  /** Objetos cotidianos (Mil usos). `name` lleva artículo indeterminado. */
  objects: { id: string; emoji: string; name: L }[];
  food: string[];
  people: string[]; // emojis de personajes
}

export interface Theme {
  id: string;
  name: L;
  icon: string; // emoji de apoyo (el botón usa un dibujo SVG con el id del tema)
  question: L; // pregunta guía "What if?"
  product: L; // qué se construye ("tu parque")
  productBase: string; // fondo del producto (emoji grande)
  items: string[]; // objetos para juegos y producto final
  bg: string; // color de fondo
}

/** Contexto que recibe cada juego. */
export interface GameContext {
  root: HTMLElement;
  student: Student;
  level: number; // 1..5
  ageBand: 'young' | 'old'; // 6–7 / 8–10
  culture: Culture;
  theme: Theme;
  rng: () => number;
  say: (text: string) => Promise<void>;
  /** Sonidos de feedback (sin texto). */
  sfx: (kind: 'ok' | 'bad' | 'tap' | 'win') => void;
  /** Llama a esto si el niño pulsa "salir". */
  exitSignal: AbortSignal;
  /** Para pruebas automáticas: acelera temporizadores y animaciones. */
  fast?: boolean;
  /** Proyecto en curso (lo usa la fase de reflexión). */
  project?: ProjectState;
  /** Partidas del proyecto en curso. */
  projectPlays?: PlayRecord[];
  /** Nombre visible (ya traducido) de un juego por id. */
  gameName?: (id: string) => { name: string; icon: string };
}

export interface GameDef {
  id: string;
  name: L;
  icon: string; // emoji de apoyo; los botones usan el dibujo SVG con el id del juego
  phase: PhaseId;
  kind: ResponseKind;
  dims: DimensionId[];
  /** Qué tipo de predicción se pide antes (autoconocimiento). */
  predict: 'stars' | 'ideas' | 'none';
  /** Breve descripción para el docente. */
  teacherInfo: L;
  play: (ctx: GameContext) => Promise<GameOutcome>;
}

// ── ¡Robi, eso no! ──────────────────────────────────────────────────────
export type RobiFallacy = 'absurdo' | 'parecido' | 'falsaCausa' | 'generalizar' | 'alReves';
export type RobiType = RobiFallacy | 'ninguno';
export interface RobiAnswer { id: string; tipo: RobiType; acierto: boolean; conPista: boolean }
/** Una decisión de la IA adaptativa: qué tipo eligió y por qué. */
export interface RobiDecision { tipo: RobiType; motivo: 'correcto' | 'practicar' | 'explorar'; dominio: number; otroGusto: boolean }
