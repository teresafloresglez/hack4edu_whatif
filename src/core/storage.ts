import type { ConflictStyle, DimensionId, DimensionState, ReciprocityStyle, Settings, Student } from './types';
import { ALL_DIMS } from './dimensions';
import { isLang, tr } from '../i18n';
import { normalizeRegionId } from '../data/cultures';

// Todo se guarda en el propio dispositivo (sin conexión).
const KEY_STUDENTS = 'whatif.students.v1';
const KEY_SETTINGS = 'whatif.settings.v1';
const KEY_IDEAS = 'whatif.ideafreq.v1';

/** Almacén en memoria si localStorage no está disponible (modo privado, etc.). */
const memory = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    memory.set(key, value);
    return false;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = safeGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const DEFAULT_SETTINGS: Settings = {
  teacherPin: '1234',
  defaultRegion: 'america',
  voiceRate: 0.9,
  voiceEnabled: true,
  soundEnabled: true,
  lang: 'es',
};

export function loadSettings(): Settings {
  const s = { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(KEY_SETTINGS, {}) };
  if (!isLang(s.lang)) s.lang = 'es';
  s.defaultRegion = normalizeRegionId(s.defaultRegion);
  // Ajustes dañados: una velocidad no numérica deja al niño SIN VOZ (el navegador rechaza
  // la locución) y un PIN que no es texto de 4–6 cifras deja al docente fuera para siempre.
  const rate = Number(s.voiceRate);
  s.voiceRate = Number.isFinite(rate) ? Math.max(0.5, Math.min(2, rate)) : DEFAULT_SETTINGS.voiceRate;
  const pin = typeof s.teacherPin === 'number' ? String(s.teacherPin) : s.teacherPin;
  s.teacherPin = typeof pin === 'string' && /^\d{4,6}$/.test(pin) ? pin : DEFAULT_SETTINGS.teacherPin;
  if (typeof s.voiceEnabled !== 'boolean') s.voiceEnabled = DEFAULT_SETTINGS.voiceEnabled;
  if (typeof s.soundEnabled !== 'boolean') s.soundEnabled = DEFAULT_SETTINGS.soundEnabled;
  return s;
}

export function saveSettings(s: Settings): void {
  safeSet(KEY_SETTINGS, JSON.stringify(s));
}

