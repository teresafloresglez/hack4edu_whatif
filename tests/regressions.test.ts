import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { GameContext, GameDef, GameOutcome } from '../src/core/types';
import { newStudent } from '../src/core/storage';
import { makeRng } from '../src/core/rng';
import { getCulture } from '../src/data/cultures';
import { getTheme } from '../src/data/themes';
import { gameName } from '../src/games/registry';
import { naranjaGame } from '../src/games/naranja';
import { milUsosGame } from '../src/games/ideas';
import { drawnCoverage, inkRatio } from '../src/games/garabato';
import { runGame } from '../src/ui/session';

// Pruebas de regresión de fallos encontrados por el agente de QA.

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

const tick = (ms = 2) => new Promise((r) => setTimeout(r, ms));

function makeCtx(game: GameDef, over: Partial<GameContext> = {}): { ctx: GameContext; ac: AbortController; run: () => Promise<GameOutcome> } {
  const student = newStudent({ name: 'QA', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
  const root = document.createElement('div');
  document.body.append(root);
  const ac = new AbortController();
  const ctx: GameContext = {
    root, student, level: 1, ageBand: 'old', culture: getCulture('america'), theme: getTheme('parque'),
    rng: makeRng(5), say: () => Promise.resolve(), sfx: () => {}, exitSignal: ac.signal, fast: true, gameName, ...over,
  };
  return { ctx, ac, run: () => game.play(ctx) };
}

async function clickWhenReady(root: HTMLElement, selector: string, tries = 200): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const el = root.querySelector<HTMLButtonElement>(selector);
    if (el) {
      el.click();
      return;
    }
    await tick();
  }
  throw new Error('No aparece ' + selector);
}

describe('La naranja: explorar = preguntar a todos', () => {
  it('preguntar 4 veces al mismo personaje no cuenta como haber explorado a los dos', async () => {
    const { ctx, run } = makeCtx(naranjaGame, { level: 4 });
    const p = run();
    await tick();
    for (let si = 0; si < 2; si++) {
      // Solo pregunta al primer personaje, muchas veces.
      for (let q = 0; q < 4; q++) {
        await clickWhenReady(ctx.root, '.ask-btn');
        await tick();
      }
      await clickWhenReady(ctx.root, '[data-style="competir"]');
      await clickWhenReady(ctx.root, '[data-feel="triste"]');
      await tick(10);
    }
    const o = await p;
    expect(o.metrics.questions).toBe(8);
    expect(o.metrics.exploration).toBeCloseTo(0.5, 5);
  });
});

