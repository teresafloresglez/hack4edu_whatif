import type { GameContext, GameDef, GameOutcome } from '../core/types';
import { pick } from '../core/rng';
import { fill, tr, type L } from '../i18n';
import { ic } from '../ui/icons';
import { h, render, instruction, wait, waitFor, flash, obs, now, isAbort, abandonedOutcome, levelRel } from './common';

// Fase 2 · Planificar · Respuesta de PROCESO: se mide el camino, no el resultado.
// · Tiempo antes del primer movimiento → planifica o actúa por impulso
// · Movimientos usados frente al mínimo → eficiencia
// · Qué hace tras un error → corrige o abandona
// · Uso de pistas → pide ayuda cuando la necesita

// `key`: en los niveles altos, el ÚLTIMO mapa se complica: hay que recoger
// una llave antes de poder llegar a la meta (planificar en dos etapas).
const LEVELS = [
  { size: 4, rocks: 2, hints: 3, maps: 2, key: false },
  { size: 5, rocks: 4, hints: 3, maps: 2, key: false },
  { size: 5, rocks: 7, hints: 2, maps: 2, key: false },
  { size: 6, rocks: 10, hints: 1, maps: 2, key: true },
  { size: 6, rocks: 13, hints: 1, maps: 3, key: true },
];
const KEY_ICON = '🔑';

/** Flechas del teclado (y WASD) → dirección. */
export const KEY_DIRS: Record<string, string> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

type P = [number, number];
const DIRS: Record<string, P> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_LABEL: Record<string, L> = {
  up: { es: 'Arriba', en: 'Up', fr: 'Haut' },
  down: { es: 'Abajo', en: 'Down', fr: 'Bas' },
  left: { es: 'Izquierda', en: 'Left', fr: 'Gauche' },
  right: { es: 'Derecha', en: 'Right', fr: 'Droite' },
};

export interface MapDef { size: number; rocks: Set<string>; start: P; goal: P; key?: P }

const k = (p: P) => `${p[0]},${p[1]}`;

/** Camino más corto (BFS). Devuelve la lista de casillas o null. */
export function shortestPath(m: MapDef, from: P = m.start, to: P = m.goal): P[] | null {
  const q: P[] = [from];
  const prev = new Map<string, string | null>([[k(from), null]]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur[0] === to[0] && cur[1] === to[1]) {
      const path: P[] = [];
      let key: string | null = k(cur);
      while (key) {
        const [x, y] = key.split(',').map(Number);
        path.unshift([x, y]);
        key = prev.get(key) ?? null;
      }
      return path;
    }
    for (const d of Object.values(DIRS)) {
      const n: P = [cur[0] + d[0], cur[1] + d[1]];
      if (n[0] < 0 || n[1] < 0 || n[0] >= m.size || n[1] >= m.size) continue;
      if (m.rocks.has(k(n)) || prev.has(k(n))) continue;
      prev.set(k(n), k(cur));
      q.push(n);
    }
  }
  return null;
}

/** Camino más corto pasando por la llave (si la hay y aún no se ha cogido). */
export function fullPath(m: MapDef, from: P, hasKey: boolean): P[] | null {
  if (!m.key || hasKey) return shortestPath(m, from);
  const a = shortestPath(m, from, m.key);
  const b = shortestPath(m, m.key);
  return a && b ? [...a, ...b.slice(1)] : null;
}

/** Coloca la llave en una casilla libre que obligue a desviarse del camino directo. */
export function placeKey(m: MapDef, rng: () => number): P | undefined {
  const direct = shortestPath(m);
  if (!direct) return undefined;
  const onDirect = new Set(direct.map(k));
  const free: P[] = [];
  for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) {
    const p: P = [x, y];
    if (m.rocks.has(k(p)) || onDirect.has(k(p))) continue;
    const viaKey = fullPath({ ...m, key: p }, m.start, false);
    if (viaKey && viaKey.length - direct.length >= 2) free.push(p);
  }
  return free.length ? free[Math.floor(rng() * free.length)] : undefined;
}

