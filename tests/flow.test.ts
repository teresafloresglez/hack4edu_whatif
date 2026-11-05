import { describe, it, expect, beforeEach } from 'vitest';
import { newStudent, saveStudent, loadStudents } from '../src/core/storage';
import { startProject, currentProject } from '../src/core/project';
import { makeRng } from '../src/core/rng';
import { buildReport } from '../src/core/report';
import { GAME_BY_ID } from '../src/games/registry';
import { runGame, CANDIDATES } from '../src/ui/session';
import { reportView } from '../src/ui/teacher';
import { startApp } from '../src/ui/app';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

/** Pulsa botones al azar dentro de `root` mientras la promesa no termine. */
async function monkey<T>(root: HTMLElement, p: Promise<T>, seed: number): Promise<T> {
  let done = false;
  let result: T;
  let err: unknown;
  p.then((r) => { result = r; done = true; }, (e) => { err = e; done = true; });
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 4000 && !done; i++) {
    await new Promise((r) => setTimeout(r, 1));
    const bs = [...root.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && !b.hasAttribute('data-nobot'));
    const nd = bs.filter((b) => !b.hasAttribute('data-done'));
    const pool = nd.length && rnd() < 0.85 ? nd : bs;
    if (pool.length) pool[Math.floor(rnd() * pool.length)].click();
  }
  if (err) throw err;
  if (!done) throw new Error('No terminó');
  return result!;
}

describe('proyecto completo (5 fases) de principio a fin', () => {
  for (const age of [6, 8, 10]) {
    it(`niño de ${age} años completa un proyecto y el docente obtiene un informe`, async () => {
      const s = newStudent({ name: 'Kofi', avatar: '🐘', color: '#9c6', age, regionId: 'africa' });
      const p = startProject(s, 'animales', CANDIDATES, makeRng(age));
      saveStudent(s);
      expect(p.phase).toBe(1);
      const seenPhases = new Set<number>();
      let guard = 0;
      while (currentProject(s) && guard++ < 40) {
        const proj = currentProject(s)!;
        seenPhases.add(proj.phase);
        const gid = proj.plan[0];
        expect(gid, `fase ${proj.phase} sin juegos`).toBeTruthy();
        const root = document.createElement('div');
        document.body.append(root);
        const ac = new AbortController();
        const pred = GAME_BY_ID[gid].predict === 'stars' ? 2 : GAME_BY_ID[gid].predict === 'ideas' ? 3 : undefined;
        await monkey(root, runGame({ student: s, game: GAME_BY_ID[gid], root, exitSignal: ac.signal, fast: true, seed: guard, prediction: pred, sayFn: () => Promise.resolve() }), guard * 17 + age);
        root.remove();
      }
      expect([...seenPhases].sort()).toEqual([1, 2, 3, 4, 5]);
      expect(p.finishedAt).toBeTruthy();
      expect(p.productItems.length).toBeGreaterThan(0);
      expect(p.reflection).toBeTruthy();
      const saved = loadStudents().find((x) => x.id === s.id)!;
      expect(saved.projects[0].finishedAt).toBeTruthy();
      const r = buildReport(saved);
      expect(r.projectsDone).toBe(1);
      expect(r.gamesPlayed).toBeGreaterThanOrEqual(4);
      // El informe se renderiza sin errores
      const el = reportView(r);
      expect(el.textContent).toContain('Perfil por dimensiones');
    });
  }

  it('abandonar dos veces el mismo juego permite avanzar (avanzar = participar)', async () => {
    const s = newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 6, regionId: 'america' });
    const p = startProject(s, 'parque', CANDIDATES, makeRng(3));
    const gid = p.plan[0];
    for (let i = 0; i < 2; i++) {
      const ac = new AbortController();
      const root = document.createElement('div');
      ac.abort();
      await runGame({ student: s, game: GAME_BY_ID[gid], root, exitSignal: ac.signal, fast: true, sayFn: () => Promise.resolve() });
    }
    expect(p.played[1]).toContain(gid);
  });
});

describe('interfaz', () => {
  it('arranca y navega por las pantallas principales sin errores', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    expect(root.textContent).toContain('WHAT IF?');
    // Crear jugador: ➕ → avatar → edad → listo
    (root.querySelector('.avatar-btn.add') as HTMLButtonElement).click();
    (root.querySelector('.avatar-btn') as HTMLButtonElement).click();
    (root.querySelector('[data-age="8"]') as HTMLButtonElement).click();
    // Paso nuevo: región del alumno
    (root.querySelector('[data-region="africa"]') as HTMLButtonElement).click();
    (root.querySelector('.done-btn') as HTMLButtonElement).click();
    (root.querySelector('.name-input') as HTMLInputElement).value = 'Prueba';
    (root.querySelector('.done-btn') as HTMLButtonElement).click();
    expect(loadStudents()).toHaveLength(1);
    expect(loadStudents()[0].regionId).toBe('africa');
    // Empezar proyecto → elegir tema → confirmar
    (root.querySelector('.hub-btn.primary') as HTMLButtonElement).click();
    (root.querySelector('[data-theme="espacio"]') as HTMLButtonElement).click();
    (root.querySelector('.done-btn') as HTMLButtonElement).click();
    expect(root.querySelectorAll('.phase-step')).toHaveLength(5);
    expect(root.querySelectorAll('.game-tile').length).toBeGreaterThan(0);
    // Abrir el primer juego → aparece la predicción
    (root.querySelector('.game-tile') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 5));
    expect(root.querySelector('.predict-btn, .stage')).not.toBeNull();
  });

  it('zona docente con PIN', async () => {
    const s = newStudent({ name: 'Lucía', avatar: '🦁', color: '#f90', age: 7, regionId: 'america' });
    saveStudent(s);
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.teacher-btn') as HTMLButtonElement).click();
    for (const k of ['9', '9', '9', '9']) (root.querySelector(`[data-key="${k}"]`) as HTMLButtonElement).click();
    expect(root.textContent).toContain('PIN incorrecto');
    for (const k of ['1', '2', '3', '4']) (root.querySelector(`[data-key="${k}"]`) as HTMLButtonElement).click();
    expect(root.textContent).toContain('Resumen de la clase');
    expect(root.textContent).toContain('Lucía');
    const btn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Ver informe')!;
    btn.click();
    expect(root.textContent).toContain('Perfil por dimensiones');
    const tabs = () => [...root.querySelectorAll<HTMLButtonElement>('button')];
    tabs().find((b) => b.textContent?.includes('Volver'))!.click();
    tabs().find((b) => b.textContent?.includes('Ajustes'))!.click();
    expect(root.textContent).toContain('PIN docente');
    tabs().find((b) => b.textContent?.includes('Cómo funciona'))!.click();
    expect(root.textContent).toContain('La regla de oro');
  });
});