describe('Salir (🏠) nunca espera a que termine la voz', () => {
  it('La naranja termina enseguida aunque la voz no acabe nunca', async () => {
    const s = newStudent({ name: 'QA', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    const root = document.createElement('div');
    document.body.append(root);
    const ac = new AbortController();
    const never = () => new Promise<void>(() => undefined);
    let finished = false;
    const p = runGame({ student: s, game: naranjaGame, root, exitSignal: ac.signal, fast: true, sayFn: never }).then((r) => {
      finished = true;
      return r;
    });
    await clickWhenReady(root, '.ask-btn'); // la respuesta del personaje se dice en voz alta (await)
    await tick(5);
    ac.abort();
    await tick(30);
    expect(finished).toBe(true);
    expect((await p).outcome.abandoned).toBe(true);
  });
});

describe('Garabato: la superficie solo cuenta lo que dibuja el niño', () => {
  const W = 40, H = 40;
  const blank = () => new Uint8ClampedArray(W * H * 4).fill(255);
  it('sin dibujar nada, la raya gris inicial no cuenta como superficie', () => {
    const base = blank();
    for (let i = 0; i < base.length; i += 4 * 5) { base[i] = base[i + 1] = base[i + 2] = 154; } // raya gris
    expect(inkRatio(base)).toBeGreaterThan(0);
    expect(drawnCoverage(base, base)).toBe(0);
  });
  it('lo dibujado encima sí cuenta', () => {
    const base = blank();
    const after = blank();
    for (let i = 0; i < after.length; i += 4) after[i + 1] = 0;
    expect(drawnCoverage(base, after)).toBeCloseTo(1, 5);
  });
});

describe('Mil usos: el micrófono se apaga al terminar o salir', () => {
  const w = window as unknown as Record<string, unknown>;
  const nav = navigator as unknown as Record<string, unknown>;
  let stopped = 0;
  let savedMR: unknown, savedMD: unknown;
  beforeEach(() => {
    stopped = 0;
    savedMR = w.MediaRecorder;
    savedMD = nav.mediaDevices;
    class FakeRecorder {
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(_s: unknown) { void _s; }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['x']) });
        setTimeout(() => this.onstop?.(), 0);
      }
    }
    w.MediaRecorder = FakeRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => void stopped++ }] }) },
    });
  });
  afterEach(() => {
    w.MediaRecorder = savedMR;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: savedMD });
  });

  for (const how of ['listo', 'salir'] as const) {
    it(`grabando y pulsando ${how === 'listo' ? '✅' : '🏠'}: el micrófono se apaga al momento`, async () => {
      const { ctx, ac, run } = makeCtx(milUsosGame, { fast: false });
      const p = run();
      await clickWhenReady(ctx.root, '.mic-btn');
      await tick(20);
      expect(stopped).toBe(0); // grabando
      if (how === 'listo') await clickWhenReady(ctx.root, '[data-done]');
      else ac.abort();
      await tick(50);
      expect(stopped).toBe(1);
      ac.abort();
      await p;
    });
  }
});

describe('Un proyecto guardado nunca se queda bloqueado', () => {
  it('si el plan tiene un juego que ya no existe, el mapa ofrece otro juego', async () => {
    const { startApp } = await import('../src/ui/app');
    const { saveStudent } = await import('../src/core/storage');
    const { startProject } = await import('../src/core/project');
    const { CANDIDATES } = await import('../src/ui/session');
    const s = newStudent({ name: 'Viejo', avatar: '🦁', color: '#f90', age: 7, regionId: 'america' });
    const p = startProject(s, 'parque', CANDIDATES, makeRng(2));
    p.plan = ['juego_que_ya_no_existe'];
    saveStudent(s);
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.avatar-btn:not(.add)') as HTMLButtonElement).click();
    (root.querySelector('.hub-btn.primary') as HTMLButtonElement).click();
    expect(root.querySelectorAll('.game-tile').length).toBeGreaterThan(0);
    expect(p.phase).toBe(1);
  });

  it('el informe docente no falla con una fase fuera de rango', async () => {
    const { reportView } = await import('../src/ui/teacher');
    const { buildReport } = await import('../src/core/report');
    const { startProject } = await import('../src/core/project');
    const { CANDIDATES } = await import('../src/ui/session');
    const s = newStudent({ name: 'Raro', avatar: '🦁', color: '#f90', age: 7, regionId: 'america' });
    const p = startProject(s, 'parque', CANDIDATES, makeRng(2));
    (p as { phase: number }).phase = 7;
    expect(() => reportView(buildReport(s))).not.toThrow();
  });
});

