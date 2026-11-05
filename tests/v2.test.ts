import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { GameContext, Student } from '../src/core/types';
import { setLang, getLang, LANGS, tr, type Lang } from '../src/i18n';
import { t, type StrKey } from '../src/i18n/strings';
import { newStudent, saveStudent, loadStudents, loadSettings, saveSettings } from '../src/core/storage';
import { buildReport } from '../src/core/report';
import { applyOutcome } from '../src/core/evaluation';
import { makeRng } from '../src/core/rng';
import { CULTURES, getCulture } from '../src/data/cultures';
import { THEMES, getTheme } from '../src/data/themes';
import { USES_BANK, WHAT_IF_PROMPTS, CATEGORY_LABEL } from '../src/data/ideas';
import { DIMENSIONS, AREAS } from '../src/core/dimensions';
import { GAMES, GAME_BY_ID, PHASES, gameName } from '../src/games/registry';
import { scoreIdeas, buildDeck, milUsosGame } from '../src/games/ideas';
import { reflexionGame } from '../src/games/reflexion';
import { ALL_ICONS } from '../src/ui/icons';
import { startApp } from '../src/ui/app';
import { reportView } from '../src/ui/teacher';
import { botPlay } from './bot';

const flush = (ms = 2) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  setLang('es');
});
afterEach(() => setLang('es'));

/** Recorre un objeto y devuelve todos los textos multilingües {es,en,fr}. */
function collectL(x: unknown, out: Record<string, unknown>[] = [], seen = new Set<unknown>()): Record<string, unknown>[] {
  if (!x || typeof x !== 'object' || seen.has(x)) return out;
  seen.add(x);
  const o = x as Record<string, unknown>;
  if ('es' in o && 'en' in o && 'fr' in o) out.push(o);
  else for (const v of Object.values(o)) collectL(v, out, seen);
  return out;
}

