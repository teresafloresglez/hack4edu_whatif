import { describe, it, expect, beforeEach } from 'vitest';
import { newStudent, saveStudent, loadStudents, normalizeStudent } from '../src/core/storage';
import { earnedPowers, syncPowers, powerInfo } from '../src/core/superpowers';
import { ALL_DIMS } from '../src/core/dimensions';
import { startApp } from '../src/ui/app';
import { setLang } from '../src/i18n';

// Superpoderes: puntos fuertes contados al niño sin mostrar resultados.

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  setLang('es');
});

const strong = (s: ReturnType<typeof newStudent>) => {
  s.dims.originalidad = { mean: 0.86, n: 3, weightSum: 3, history: [] };
  s.dims.memoria = { mean: 0.9, n: 1, weightSum: 1, history: [] }; // una sola partida: aún no cuenta
  s.dims.planificacion = { mean: 0.3, n: 4, weightSum: 4, history: [] };
};

describe('superpoderes', () => {
  it('se ganan con un punto fuerte (70 o más con 2 partidas) y se conservan', () => {
    const s = newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' });
    strong(s);
    expect(syncPowers(s)).toEqual(['originalidad']);
    expect(syncPowers(s)).toEqual([]); // no se celebra dos veces
    s.dims.originalidad.mean = 0.5; // una mala racha no quita el superpoder
    expect(earnedPowers(s)).toEqual(['originalidad']);
  });

  it('todas las dimensiones tienen superpoder en los tres idiomas', () => {
    for (const d of ALL_DIMS) {
      const p = powerInfo(d);
      for (const l of ['es', 'en', 'fr'] as const) {
        expect(p.name[l], d).toBeTruthy();
        expect(p.text[l], d).toBeTruthy();
      }
    }
  });

  it('los datos antiguos sin superpoderes no rompen nada', () => {
    const s = newStudent({ name: 'A', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' }) as unknown as Record<string, unknown>;
    delete s.powers;
    expect(normalizeStudent(s as never).powers).toEqual([]);
  });

  it('junto a las estrellas hay un botón que abre «Mis superpoderes», sin ninguna puntuación', () => {
    const s = newStudent({ name: 'Ana', avatar: '🦁', color: '#f90', age: 8, regionId: 'america' });
    strong(s);
    saveStudent(s);
    const root = document.createElement('div');
    document.body.append(root);
    startApp(root);
    (root.querySelector('.avatar-btn:not(.add)') as HTMLButtonElement).click();
    const pill = root.querySelector<HTMLButtonElement>('[data-powers]')!;
    expect(pill.closest('.topbar-right')?.querySelector('.stars-pill')).not.toBeNull();
    expect(pill.textContent).toContain('1');
    expect(loadStudents()[0].powers).toEqual(['originalidad']);
    pill.click();
    expect(root.textContent).toContain('Mis superpoderes');
    const cards = root.querySelectorAll('.power-card:not(.mystery)');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Imaginación única');
    // Nunca muestra resultados: ni cifras ni áreas débiles.
    const grid = root.querySelector('.power-grid')!.textContent ?? '';
    expect(grid).not.toMatch(/\d/);
    expect(grid).not.toContain('Brújula mágica');
    expect(root.querySelectorAll('.power-card.mystery').length).toBeGreaterThan(0);
  });
});
