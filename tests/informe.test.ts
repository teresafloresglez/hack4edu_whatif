import { describe, it, expect, beforeEach } from 'vitest';
import { newStudent } from '../src/core/storage';
import { buildReport } from '../src/core/report';
import { setLang } from '../src/i18n';
import { reportView, isDemoProfile } from '../src/ui/informe';
import type { Student } from '../src/core/types';

// Informe del docente: estructura, criterios, «En qué se apoya» y nota final.

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  setLang('es');
});

export function sample(name = 'Lucía'): Student {
  const s = newStudent({ name, avatar: '🦊', color: '#f6bd60', age: 8, regionId: 'america' });
  s.dims.originalidad = { mean: 0.86, n: 4, weightSum: 4, history: [0.6, 0.7, 0.9, 0.95] };
  s.dims.fluidez = { mean: 0.74, n: 3, weightSum: 3, history: [0.7, 0.75, 0.8] };
  s.dims.planificacion = { mean: 0.32, n: 3, weightSum: 3, history: [0.5, 0.4, 0.2, 0.2] };
  s.dims.memoria = { mean: 0.55, n: 1, weightSum: 1, history: [0.55] };
  s.conflictStyles = { ...s.conflictStyles, integrar: 2, ceder: 1 };
  s.reciprocity = { ...s.reciprocity, perdona: 3 };
  const base = { level: 2, phase: 3 as const, projectId: 'p', stars: 3 };
  for (let i = 0; i < 8; i++) {
    s.plays.push({ ...base, gameId: i % 2 ? 'camino' : 'quepasaria', date: Date.UTC(2026, 9, 1 + i), outcome: {
      gameId: i % 2 ? 'camino' : 'quepasaria', level: 2, abandoned: false, success: null, personalMetric: i, observations: [],
      metrics: { ownIdeas: i % 2 ? 0 : 1, firstMoveMs: 2500 }, durationMs: 60000,
      tags: i % 2 ? undefined : { promptId: 'lluvia', ideaIds: ['lluvia_agua'] },
    } });
  }
  const svg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="140"><rect width="180" height="140" fill="#fff"/><circle cx="90" cy="70" r="40" fill="#f6c90e"/></svg>');
  s.evidence.push({ kind: 'dibujo', ref: svg, label: 'Garabato · ☀️ El cielo: sol, nubes, estrellas', date: Date.UTC(2026, 9, 5) });
  s.evidence.push({ kind: 'audio', ref: 'idea-x', label: 'Idea propia · ¿Qué pasaría si lloviera caramelos?', date: Date.UTC(2026, 9, 6) });
  return s;
}

