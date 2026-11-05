import { describe, it, expect, beforeEach } from 'vitest';
import { newStudent, saveStudent } from '../src/core/storage';
import { startApp } from '../src/ui/app';
import { setLang } from '../src/i18n';

// El juego con IA siempre se puede encontrar: acceso directo y catálogo de «Jugar libre».
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  setLang('es');
});

describe('acceso a ¡Robi, eso no!', () => {
  it('Robi está en «Jugar libre» como un juego más', () => {
    saveStudent(newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' }));
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.avatar-btn:not(.add)') as HTMLButtonElement).click();
    expect(root.querySelector('[data-robi-hub]')).toBeNull();
    const free = [...root.querySelectorAll<HTMLButtonElement>('.hub-btn')].find((b) => b.textContent?.includes('Jugar libre'))!;
    free.click();
    const tiles = [...root.querySelectorAll<HTMLButtonElement>('.free-games .game-tile')].map((b) => b.dataset.game);
    expect(tiles).toContain('robi');
    expect(tiles).toContain('patrones');
    expect(tiles).not.toContain('reflexion');
    expect(root.querySelector('[data-game="robi"] .new-badge')).toBeNull();
    expect(root.querySelector('[data-game="robi"]')?.textContent).toContain('¡Robi, eso no!');
  });
});

describe('Robi: marca personal y contenido de animales', () => {
  it('fallarlo todo no supera la marca y hay al menos 2 absurdos de animales', async () => {
    const { REASONINGS } = await import('../src/core/robi');
    expect(REASONINGS.filter((r) => r.gusto === 'animales' && r.tipo === 'absurdo' && !r.regiones).length).toBeGreaterThanOrEqual(2);
    const { robiGame } = await import('../src/games/robi');
    const { makeRng } = await import('../src/core/rng');
    const { getCulture } = await import('../src/data/cultures');
    const { getTheme } = await import('../src/data/themes');
    const { gameName } = await import('../src/games/registry');
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' });
    const root = document.createElement('div');
    document.body.append(root);
    const p = robiGame.play({ root, student: s, level: 3, ageBand: 'old', culture: getCulture('america'), theme: getTheme('animales'), rng: makeRng(2), say: () => Promise.resolve(), sfx: () => {}, exitSignal: new AbortController().signal, fast: true, gameName });
    // Responde siempre mal: «tiene sentido» a los fallos y «eso no» al correcto; y en el porqué, la opción incorrecta.
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => setTimeout(r, 2));
      const wrongOpt = root.querySelector<HTMLButtonElement>('[data-correct="false"]:not([disabled])');
      if (wrongOpt) { wrongOpt.click(); continue; }
      const next = root.querySelector<HTMLButtonElement>('[data-done]');
      if (next) { next.click(); continue; }
      const frase = root.querySelector('.robi-bubble p')?.textContent ?? '';
      const r = REASONINGS.find((x) => frase.includes(x.frase.es));
      root.querySelector<HTMLButtonElement>(r?.tipo === 'ninguno' ? '[data-robi="nope"]' : '[data-robi="sense"]')?.click();
      if (await Promise.race([p.then(() => true), new Promise((res) => setTimeout(() => res(false), 1))])) break;
    }
    const out = await p;
    expect(out.metrics.aciertos).toBe(0);
    expect(out.personalMetric).toBe(0);
    expect(out.success).toBe(false);
  });
});
