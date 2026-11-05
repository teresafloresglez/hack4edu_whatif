import { describe, it, expect, beforeEach } from 'vitest';
import { updateLevel, entryLevel, planPhase, weakDims, scoreCandidates } from '../src/core/adaptation';
import { applyOutcome, normalizedEntropy, computeStars, updateDimension, performanceBand } from '../src/core/evaluation';
import { newStudent, loadStudents, saveStudent, exportAll, importAll, recordIdeas, normalizeStudent } from '../src/core/storage';
import { buildReport } from '../src/core/report';
import { makeRng } from '../src/core/rng';
import { GAME_BY_ID } from '../src/games/registry';
import { CANDIDATES } from '../src/ui/session';
import { scoreIdeas, ideaFrequency } from '../src/games/ideas';
import { WHAT_IF_PROMPTS } from '../src/data/ideas';
import { buildMap, shortestPath } from '../src/games/camino';
import { buildPattern } from '../src/games/patrones';
import { buildTrial } from '../src/games/colores';
import { fairnessValue, reciprocityOf } from '../src/games/reparto';
import { memoryScore } from '../src/games/memoria';
import { hardestGame } from '../src/games/reflexion';
import type { GameOutcome } from '../src/core/types';

beforeEach(() => localStorage.clear());

const student = (age = 8) => newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age, regionId: 'america' });

function outcome(gameId: string, p: Partial<GameOutcome> = {}): GameOutcome {
  return { gameId, level: 1, abandoned: false, success: true, personalMetric: 1, observations: [], metrics: {}, durationMs: 1000, ...p };
}

describe('niveles: 2 logros suben, 1 fallo baja', () => {
  it('sube tras dos logros seguidos', () => {
    let s = { level: 2, streak: 0, plays: 0, best: 0 };
    s = updateLevel(s, true);
    expect(s.level).toBe(2);
    s = updateLevel(s, true);
    expect(s.level).toBe(3);
    expect(s.streak).toBe(0);
  });
  it('baja tras un fallo y reinicia la racha', () => {
    let s = { level: 3, streak: 1, plays: 0, best: 0 };
    s = updateLevel(s, false);
    expect(s.level).toBe(2);
    expect(s.streak).toBe(0);
  });
  it('neutro no cambia', () => {
    expect(updateLevel({ level: 3, streak: 1, plays: 0, best: 0 }, null)).toMatchObject({ level: 3, streak: 1 });
  });
  it('respeta los límites 1..5', () => {
    expect(updateLevel({ level: 1, streak: 0, plays: 0, best: 0 }, false).level).toBe(1);
    expect(updateLevel({ level: 5, streak: 1, plays: 0, best: 0 }, true).level).toBe(5);
  });
  it('nivel de entrada por edad', () => {
    expect(entryLevel(6)).toBe(1);
    expect(entryLevel(7)).toBe(1);
    expect(entryLevel(8)).toBe(2);
    expect(entryLevel(10)).toBe(3);
  });
});

describe('evaluación', () => {
  it('primera observación fija la media; las siguientes la mueven', () => {
    const s = student();
    updateDimension(s, 'logica', 0.9, 1);
    expect(s.dims.logica.mean).toBeCloseTo(0.9);
    updateDimension(s, 'logica', 0.1, 1);
    expect(s.dims.logica.mean).toBeLessThan(0.9);
    expect(s.dims.logica.mean).toBeGreaterThan(0.1);
  });
  it('valores no finitos no rompen el perfil', () => {
    const s = student();
    updateDimension(s, 'logica', NaN, 1);
    expect(Number.isFinite(s.dims.logica.mean)).toBe(true);
  });
  it('entropía normalizada', () => {
    expect(normalizedEntropy([5, 0, 0])).toBe(0);
    expect(normalizedEntropy([1, 1, 1])).toBeCloseTo(1);
    expect(normalizedEntropy([0, 0])).toBe(0);
  });
  it('estrellas: participar + intentarlo + mejorar la marca', () => {
    expect(computeStars(outcome('x', { personalMetric: 5 }), 3, 2)).toBe(3);
    expect(computeStars(outcome('x', { personalMetric: 2 }), 3, 2)).toBe(2);
    expect(computeStars(outcome('x', { abandoned: true }), 3, 2)).toBe(1);
  });
  it('applyOutcome actualiza dimensiones, nivel, estrellas y registro', () => {
    const s = student(8);
    const g = GAME_BY_ID['colores'];
    const o = outcome('colores', { level: 2, observations: [{ dim: 'atencion', value: 0.8, weight: 1 }], metrics: { accuracy: 0.9, responses: 6, colorTrials: 6 } });
    const r = applyOutcome(s, g, o, { phase: 1, projectId: 'p', prediction: 3 });
    expect(s.dims.atencion.n).toBe(1);
    expect(s.dims.metacognicion.n).toBe(1); // predijo 3 y sacó banda 3
    expect(s.dims.metacognicion.mean).toBeCloseTo(1);
    expect(r.stars).toBe(3);
    expect(s.plays).toHaveLength(1);
    expect(s.signals.colorTrials).toBe(6);
  });
  it('juegos abiertos: mejorar la marca cuenta como logro para subir de nivel', () => {
    const s = student(8);
    const g = GAME_BY_ID['quepasaria'];
    applyOutcome(s, g, outcome('quepasaria', { level: 2, success: null, personalMetric: 2 }), { phase: 3, projectId: 'p' });
    applyOutcome(s, g, outcome('quepasaria', { level: 2, success: null, personalMetric: 3 }), { phase: 3, projectId: 'p' });
    applyOutcome(s, g, outcome('quepasaria', { level: 2, success: null, personalMetric: 4 }), { phase: 3, projectId: 'p' });
    expect(s.levels['quepasaria'].level).toBe(3);
  });
  it('repertorio de conflictos: más variedad, más puntuación', () => {
    const a = student(), b = student();
    const g = GAME_BY_ID['naranja'];
    for (let i = 0; i < 3; i++) applyOutcome(a, g, outcome('naranja', { success: null, tags: { conflictStyles: ['competir', 'competir'] } }), { phase: 4, projectId: 'p' });
    for (let i = 0; i < 3; i++) applyOutcome(b, g, outcome('naranja', { success: null, tags: { conflictStyles: ['integrar', 'compromiso'] } }), { phase: 4, projectId: 'p' });
    expect(b.dims.conflicto.mean).toBeGreaterThan(a.dims.conflicto.mean);
  });
  it('banda de rendimiento', () => {
    expect(performanceBand(0.9)).toBe(3);
    expect(performanceBand(0.6)).toBe(2);
    expect(performanceBand(0.1)).toBe(1);
  });
});