export function buildMap(level: number, rng: () => number, withKey = false): MapDef {
  const L = LEVELS[Math.max(0, Math.min(4, level - 1))];
  for (let attempt = 0; attempt < 200; attempt++) {
    const start: P = [0, L.size - 1];
    const goal: P = [L.size - 1, 0];
    const rocks = new Set<string>();
    let guard = 0;
    while (rocks.size < L.rocks && guard++ < 500) {
      const p: P = [Math.floor(rng() * L.size), Math.floor(rng() * L.size)];
      if (k(p) === k(start) || k(p) === k(goal)) continue;
      rocks.add(k(p));
    }
    const m: MapDef = { size: L.size, rocks, start, goal };
    const path = shortestPath(m);
    // Que haya camino y que no sea trivial.
    if (!path || path.length - 1 < L.size) continue;
    if (withKey) {
      const key = placeKey(m, rng);
      if (!key) continue;
      m.key = key;
    }
    return m;
  }
  const empty: MapDef = { size: L.size, rocks: new Set(), start: [0, L.size - 1], goal: [L.size - 1, 0] };
  if (withKey) empty.key = [0, 0];
  return empty;
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const L = LEVELS[Math.max(0, Math.min(4, ctx.level - 1))];
  const hero = pick(ctx.culture.people.slice(0, 2), ctx.rng);
  const goalIcon = pick(ctx.theme.items, ctx.rng);
  let totalMoves = 0, totalMin = 0, errors = 0, hintsUsed = 0, recovered = 0, errorsThenStop = 0;
  let mapsDone = 0, hintsAfterError = 0, hintsBeforeTrying = 0, keysCollected = 0, lockedTries = 0;
  const firstMoveTimes: number[] = [];

  try {
    for (let mi = 0; mi < L.maps; mi++) {
      const keyMap = L.key && mi === L.maps - 1;
      const m = buildMap(ctx.level, ctx.rng, keyMap);
      let hasKey = !m.key;
      const min = fullPath(m, m.start, hasKey)!.length - 1;
      totalMin += min;
      let pos: P = [...m.start];
      let moves = 0;
      let hintsLeft = L.hints;
      let lastWasError = false;
      let mapErrors = 0;
      const maxMoves = min * 4 + 10;

      const board = h('div', { class: 'board', style: { gridTemplateColumns: `repeat(${m.size}, minmax(0, 1fr))` } });
      board.style.setProperty('--n', String(m.size));
      const cells: HTMLElement[][] = [];
      for (let y = 0; y < m.size; y++) {
        cells[y] = [];
        for (let x = 0; x < m.size; x++) {
          const isRock = m.rocks.has(k([x, y]));
          const c = h('div', { class: 'cell' + (isRock ? ' rock' : '') }, isRock ? '🪨' : '');
          cells[y][x] = c;
          board.append(c);
        }
      }
      cells[m.goal[1]][m.goal[0]].textContent = goalIcon;
      cells[m.goal[1]][m.goal[0]].classList.add('goal');
      if (m.key) {
        cells[m.key[1]][m.key[0]].textContent = KEY_ICON;
        cells[m.key[1]][m.key[0]].classList.add('key');
        cells[m.goal[1]][m.goal[0]].classList.add('locked');
      }
      const draw = () => {
        board.querySelectorAll('.hero').forEach((e) => e.remove());
        cells[pos[1]][pos[0]].append(h('span', { class: 'hero' }, hero));
        cells[pos[1]][pos[0]].classList.add('visited');
      };
      draw();

      const hintBtn = h('button', { class: 'hint-btn', type: 'button', 'aria-label': tr({ es: 'Pista', en: 'Hint', fr: 'Indice' }) }, ic('hint', 44), h('span', { class: 'hint-count' }, String(hintsLeft)));
      const pad = h('div', { class: 'dpad' },
        ...['up', 'left', 'right', 'down'].map((d) => h('button', { class: `dpad-btn dpad-${d}`, type: 'button', 'data-dir': d, 'aria-label': tr(DIR_LABEL[d]) }, ic(d, 40))));
      render(ctx,
        mi === 0 ? instruction(ctx, 'camino', fill(tr({ es: 'Lleva al explorador hasta {goal}. Las piedras no se pueden pisar. Piensa antes de moverte.', en: 'Take the explorer to {goal}. You cannot step on the stones. Think before you move.', fr: 'Emmène l’explorateur jusqu’à {goal}. On ne peut pas marcher sur les pierres. Réfléchis avant de bouger.' }), { goal: goalIcon }))
          : m.key ? instruction(ctx, KEY_ICON, fill(tr({ es: '¡Último camino, más difícil! Primero recoge la llave {key} y después ve hasta {goal}.', en: 'Last path, a harder one! First pick up the key {key}, then go to {goal}.', fr: 'Dernier chemin, plus difficile ! Ramasse d’abord la clé {key}, puis va jusqu’à {goal}.' }), { key: KEY_ICON, goal: goalIcon }))
          : null,
        board, h('div', { class: 'controls-row' }, pad, hintBtn));

      const tMapStart = now();
      let firstMove = true;
      while (!(pos[0] === m.goal[0] && pos[1] === m.goal[1]) && moves < maxMoves) {
        const action = await waitFor<string>(ctx, (done) => {
          pad.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => done(b.dataset.dir!)));
          hintBtn.onclick = () => done('hint');
          // También con las flechas del teclado (o W A S D).
          const onKey = (e: KeyboardEvent) => {
            const dir = KEY_DIRS[e.key];
            if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            e.preventDefault();
            done(dir);
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        });
        if (action === 'hint') {
          if (hintsLeft <= 0) {
            ctx.sfx('bad');
            continue;
          }
          hintsLeft--;
          hintsUsed++;
          if (mapErrors > 0) hintsAfterError++;
          else if (moves === 0) hintsBeforeTrying++;
          hintBtn.querySelector('.hint-count')!.textContent = String(hintsLeft);
          const path = fullPath(m, pos, hasKey);
          const next = path?.[1];
          if (next) {
            const c = cells[next[1]][next[0]];
            c.classList.add('hint');
            setTimeout(() => c.classList.remove('hint'), ctx.fast ? 10 : 1500);
          }
          continue;
        }
        if (firstMove) {
          firstMoveTimes.push(now() - tMapStart);
          firstMove = false;
        }
        const d = DIRS[action];
        const n: P = [pos[0] + d[0], pos[1] + d[1]];
        moves++;
        const lockedGoal = !hasKey && n[0] === m.goal[0] && n[1] === m.goal[1];
        if (lockedGoal) lockedTries++;
        if (n[0] < 0 || n[1] < 0 || n[0] >= m.size || n[1] >= m.size || m.rocks.has(k(n)) || lockedGoal) {
          errors++;
          mapErrors++;
          lastWasError = true;
          ctx.sfx('bad');
          flash(board, 'bad');
          continue;
        }
        if (lastWasError) recovered++;
        lastWasError = false;
        pos = n;
        if (!hasKey && m.key && pos[0] === m.key[0] && pos[1] === m.key[1]) {
          hasKey = true;
          keysCollected++;
          const kc = cells[pos[1]][pos[0]];
          kc.textContent = '';
          kc.classList.remove('key');
          cells[m.goal[1]][m.goal[0]].classList.remove('locked');
          ctx.sfx('ok');
          flash(board, 'ok');
        } else {
          ctx.sfx('tap');
        }
        draw();
      }
      totalMoves += moves;
      if (pos[0] === m.goal[0] && pos[1] === m.goal[1]) {
        mapsDone++;
        ctx.sfx('win');
        flash(board, 'ok');
        await wait(ctx, 900);
      } else {
        if (lastWasError) errorsThenStop++;
        // Enseñar el camino (sin penalizar visiblemente).
        for (const p of fullPath(m, pos, hasKey) ?? []) cells[p[1]][p[0]].classList.add('hint');
        await wait(ctx, 1500);
      }
    }
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('camino', ctx.level, start, [], { moves: totalMoves, errors, hints: hintsUsed });
  }

  const efficiency = totalMoves > 0 ? Math.min(1, totalMin / totalMoves) : 0;
  const meanFirst = firstMoveTimes.length ? firstMoveTimes.reduce((a, b) => a + b, 0) / firstMoveTimes.length : 0;
  // Planificar: ni impulsivo (< 0,8 s) ni bloqueado (> 20 s).
  const planTime = ctx.fast ? 0.6 : meanFirst < 800 ? 0.3 : meanFirst < 2000 ? 0.7 : meanFirst < 20000 ? 1 : 0.6;
  const errorRate = errors / Math.max(1, totalMoves);
  const completion = mapsDone / L.maps;
  // Reacción al error: corrige (bueno) o se queda atascado.
  const recovery = errors === 0 ? 1 : Math.min(1, recovered / errors);
  // Pedir ayuda cuando hace falta (tras error) es bueno; pedirla sin intentarlo, menos.
  const help = hintsUsed === 0 ? (errors > 3 ? 0.4 : 0.8) : (hintsAfterError + 0.5 * (hintsUsed - hintsAfterError - hintsBeforeTrying)) / hintsUsed;

  const planificacion = 0.5 * efficiency + 0.2 * planTime + 0.15 * (1 - errorRate) + 0.15 * levelRel(ctx);
  const autorregulacion = 0.5 * recovery + 0.3 * completion + 0.2 * Math.max(0, Math.min(1, help));
  const success = completion === 1 && efficiency >= 0.7 ? true : completion < 0.5 || efficiency < 0.35 ? false : null;
  return {
    gameId: 'camino',
    level: ctx.level,
    abandoned: false,
    success,
    personalMetric: Math.round(efficiency * 100) + mapsDone * 10 + ctx.level * 100,
    observations: [obs('planificacion', planificacion, 1), obs('autorregulacion', autorregulacion, 0.8)],
    metrics: {
      accuracy: completion * efficiency, efficiency, moves: totalMoves, minMoves: totalMin, errors, hints: hintsUsed,
      recovered, errorsThenStop, firstMoveMs: Math.round(meanFirst), mapsDone, maps: L.maps,
      keysCollected, lockedTries,
    },
    durationMs: now() - start,
  };
}

export const caminoGame: GameDef = {
  id: 'camino',
  name: { es: 'El camino del explorador', en: "The explorer's path", fr: "Le chemin de l'explorateur" },
  icon: '🧭',
  phase: 2,
  kind: 'proceso',
  dims: ['planificacion', 'autorregulacion'],
  predict: 'stars',
  teacherInfo: {
    es: 'Llevar al explorador a la meta esquivando piedras (con botones o flechas del teclado). En los niveles 4 y 5 el último mapa exige recoger antes una llave. Mide tiempo antes del primer movimiento, eficiencia, reacción al error y uso de pistas.',
    en: 'Guide the explorer to the goal avoiding stones (with the buttons or the arrow keys). At levels 4 and 5 the last map requires picking up a key first. Measures time before the first move, efficiency, reaction to mistakes and use of hints.',
    fr: 'Guider l’explorateur jusqu’au but en évitant les pierres (avec les boutons ou les flèches du clavier). Aux niveaux 4 et 5, le dernier plan oblige à ramasser d’abord une clé. Mesure le temps avant le premier mouvement, l’efficacité, la réaction à l’erreur et l’usage des indices.',
  },
  play,
};
