import { describe, it, expect, beforeEach } from 'vitest';
import { GAMES } from '../src/games/registry';
import { newStudent } from '../src/core/storage';
import { ALL_DIMS } from '../src/core/dimensions';
import { botPlay } from './bot';

function validOutcome(o: import('../src/core/types').GameOutcome, gameId: string) {
  expect(o.gameId).toBe(gameId);
  expect(Number.isFinite(o.personalMetric)).toBe(true);
  expect(Number.isFinite(o.durationMs)).toBe(true);
  for (const ob of o.observations) {
    expect(ALL_DIMS).toContain(ob.dim);
    expect(ob.value).toBeGreaterThanOrEqual(0);
    expect(ob.value).toBeLessThanOrEqual(1);
    expect(ob.weight).toBeGreaterThan(0);
    expect(ob.weight).toBeLessThanOrEqual(1);
  }
  for (const [k, v] of Object.entries(o.metrics)) {
    expect(Number.isFinite(v), `métrica ${k}=${v}`).toBe(true);
  }
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('todos los juegos terminan sin errores (bot que toca al azar)', () => {
  for (const game of GAMES) {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const age of [6, 9]) {
        it(`${game.id} · nivel ${level} · ${age} años`, async () => {
          const s = newStudent({ name: 'Bot', avatar: '🤖', color: '#ccc', age, regionId: level % 2 ? 'america' : 'africa' });
          const { outcome } = await botPlay(game, s, { level, seed: level * 31 + age });
          validOutcome(outcome, game.id);
          expect(outcome.abandoned).toBe(false);
          expect(outcome.level).toBe(level);
        });
      }
    }
  }
});

describe('salir a mitad de juego devuelve un abandono válido', () => {
  for (const game of GAMES) {
    it(`${game.id} abandonado`, async () => {
      const s = newStudent({ name: 'Bot', avatar: '🤖', color: '#ccc', age: 7, regionId: 'america' });
      const { outcome } = await botPlay(game, s, { level: 2, seed: 5, abortAfter: 2 });
      validOutcome(outcome, game.id);
      expect(outcome.abandoned).toBe(true);
    });
  }
});

describe('varias regiones (paquetes culturales)', () => {
  for (const region of ['africa', 'america', 'asia', 'europa', 'oceania', 'latam', 'region_inexistente']) {
    it(`naranja, milusos y reparto en ${region}`, async () => {
      const s = newStudent({ name: 'Bot', avatar: '🤖', color: '#ccc', age: 8, regionId: region });
      for (const id of ['naranja', 'milusos', 'reparto']) {
        const g = GAMES.find((x) => x.id === id)!;
        const { outcome } = await botPlay(g, s, { level: 3, seed: 9 });
        validOutcome(outcome, id);
      }
    });
  }
});