describe('adaptación (selección de juegos)', () => {
  it('niños pequeños: 1 juego por fase; mayores: 2', () => {
    expect(planPhase(student(6), 1, CANDIDATES, makeRng(1))).toHaveLength(1);
    expect(planPhase(student(9), 1, CANDIDATES, makeRng(1))).toHaveLength(2);
  });
  it('si hay un área débil se añade repetición de ese juego', () => {
    const s = student(9);
    s.dims.memoria = { mean: 0.15, n: 3, weightSum: 3, history: [0.1, 0.2, 0.15] };
    expect(weakDims(s)).toContain('memoria');
    const plan = planPhase(s, 1, CANDIDATES, makeRng(1));
    expect(plan).toHaveLength(3);
    expect(plan.filter((g) => g === 'memoria').length).toBeGreaterThanOrEqual(1);
  });
  it('prioriza los juegos que trabajan lo débil', () => {
    const s = student(9);
    s.dims.logica = { mean: 0.1, n: 4, weightSum: 4, history: [] };
    s.dims.planificacion = { mean: 0.9, n: 4, weightSum: 4, history: [] };
    s.levels.patrones = { level: 2, streak: 0, plays: 3, best: 1 };
    s.levels.camino = { level: 2, streak: 0, plays: 3, best: 1 };
    const sc = scoreCandidates(s, CANDIDATES.filter((c) => c.phase === 2), () => 0.5);
    const pat = sc.find((x) => x.id === 'patrones')!, cam = sc.find((x) => x.id === 'camino')!;
    expect(pat.score).toBeGreaterThan(cam.score);
    expect(pat.reason).toBe('reforzar');
  });
});

describe('lógica de los juegos', () => {
  it('El camino siempre tiene solución', () => {
    for (let lv = 1; lv <= 5; lv++) {
      for (let seed = 0; seed < 40; seed++) {
        const m = buildMap(lv, makeRng(seed));
        expect(shortestPath(m)).not.toBeNull();
      }
    }
  });
  it('Patrones: la respuesta está entre las opciones y no hay duplicados', () => {
    for (let lv = 1; lv <= 5; lv++) {
      for (let seed = 0; seed < 40; seed++) {
        const t = buildPattern(lv, ['🌳', '🌻', '🛝', '⛲', '🐦'], makeRng(seed));
        const keys = t.options.map((o) => JSON.stringify(o));
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).toContain(JSON.stringify(t.answer));
        expect(t.shown.filter((x) => x === null)).toHaveLength(1);
      }
    }
  });
  it('Colores: exactamente una opción igual al modelo', () => {
    for (let lv = 1; lv <= 5; lv++) {
      for (let seed = 0; seed < 40; seed++) {
        const { target, options } = buildTrial(lv, makeRng(seed));
        expect(options.filter((o) => o.shape === target.shape && o.color === target.color)).toHaveLength(1);
      }
    }
  });
  it('Ideas: más ideas y más variadas → más fluidez y flexibilidad', () => {
    const cards = WHAT_IF_PROMPTS[0].cards;
    const few = scoreIdeas(cards.slice(0, 1), 0, 10, 'america', 'lluvia', 4);
    const many = scoreIdeas(cards.slice(0, 5), 0, 10, 'america', 'lluvia', 4);
    expect(many.fluency).toBeGreaterThan(few.fluency);
    expect(many.categories).toBeGreaterThan(few.categories);
    expect(scoreIdeas(cards, 0, 10, 'america', 'lluvia', 4).selectAll).toBe(true);
    expect(scoreIdeas([], 0, 10, 'america', 'lluvia', 4).fluency).toBe(0);
  });
  it('Originalidad: se calcula con la frecuencia de SU región', () => {
    const card = WHAT_IF_PROMPTS[0].cards.find((c) => c.id === 'lluvia_agua')!;
    // Prior distinto por región
    expect(ideaFrequency(card, 'africa', 'lluvia')).toBeGreaterThan(ideaFrequency(card, 'america', 'lluvia'));
    const before = ideaFrequency(card, 'america', 'lluvia');
    for (let i = 0; i < 10; i++) recordIdeas('america', 'lluvia', ['lluvia_agua']);
    expect(ideaFrequency(card, 'america', 'lluvia')).toBeGreaterThan(before);
    // Otra región no se ve afectada
    expect(ideaFrequency(card, 'asia', 'lluvia')).toBeCloseTo(card.f);
  });
  it('Reparto: justicia y reciprocidad', () => {
    expect(fairnessValue(0.5)).toBe(1);
    expect(fairnessValue(0)).toBe(0);
    expect(fairnessValue(1)).toBeGreaterThanOrEqual(0.6);
    expect(reciprocityOf(0.5, 0.1, 0.1)).toBe('copia');
    expect(reciprocityOf(0.5, 0.3, 0.1)).toBe('castiga');
    expect(reciprocityOf(0.5, 0.5, 0.1)).toBe('perdona');
  });
  it('Memoria: jugar perfecto puntúa más que jugar al azar', () => {
    expect(memoryScore(4, 4, 0, 2)).toBeGreaterThan(memoryScore(4, 14, 5, 6));
  });
});