export function emptyDims(): Record<DimensionId, DimensionState> {
  const out = {} as Record<DimensionId, DimensionState>;
  for (const d of ALL_DIMS) out[d] = { mean: 0.5, n: 0, weightSum: 0, history: [] };
  return out;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function newStudent(p: { name: string; avatar: string; color: string; age: number; regionId: string }): Student {
  return {
    id: uid(),
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    age: Math.min(10, Math.max(6, Math.round(p.age))),
    regionId: p.regionId,
    createdAt: Date.now(),
    stars: 0,
    dims: emptyDims(),
    levels: {},
    plays: [],
    conflictStyles: { competir: 0, ceder: 0, compromiso: 0, evitar: 0, integrar: 0 } as Record<ConflictStyle, number>,
    reciprocity: { castiga: 0, perdona: 0, copia: 0 } as Record<ReciprocityStyle, number>,
    evidence: [],
    projects: [],
    favoriteThemes: [],
    powers: [],
    signals: {
      similarColorErrors: 0,
      otherColorErrors: 0,
      colorTrials: 0,
      abandons: 0,
      fastErrors: 0,
      slowResponses: 0,
      responses: 0,
      selectAll: 0,
      hintsUsed: 0,
      nonsensePicks: 0,
      nonsenseShown: 0,
    },
  };
}

/** Repara datos antiguos o incompletos para que nunca rompan la app. */
export function normalizeStudent(s: Student): Student {
  const base = newStudent({ name: s.name ?? '', avatar: s.avatar ?? '🙂', color: s.color ?? '#888', age: s.age ?? 7, regionId: normalizeRegionId(s.regionId) });
  const out: Student = { ...base, ...s };
  out.regionId = normalizeRegionId(s.regionId);
  out.dims = emptyDims();
  for (const [d, st] of Object.entries(s.dims ?? {})) {
    if (!(d in out.dims) || !st || typeof st !== 'object') continue;
    const mean = Number(st.mean), n = Number(st.n), w = Number(st.weightSum);
    out.dims[d as DimensionId] = {
      mean: Number.isFinite(mean) ? Math.max(0, Math.min(1, mean)) : 0.5,
      n: Number.isFinite(n) && n >= 0 ? n : 0,
      weightSum: Number.isFinite(w) && w >= 0 ? w : 0,
      history: Array.isArray(st.history) ? st.history.filter((x) => Number.isFinite(x)) : [],
    };
  }
  out.signals = { ...base.signals, ...(s.signals ?? {}) };
  out.conflictStyles = { ...base.conflictStyles, ...(s.conflictStyles ?? {}) };
  out.reciprocity = { ...base.reciprocity, ...(s.reciprocity ?? {}) };
  out.levels = {};
  for (const [g, st] of Object.entries(s.levels ?? {})) {
    const level = Number(st?.level);
    if (!Number.isFinite(level)) continue;
    out.levels[g] = {
      level: Math.max(1, Math.min(5, Math.round(level))),
      streak: Number.isFinite(Number(st.streak)) ? Number(st.streak) : 0,
      plays: Number.isFinite(Number(st.plays)) ? Number(st.plays) : 0,
      best: Number.isFinite(Number(st.best)) ? Number(st.best) : 0,
    };
  }
  // Partidas dañadas (copias editadas a mano, versiones antiguas) romperían el informe docente.
  out.plays = Array.isArray(s.plays)
    ? s.plays.filter((p) => p && typeof p.gameId === 'string' && p.outcome && typeof p.outcome === 'object')
      .map((p) => ({ ...p, outcome: { ...p.outcome, metrics: p.outcome.metrics ?? {}, observations: Array.isArray(p.outcome.observations) ? p.outcome.observations : [] } }))
    : [];
  out.projects = Array.isArray(s.projects) ? s.projects.filter((p) => p && typeof p.id === 'string') : [];
  out.evidence = Array.isArray(s.evidence) ? s.evidence.filter((e) => e && typeof e.ref === 'string') : [];
  out.favoriteThemes = Array.isArray(s.favoriteThemes) ? s.favoriteThemes : [];
  out.powers = Array.isArray(s.powers) ? s.powers.filter((d) => d in out.dims) : [];
  return out;
}

export function loadStudents(): Student[] {
  const list = readJSON<Student[]>(KEY_STUDENTS, []);
  if (!Array.isArray(list)) return [];
  return list.filter((s) => s && typeof s.id === 'string').map(normalizeStudent);
}

/** Recorta datos voluminosos si el almacenamiento se llena. */
function compact(list: Student[]): Student[] {
  return list.map((s) => ({
    ...s,
    plays: s.plays.slice(-150),
    evidence: s.evidence.slice(-12),
  }));
}

export function saveStudents(list: Student[]): void {
  const ok = safeSet(KEY_STUDENTS, JSON.stringify(list));
  if (!ok) {
    // Probablemente cuota excedida: compactar y reintentar.
    safeSet(KEY_STUDENTS, JSON.stringify(compact(list)));
  }
}

export function saveStudent(s: Student): void {
  const list = loadStudents();
  const i = list.findIndex((x) => x.id === s.id);
  if (i >= 0) list[i] = s;
  else list.push(s);
  saveStudents(list);
}

export function deleteStudent(id: string): void {
  const all = loadStudents();
  const gone = all.find((s) => s.id === id);
  saveStudents(all.filter((s) => s.id !== id));
  // También sus grabaciones de voz (viven aparte, en IndexedDB).
  for (const e of gone?.evidence ?? []) if (e.kind === 'audio') void deleteAudio(e.ref);
}

// ── Frecuencias de ideas por región (para la originalidad) ──────────────
export interface IdeaFreqStore {
  [regionPrompt: string]: { players: number; counts: Record<string, number> };
}

export function loadIdeaFreq(): IdeaFreqStore {
  return readJSON<IdeaFreqStore>(KEY_IDEAS, {});
}

export function recordIdeas(regionId: string, promptId: string, ideaIds: string[]): void {
  const store = loadIdeaFreq();
  const key = `${regionId}:${promptId}`;
  const entry = store[key] ?? { players: 0, counts: {} };
  entry.players += 1;
  for (const id of new Set(ideaIds)) entry.counts[id] = (entry.counts[id] ?? 0) + 1;
  store[key] = entry;
  safeSet(KEY_IDEAS, JSON.stringify(store));
}

// ── Exportar / importar copia de seguridad ──────────────────────────────
export function exportAll(): string {
  return JSON.stringify(
    { app: 'what-if', version: 1, exportedAt: new Date().toISOString(), settings: loadSettings(), students: loadStudents(), ideas: loadIdeaFreq() },
    null,
    1,
  );
}

export function importAll(json: string): number {
  const data = JSON.parse(json);
  if (!data || data.app !== 'what-if' || !Array.isArray(data.students)) throw new Error(tr({ es: 'Archivo no válido', en: 'Invalid file', fr: 'Fichier non valide' }));
  const current = loadStudents();
  const byId = new Map(current.map((s) => [s.id, s]));
  for (const s of data.students as Student[]) if (s && s.id) byId.set(s.id, normalizeStudent(s));
  saveStudents([...byId.values()]);
  if (data.ideas && typeof data.ideas === 'object') {
    const store = loadIdeaFreq();
    for (const [k, v] of Object.entries(data.ideas as IdeaFreqStore)) {
      if (!store[k]) store[k] = v;
    }
    safeSet(KEY_IDEAS, JSON.stringify(store));
  }
  return data.students.length;
}

// ── Audio de ideas (IndexedDB) ──────────────────────────────────────────
const DB_NAME = 'whatif-audio';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sin IndexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('clips');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudio(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite');
    tx.objectStore('clips').put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAudio(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction('clips', 'readonly');
      const req = tx.objectStore('clips').get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteAudio(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('clips', 'readwrite');
      tx.objectStore('clips').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* sin IndexedDB: no hay nada que borrar */
  }
}