describe('informe del docente', () => {
  it('apartados numerados uno debajo de otro, con un criterio bajo cada bloque', () => {
    const el = reportView(buildReport(sample()));
    const titles = [...el.querySelectorAll('.rsec-title')].map((x) => x.textContent ?? '');
    expect(titles).toEqual(['01Lo más importante', '02Perfil por dimensiones', '03Qué hacer en el aula', '04Cómo trabaja', '05Progreso', '06Evidencias']);
    const crits = [...el.querySelectorAll('.crit')].map((c) => c.textContent ?? '');
    expect(crits.length).toBe(7);
    for (const c of crits) expect(c.startsWith('* Criterio:')).toBe(true);
    expect(el.textContent).toContain('70 o más');
    expect(el.textContent).toContain('menos de 40');
    expect(el.querySelector('.report-note')?.textContent).toContain('Nota sobre los datos');
    // Ya no hay tabla de marcos al final
    expect(el.querySelector('.basis-table')).toBeNull();
  });

  it('no muestra cifra con menos de 2 partidas y explica las flechas', () => {
    const el = reportView(buildReport(sample()));
    expect([...el.querySelectorAll('.rdim')].some((r) => r.textContent?.includes('Memoria de trabajo'))).toBe(false);
    expect([...el.querySelectorAll('.nodata')].some((p) => p.textContent?.includes('Memoria de trabajo'))).toBe(true);
    expect(el.textContent).toContain('↗ mejora');
    expect(el.querySelector('.legend')?.textContent).toContain('más de 8 puntos');
    expect(el.textContent).not.toMatch(/×\d/);
    expect(el.textContent).not.toContain('Perdona (sigue igual)');
  });

  it('cada marco va debajo de lo que fundamenta, con los datos del niño', () => {
    const el = reportView(buildReport(sample()));
    const box = (id: string) => el.querySelector(`.basis-box[data-frame="${id}"]`)!;
    expect(el.querySelectorAll('.basis-box')).toHaveLength(8);
    // Torrance, dentro del área de Creatividad y con sus porcentajes
    expect(box('torrance').closest('.area-block')?.textContent).toContain('Creatividad');
    expect(box('torrance').textContent).toContain('Torrance (1966)');
    expect(box('torrance').textContent).toContain('Originalidad 86 %');
    expect(box('torrance').textContent).toContain('Fluidez de ideas 74 %');
    // Thomas y Kilmann, bajo «Ante los conflictos», con el % de cada estilo
    expect(box('conflicto').closest('.how')).not.toBeNull();
    expect(box('conflicto').textContent).toContain('usa 2 de 5 estilos');
    expect(el.querySelector('.how')?.textContent).toContain('67 %');
    expect(box('ultimatum').closest('.area-block')?.textContent).toContain('Social y estratégico');
    expect(box('metacog').closest('.area-block')?.textContent).toContain('Autorregulación');
    expect(box('pigmalion').closest('.progress')).not.toBeNull();
    expect(box('abp').closest('.rhead')).not.toBeNull();
    expect(el.textContent).not.toMatch(/\p{Emoji_Presentation}/u);
    expect(box('adaptacion').textContent).toContain('nivel 2');
    for (const ref of ['Rosenthal y Jacobson (1968)', 'Zimmerman (2002)', 'Flavell (1979)', 'Güth, Schmittberger y Schwarze (1982)', 'Thomas y Kilmann (1974)', 'Fisher y Ury (1981)']) {
      expect(el.textContent).toContain(ref);
    }
    expect(el.textContent).toContain('Los valores de referencia por edad son hipótesis iniciales que se recalcularán con un piloto.');
    const boxes = [...el.querySelectorAll('.basis-box')].map((b) => b.textContent ?? '').join(' ').toLowerCase();
    expect(boxes).not.toMatch(/estudio|validad|oficial|científicamente probado/);
  });

  it('competencias de un vistazo: 5 tarjetas con icono, descripción, media y etiqueta', () => {
    const el = reportView(buildReport(sample()));
    const cards = [...el.querySelectorAll('.ov-card')];
    expect(cards).toHaveLength(5);
    for (const c of cards) expect(c.querySelector('.li svg')).not.toBeNull();
    const crea = cards.find((c) => c.textContent?.includes('Creatividad'))!;
    expect(crea.querySelector('.ov-score')?.textContent).toBe('80');
    expect(crea.textContent).toContain('Punto fuerte');
    expect(crea.textContent).toContain('Tener muchas ideas');
    const conc = cards.find((c) => c.textContent?.includes('Pensamiento concreto'))!;
    expect(conc.textContent).toContain('Sin datos aún');
  });

  it('últimas partidas: 5 visibles y el resto plegado', () => {
    const el = reportView(buildReport(sample()));
    const tables = el.querySelectorAll('.progress table.history');
    expect(tables[0].querySelectorAll('tbody tr')).toHaveLength(5);
    expect(el.querySelector('.progress details.older tbody')?.querySelectorAll('tr')).toHaveLength(3);
  });

  it('las evidencias muestran el texto real de las ideas elegidas', () => {
    const el = reportView(buildReport(sample()));
    expect(el.querySelector('.evidence')?.textContent).toContain('Guardaríamos agua para beber');
  });

  it('etiqueta «Datos de demostración» solo en perfiles de demo o prueba', () => {
    expect(isDemoProfile(sample('Demo'))).toBe(true);
    expect(isDemoProfile(sample('Alumno de prueba'))).toBe(true);
    expect(isDemoProfile(sample('Lucía'))).toBe(false);
    expect(reportView(buildReport(sample('Demo'))).textContent).toContain('Datos de demostración');
    expect(reportView(buildReport(sample('Lucía'))).textContent).not.toContain('Datos de demostración');
  });
});