describe('idiomas: español, inglés y francés', () => {
  it('ningún texto de los datos ni de los juegos está vacío en ningún idioma', () => {
    const all = collectL([CULTURES, THEMES, USES_BANK, WHAT_IF_PROMPTS, CATEGORY_LABEL, DIMENSIONS, AREAS, PHASES, GAMES.map((g) => [g.name, g.teacherInfo])]);
    expect(all.length).toBeGreaterThan(250);
    for (const l of all) for (const lang of ['es', 'en', 'fr'] as Lang[]) {
      expect(typeof l[lang], JSON.stringify(l)).toBe('string');
      expect((l[lang] as string).trim().length, JSON.stringify(l)).toBeGreaterThan(0);
    }
  });

  it('todas las claves de interfaz existen en los 3 idiomas y las traducciones son distintas del español', () => {
    const keys = ['startProject', 'whereFrom', 'predictStars', 'rewardGood', 'profileTitle', 'observeNote'] as StrKey[];
    for (const k of keys) {
      setLang('es'); const es = t(k);
      setLang('en'); const en = t(k);
      setLang('fr'); const fr = t(k);
      expect(es).not.toBe(en);
      expect(es).not.toBe(fr);
      expect(en.length && fr.length).toBeTruthy();
    }
  });

  it('cambiar el idioma en el inicio cambia los textos y se guarda', () => {
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    expect(root.querySelectorAll('.lang-btn')).toHaveLength(3);
    (root.querySelector('[data-lang="en"]') as HTMLButtonElement).click();
    expect(getLang()).toBe('en');
    expect(loadSettings().lang).toBe('en');
    expect(root.textContent).toContain('Tap ➕ to start!');
    (root.querySelector('[data-lang="fr"]') as HTMLButtonElement).click();
    expect(root.textContent).toContain('Touche ➕ pour commencer');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('el idioma guardado se aplica al arrancar', () => {
    saveSettings({ ...loadSettings(), lang: 'en' });
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    expect(getLang()).toBe('en');
    expect(root.textContent).toContain('Tap');
  });

  for (const lang of LANGS.map((l) => l.id)) {
    it(`todos los juegos funcionan en ${lang}`, async () => {
      setLang(lang);
      const s = newStudent({ name: 'Bot', avatar: '🤖', color: '#ccc', age: 9, regionId: 'africa' });
      for (const g of GAMES) {
        const { outcome } = await botPlay(g, s, { level: 4, seed: 3 });
        expect(outcome.gameId).toBe(g.id);
      }
    });

    it(`el informe docente sale en ${lang}`, () => {
      setLang(lang);
      const s = newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' });
      s.dims.memoria = { mean: 0.2, n: 4, weightSum: 4, history: [] };
      s.dims.atencion = { mean: 0.2, n: 4, weightSum: 4, history: [] };
      s.signals = { ...s.signals, nonsensePicks: 5, nonsenseShown: 8 };
      const el = reportView(buildReport(s));
      const txt = el.textContent ?? '';
      if (lang === 'en') { expect(txt).toContain('Profile by dimension'); expect(txt).not.toContain('Perfil por dimensiones'); }
      if (lang === 'fr') { expect(txt).toContain('Profil par dimension'); expect(txt).not.toContain('Perfil por dimensiones'); }
      if (lang === 'es') expect(txt).toContain('Perfil por dimensiones');
      // Sin lenguaje diagnóstico en ningún idioma
      expect(txt.toLowerCase()).not.toMatch(/tdah|adhd|dislexi|dyslexi|autis|discapacidad|disability|handicap|daltoni|colou?r.?blind|trastorno|disorder|trouble du/);
    });
  }

  it('nombres de juego y fases traducidos', () => {
    setLang('en');
    expect(gameName('naranja').name).toBe('The orange');
    expect(tr(PHASES[0].name)).toBe('Explore');
    setLang('fr');
    expect(gameName('milusos').name).toBe('Mille usages');
  });
});

describe('región del alumno al darse de alta', () => {
  it('se elige región después de la edad y se puede cambiar antes de confirmar', () => {
    saveSettings({ ...loadSettings(), defaultRegion: 'america' });
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.avatar-btn.add') as HTMLButtonElement).click();
    (root.querySelector('.avatar-btn') as HTMLButtonElement).click();
    (root.querySelector('[data-age="6"]') as HTMLButtonElement).click();
    expect(root.querySelectorAll('.region-btn')).toHaveLength(CULTURES.length);
    // Preseleccionada la región por defecto del docente
    expect(root.querySelector('.region-btn.selected')?.getAttribute('data-region')).toBe('america');
    (root.querySelector('[data-region="asia"]') as HTMLButtonElement).click();
    expect(root.querySelectorAll('.region-btn.selected')).toHaveLength(1);
    (root.querySelector('.done-btn') as HTMLButtonElement).click();
    (root.querySelector('.done-btn') as HTMLButtonElement).click();
    const s = loadStudents()[0];
    expect(s.regionId).toBe('asia');
    expect(s.age).toBe(6);
  });

  it('volver atrás desde la región regresa a la edad', () => {
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.avatar-btn.add') as HTMLButtonElement).click();
    (root.querySelector('.avatar-btn') as HTMLButtonElement).click();
    (root.querySelector('[data-age="9"]') as HTMLButtonElement).click();
    (root.querySelector('[aria-label="Volver"]') as HTMLButtonElement).click();
    expect(root.querySelectorAll('.age-btn')).toHaveLength(5);
  });
});

describe('dibujos SVG en los botones', () => {
  it('existen dibujos para todos los juegos, fases, temas, regiones e idiomas', () => {
    const needed = [
      ...GAMES.map((g) => g.id), ...PHASES.map((p) => p.icon), ...THEMES.map((th) => th.id),
      ...LANGS.map((l) => `flag_${l.id}`), 'back', 'speaker', 'home', 'teacher', 'add', 'check', 'cross', 'next', 'play', 'mic', 'hint',
      'up', 'down', 'left', 'right', 'keep', 'give', 'split', 'leave', 'integrate', 'ask', 'thumbUp', 'thumbDown',
      'slow', 'help', 'ideas', 'talk', 'same', 'faceGreat', 'faceHappy', 'faceOk', 'faceWorried', 'faceSad', 'faceAngry',
    ];
    for (const n of needed) expect(ALL_ICONS, n).toContain(n);
  });

  it('la pantalla de inicio y el mapa usan dibujos (SVG) en sus botones', () => {
    const s = newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    saveStudent(s);
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    expect(root.querySelector('.teacher-btn svg')).not.toBeNull();
    expect(root.querySelector('.avatar-btn.add svg')).not.toBeNull();
    (root.querySelector('.avatar-btn') as HTMLButtonElement).click();
    root.querySelectorAll('.hub-btn').forEach((b) => expect(b.querySelector('svg')).not.toBeNull());
    (root.querySelector('.hub-btn.primary') as HTMLButtonElement).click();
    root.querySelectorAll('.theme-btn').forEach((b) => expect(b.querySelector('svg')).not.toBeNull());
    (root.querySelector('[data-theme="cocina"]') as HTMLButtonElement).click();
    (root.querySelector('.done-btn') as HTMLButtonElement).click();
    root.querySelectorAll('.game-tile, .phase-step').forEach((b) => expect(b.querySelector('svg')).not.toBeNull());
    // Todos los botones de icono tienen nombre accesible
    root.querySelectorAll('button').forEach((b) => expect((b.getAttribute('aria-label') ?? b.textContent ?? '').trim().length).toBeGreaterThan(0));
  });
});

describe('Mil usos: respuestas sin sentido', () => {
  it('cada objeto de cada región tiene banco con al menos 3 usos sin sentido', () => {
    for (const c of CULTURES) for (const o of c.objects) {
      const bank = USES_BANK[o.id];
      expect(bank, o.id).toBeTruthy();
      expect(bank.filter((x) => x.nonsense).length).toBeGreaterThanOrEqual(3);
      expect(bank.filter((x) => !x.nonsense).length).toBeGreaterThanOrEqual(6);
    }
  });

  it('la baraja de Mil usos siempre incluye 2 sin sentido; ¿Qué pasaría si…? ninguna', () => {
    for (let lv = 1; lv <= 5; lv++) for (let seed = 0; seed < 20; seed++) {
      const d = buildDeck('milusos', USES_BANK.cubo, lv, makeRng(seed));
      expect(d.filter((c) => c.nonsense)).toHaveLength(2);
      expect(new Set(d.map((c) => c.id)).size).toBe(d.length);
      const q = buildDeck('quepasaria', WHAT_IF_PROMPTS[0].cards, lv, makeRng(seed));
      expect(q.filter((c) => c.nonsense)).toHaveLength(0);
    }
  });

  it('elegir usos sin sentido no suma ideas, ni categorías, ni originalidad', () => {
    const valid = USES_BANK.cubo.filter((c) => !c.nonsense).slice(0, 2);
    const nonsense = USES_BANK.cubo.filter((c) => c.nonsense).slice(0, 2);
    const a = scoreIdeas(valid, 0, 8, 'america', 'usos_un_cubo', 4);
    const b = scoreIdeas([...valid, ...nonsense], 0, 8, 'america', 'usos_un_cubo', 4);
    expect(b.ideas).toBe(a.ideas);
    expect(b.categories).toBe(a.categories);
    expect(b.originality).toBeCloseTo(a.originality);
    expect(b.nonsense).toBe(2);
  });

  it('elegir sin sentido se refleja en el informe como algo a observar', () => {
    const s = newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' });
    for (let i = 0; i < 4; i++) {
      applyOutcome(s, milUsosGame, {
        gameId: 'milusos', level: 2, abandoned: false, success: null, personalMetric: 2,
        observations: [{ dim: 'logica', value: 0, weight: 0.3 }], metrics: { nonsense: 2, nonsenseShown: 2 }, durationMs: 100,
      }, { phase: 3, projectId: 'p' });
    }
    expect(s.signals.nonsensePicks).toBe(8);
    expect(buildReport(s).signals.map((x) => x.id)).toContain('sinsentido');
  });
});

// Contexto de juego manual para pulsar exactamente lo que queremos.
function manualCtx(student: Student, said: string[], extra: Partial<GameContext> = {}): { ctx: GameContext; ac: AbortController } {
  const root = document.createElement('div');
  document.body.append(root);
  const ac = new AbortController();
  return {
    ac,
    ctx: {
      root, student, level: 1, ageBand: 'old', culture: getCulture(student.regionId), theme: getTheme('parque'),
      rng: makeRng(7), say: (x) => { said.push(x); return Promise.resolve(); }, sfx: () => {}, exitSignal: ac.signal, fast: true, gameName,
      ...extra,
    },
  };
}

describe('✓ / ✗ con lectura en voz alta', () => {
  it('Mil usos: tocar una opción la lee en voz alta y pide ✓ o ✗', async () => {
    const said: string[] = [];
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    const { ctx } = manualCtx(s, said);
    const p = milUsosGame.play(ctx);
    await flush();
    const cards = [...ctx.root.querySelectorAll<HTMLButtonElement>('.idea-card')];
    // ✗: se lee y NO queda elegida
    cards[0].click();
    await flush();
    expect(ctx.root.querySelector('.confirm-overlay')).not.toBeNull();
    expect(said).toContain(cards[0].getAttribute('aria-label'));
    // Mientras se confirma, tocar otra tarjeta o ¡Listo! no hace nada
    cards[1].click();
    (ctx.root.querySelector('[data-done]') as HTMLButtonElement).click();
    expect(ctx.root.querySelectorAll('.confirm-overlay')).toHaveLength(1);
    (ctx.root.querySelector('[data-confirm="no"]') as HTMLButtonElement).click();
    await flush();
    expect(ctx.root.querySelector('.confirm-overlay')).toBeNull();
    expect(cards[0].classList.contains('selected')).toBe(false);
    // ✓: queda elegida
    cards[0].click();
    await flush();
    (ctx.root.querySelector('[data-confirm="yes"]') as HTMLButtonElement).click();
    await flush();
    expect(cards[0].classList.contains('selected')).toBe(true);
    (ctx.root.querySelector('[data-done]') as HTMLButtonElement).click();
    const o = await p;
    expect(o.metrics.ideas + o.metrics.nonsense).toBe(1);
  });

  it('salir con 🏠 mientras está abierto el ✓/✗ termina el juego como abandono', async () => {
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    const { ctx, ac } = manualCtx(s, []);
    const p = milUsosGame.play(ctx);
    await flush();
    ctx.root.querySelector<HTMLButtonElement>('.idea-card')!.click();
    await flush();
    ac.abort();
    const o = await p;
    expect(o.abandoned).toBe(true);
  });

  it('¿Qué harías distinto?: la opción se lee, ✗ permite elegir otra y ✓ la confirma', async () => {
    const said: string[] = [];
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 9, regionId: 'america' });
    const project = { id: 'p', themeId: 'parque', startedAt: 0, phase: 5 as const, played: {}, plan: ['reflexion'], productItems: ['🌳'] };
    const { ctx } = manualCtx(s, said, { project });
    const p = reflexionGame.play(ctx);
    await flush();
    ctx.root.querySelector<HTMLButtonElement>('.big-btn')!.click(); // ver producto → seguir
    await flush();
    ctx.root.querySelector<HTMLButtonElement>('.choice-btn')!.click(); // ¿cómo te has sentido?
    await flush();
    const opts = () => [...ctx.root.querySelectorAll<HTMLButtonElement>('.change-btn')];
    expect(opts()).toHaveLength(5);
    opts()[0].click();
    await flush();
    expect(said.some((x) => x.includes(opts()[0].getAttribute('aria-label')!))).toBe(true);
    (ctx.root.querySelector('[data-confirm="no"]') as HTMLButtonElement).click();
    await flush();
    opts()[2].click();
    await flush();
    (ctx.root.querySelector('[data-confirm="yes"]') as HTMLButtonElement).click();
    const o = await p;
    expect(o.abandoned).toBe(false);
    expect(project).toHaveProperty('reflection.change', 'ideas');
  });
});

