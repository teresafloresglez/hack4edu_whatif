import type { GameContext, GameDef, GameOutcome, Student } from '../src/core/types';
import { makeRng } from '../src/core/rng';
import { getCulture } from '../src/data/cultures';
import { getTheme } from '../src/data/themes';
import { gameName } from '../src/games/registry';

/**
 * "Monkey tester": juega pulsando botones al azar (como un niño de 6 años
 * que toca todo) hasta que el juego termina. Si un juego se cuelga o lanza
 * un error, la prueba falla.
 */
export async function botPlay(
  game: GameDef,
  student: Student,
  opts: { level?: number; seed?: number; maxClicks?: number; abortAfter?: number; root?: HTMLElement; ctxExtra?: Partial<GameContext> } = {},
): Promise<{ outcome: GameOutcome; clicks: number }> {
  const root = opts.root ?? document.createElement('div');
  document.body.append(root);
  const ac = new AbortController();
  const rng = makeRng(opts.seed ?? 1);
  const botRng = makeRng((opts.seed ?? 1) * 7919 + 13);
  const ctx: GameContext = {
    root,
    student,
    level: opts.level ?? 1,
    ageBand: student.age <= 7 ? 'young' : 'old',
    culture: getCulture(student.regionId),
    theme: getTheme('parque'),
    rng,
    say: () => Promise.resolve(),
    sfx: () => {},
    exitSignal: ac.signal,
    fast: true,
    gameName,
    ...opts.ctxExtra,
  };
  let finished = false;
  let error: unknown = null;
  let outcome: GameOutcome | null = null;
  const p = game.play(ctx).then(
    (o) => { outcome = o; finished = true; },
    (e) => { error = e; finished = true; },
  );
  let clicks = 0;
  const max = opts.maxClicks ?? 3000;
  while (!finished && clicks < max) {
    await new Promise((r) => setTimeout(r, 1));
    if (finished) break;
    if (opts.abortAfter !== undefined && clicks >= opts.abortAfter) {
      ac.abort();
      await new Promise((r) => setTimeout(r, 5));
      continue;
    }
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && !b.hasAttribute('data-nobot'));
    if (!buttons.length) continue;
    // Pulsar "¡Listo!" con menos frecuencia para que el bot también elija cosas.
    const nonDone = buttons.filter((b) => !b.hasAttribute('data-done'));
    const pool = nonDone.length && botRng() < 0.85 ? nonDone : buttons;
    pool[Math.floor(botRng() * pool.length)].click();
    clicks++;
  }
  await Promise.race([p, new Promise((r) => setTimeout(r, 200))]);
  root.remove();
  if (error) throw error;
  if (!outcome) throw new Error(`${game.id} no terminó tras ${clicks} toques (nivel ${ctx.level})`);
  return { outcome, clicks };
}