describe('Importar una copia dañada no rompe la zona docente', () => {
  it('partidas, niveles y dimensiones corruptos se reparan al cargar', async () => {
    const { importAll, loadStudents } = await import('../src/core/storage');
    const { startApp } = await import('../src/ui/app');
    const { levelFor } = await import('../src/core/adaptation');
    const good = newStudent({ name: 'Dañado', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' });
    const bad = {
      ...good,
      plays: [null, { gameId: 'colores' }, { gameId: 'memoria', date: 1, outcome: { durationMs: 1000 } }],
      levels: { colores: { level: 'x' }, memoria: { level: 9, streak: 0, plays: 1, best: 0 } },
      dims: { memoria: { mean: 'nada', n: 2 } },
      projects: [null],
      evidence: [null],
    };
    importAll(JSON.stringify({ app: 'what-if', version: 1, students: [bad] }));
    const s = loadStudents()[0];
    expect(s.plays).toHaveLength(1);
    expect(levelFor(s, 'colores')).toBe(2);
    expect(levelFor(s, 'memoria')).toBe(5);
    expect(s.dims.memoria.mean).toBe(0.5);
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.teacher-btn') as HTMLButtonElement).click();
    for (const k of ['1', '2', '3', '4']) (root.querySelector(`[data-key="${k}"]`) as HTMLButtonElement).click();
    expect(root.textContent).toContain('Resumen de la clase');
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Ver informe')!.click();
    expect(root.textContent).toContain('Perfil por dimensiones');
  });
});

describe('decisiones de diseño revisadas', () => {
  it('abandonar no baja de nivel (no se concluye nada de un abandono)', async () => {
    const { newStudent } = await import('../src/core/storage');
    const { applyOutcome } = await import('../src/core/evaluation');
    const { GAME_BY_ID } = await import('../src/games/registry');
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    s.levels.colores = { level: 3, streak: 1, plays: 2, best: 10 };
    applyOutcome(s, GAME_BY_ID.colores, { gameId: 'colores', level: 3, abandoned: true, success: false, personalMetric: 0, observations: [], metrics: {}, durationMs: 10 }, { phase: 1, projectId: 'p' });
    expect(s.levels.colores.level).toBe(3);
    expect(s.signals.abandons).toBe(1);
  });
});

describe('El docente puede borrar un alumno desde su informe', () => {
  it('pide confirmación y lo borra', async () => {
    const { saveStudent, loadStudents } = await import('../src/core/storage');
    const { openTeacher } = await import('../src/ui/teacher');
    const s = newStudent({ name: 'Borrable', avatar: '🦁', color: '#f90', age: 7, regionId: 'america' });
    saveStudent(s);
    const root = document.createElement('div');
    document.body.append(root);
    openTeacher(root, () => {});
    for (const k of '1234') (root.querySelector(`[data-key="${k}"]`) as HTMLButtonElement).click();
    (root.querySelector('.class-table .tbtn.primary') as HTMLButtonElement).click();
    const del = root.querySelector<HTMLButtonElement>('[data-delete]')!;
    expect(del).not.toBeNull();
    const original = window.confirm;
    window.confirm = () => false;
    del.click();
    expect(loadStudents()).toHaveLength(1); // si cancela, no se borra
    window.confirm = () => true;
    del.click();
    window.confirm = original;
    expect(loadStudents()).toHaveLength(0);
  });
});

describe('Micrófono: si el permiso nunca llega, ✅ y 🏠 siguen funcionando', () => {
  const w = window as unknown as Record<string, unknown>;
  const nav = navigator as unknown as Record<string, unknown>;
  let savedMR: unknown, savedMD: unknown;
  beforeEach(() => {
    savedMR = w.MediaRecorder;
    savedMD = nav.mediaDevices;
    w.MediaRecorder = class { constructor(_s: unknown) { void _s; } };
    // El aviso de permiso se queda abierto: getUserMedia no se resuelve nunca.
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise(() => {}) } });
  });
  afterEach(() => {
    w.MediaRecorder = savedMR;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: savedMD });
  });

  it('parar la grabación antes del permiso devuelve «nada» al momento', async () => {
    const { startRecording } = await import('../src/games/recorder');
    const rec = startRecording(8000);
    rec.stop();
    const r = await Promise.race([rec.result, tick(100).then(() => 'colgado')]);
    expect(r).toBeNull();
  });

  it('Mil usos: pulsar 🎤 y luego ✅ termina la partida', async () => {
    const { ctx, run } = makeCtx(milUsosGame, { fast: false });
    const p = run();
    await clickWhenReady(ctx.root, '.mic-btn');
    await tick(20);
    await clickWhenReady(ctx.root, '[data-done]');
    const o = await Promise.race([p, tick(2000).then(() => null)]);
    expect(o).not.toBeNull();
    expect(o!.abandoned).toBe(false);
  });
});