describe('informe docente', () => {
  it('sin datos: no saca conclusiones', () => {
    const r = buildReport(student());
    expect(r.strengths).toHaveLength(0);
    expect(r.growth).toHaveLength(0);
    expect(r.signals).toHaveLength(0);
    expect(r.enoughData).toBe(false);
    expect(r.dims.every((d) => d.status === 'sin_datos')).toBe(true);
  });
  it('detecta fortalezas, áreas en crecimiento y señales de observación', () => {
    const s = student();
    s.dims.originalidad = { mean: 0.9, n: 4, weightSum: 4, history: [0.8, 0.9, 0.9, 1] };
    s.dims.memoria = { mean: 0.2, n: 4, weightSum: 4, history: [] };
    s.dims.atencion = { mean: 0.25, n: 4, weightSum: 4, history: [] };
    s.signals = { ...s.signals, colorTrials: 20, similarColorErrors: 6, otherColorErrors: 1 };
    const r = buildReport(s);
    expect(r.strengths.map((d) => d.id)).toContain('originalidad');
    expect(r.growth.map((d) => d.id)).toContain('memoria');
    expect(r.signals.map((x) => x.id)).toEqual(expect.arrayContaining(['color', 'visual']));
    expect(r.recommendations.length).toBeGreaterThan(0);
    // Lenguaje de observación, nunca diagnóstico
    for (const sg of r.signals) expect(`${sg.text} ${sg.suggestion}`.toLowerCase()).not.toMatch(/tdah|dislexia|autis|discapacidad|daltoni|trastorno/);
  });
  it('El juego más difícil del proyecto se identifica para la calibración', () => {
    const s = student();
    applyOutcome(s, GAME_BY_ID['colores'], outcome('colores', { observations: [{ dim: 'atencion', value: 0.9, weight: 1 }] }), { phase: 1, projectId: 'p' });
    applyOutcome(s, GAME_BY_ID['memoria'], outcome('memoria', { observations: [{ dim: 'memoria', value: 0.2, weight: 1 }] }), { phase: 1, projectId: 'p' });
    expect(hardestGame(s.plays)).toBe('memoria');
  });
});

describe('almacenamiento offline', () => {
  it('guarda y recupera alumnos', () => {
    const s = student();
    saveStudent(s);
    expect(loadStudents()[0].id).toBe(s.id);
  });
  it('tolera datos corruptos', () => {
    localStorage.setItem('whatif.students.v1', '{no es json');
    expect(loadStudents()).toEqual([]);
    localStorage.setItem('whatif.students.v1', JSON.stringify([{ id: 'x', name: 'Viejo' }, null, 3]));
    const list = loadStudents();
    expect(list).toHaveLength(1);
    expect(list[0].dims.logica.mean).toBe(0.5);
    expect(() => buildReport(list[0])).not.toThrow();
  });
  it('exporta e importa una copia', () => {
    saveStudent(student());
    const json = exportAll();
    localStorage.clear();
    expect(importAll(json)).toBe(1);
    expect(loadStudents()).toHaveLength(1);
    expect(() => importAll('{"app":"otra"}')).toThrow();
  });
  it('normaliza edad fuera de rango', () => {
    expect(newStudent({ name: '', avatar: '', color: '', age: 15, regionId: 'x' }).age).toBe(10);
    expect(normalizeStudent({ id: 'a' } as never).plays).toEqual([]);
  });
});