describe('compatibilidad con datos de la versión anterior', () => {
  it('alumnos guardados sin los contadores nuevos siguen funcionando', () => {
    const old = newStudent({ name: 'Viejo', avatar: '🐢', color: '#9c6', age: 7, regionId: 'america' }) as unknown as Record<string, unknown>;
    const sig = { ...(old.signals as Record<string, number>) };
    delete sig.nonsensePicks;
    delete sig.nonsenseShown;
    localStorage.setItem('whatif.students.v1', JSON.stringify([{ ...old, signals: sig }]));
    const [s] = loadStudents();
    expect(s.signals.nonsensePicks).toBe(0);
    expect(() => buildReport(s)).not.toThrow();
  });

  it('ajustes guardados sin idioma (o con uno inválido) usan español', () => {
    localStorage.setItem('whatif.settings.v1', JSON.stringify({ teacherPin: '1234', lang: 'de' }));
    expect(loadSettings().lang).toBe('es');
  });

  it('GAME_BY_ID conserva los 10 juegos de siempre (y añade ¡Robi, eso no!)', () => {
    for (const id of ['colores', 'memoria', 'patrones', 'camino', 'quepasaria', 'milusos', 'garabato', 'naranja', 'reparto', 'reflexion']) {
      expect(GAME_BY_ID[id], id).toBeDefined();
    }
    expect(GAME_BY_ID.robi).toBeDefined();
    expect(Object.keys(GAME_BY_ID)).toHaveLength(11);
  });
});