describe('Jugar libre: «Atrás» en la predicción vuelve al catálogo', () => {
  it('elegir un juego del catálogo y pulsar atrás devuelve al catálogo, no al inicio del niño', async () => {
    const { saveStudent } = await import('../src/core/storage');
    const { startApp } = await import('../src/ui/app');
    const { setLang } = await import('../src/i18n');
    setLang('es');
    saveStudent(newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' }));
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.avatar-btn:not(.add)') as HTMLButtonElement).click();
    [...root.querySelectorAll<HTMLButtonElement>('.hub-btn')].find((b) => b.textContent?.includes('Jugar libre'))!.click();
    (root.querySelector('.free-games [data-game="robi"]') as HTMLButtonElement).click();
    expect(document.body.dataset.screen).toBe('predict');
    (root.querySelector('.topbar .icon-btn') as HTMLButtonElement).click();
    expect(document.body.dataset.screen).toBe('free');
    expect(root.querySelector('.free-games [data-game="robi"]')).not.toBeNull();
  });
});

describe('Ajustes dañados en localStorage', () => {
  it('una velocidad de voz no numérica vuelve a la de serie (si no, el niño se queda sin voz)', async () => {
    const { loadSettings } = await import('../src/core/storage');
    localStorage.setItem('whatif.settings.v1', JSON.stringify({ voiceRate: 'rápido', voiceEnabled: 'sí' }));
    const s = loadSettings();
    expect(Number.isFinite(s.voiceRate)).toBe(true);
    expect(s.voiceEnabled).toBe(true);
  });

  it('un PIN guardado como número o vacío no deja al docente fuera', async () => {
    const { loadSettings } = await import('../src/core/storage');
    const { openTeacher } = await import('../src/ui/teacher');
    localStorage.setItem('whatif.settings.v1', JSON.stringify({ teacherPin: 5678 }));
    expect(loadSettings().teacherPin).toBe('5678');
    localStorage.setItem('whatif.settings.v1', JSON.stringify({ teacherPin: '' }));
    expect(loadSettings().teacherPin).toBe('1234');
    const root = document.createElement('div');
    document.body.append(root);
    openTeacher(root, () => {});
    for (const k of '1234') (root.querySelector(`[data-key="${k}"]`) as HTMLButtonElement).click();
    expect(root.querySelector('.tabs')).not.toBeNull();
  });
});

describe('Informe en móvil (360 px)', () => {
  it('el historial de partidas tiene reglas compactas para que la columna de estrellas no se salga de la tarjeta', async () => {
    // Vitest convierte los .css importados en texto vacío: se lee el archivo tal cual (las pruebas corren desde la raíz).
    const fs: { readFileSync(path: string, enc: 'utf8'): string } = await import(/* @vite-ignore */ ['node', 'fs'].join(':'));
    const css = fs.readFileSync('src/style.css', 'utf8');
    // Bloques de móvil: desde cada «@media (max-width: 480px) {» hasta su llave de cierre.
    let mobile = '';
    for (let start = css.indexOf('@media (max-width: 480px) {'); start >= 0; start = css.indexOf('@media (max-width: 480px) {', start + 1)) {
      let depth = 0;
      for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}' && --depth === 0) { mobile += css.slice(start, i); break; }
      }
    }
    expect(mobile).toMatch(/\.report \.history td\.stars \{[^}]*white-space: nowrap/);
    expect(mobile).toMatch(/\.report \.history th, \.report \.history td \{[^}]*padding: 6px 3px/);
  });
});
