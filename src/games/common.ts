import type { GameContext, GameOutcome, Observation } from '../core/types';
import { ic, hasIcon } from '../ui/icons';
import { t } from '../i18n/strings';

// Utilidades compartidas por todos los minijuegos.

type Child = Node | string | number | null | undefined | false;

/** Crea un elemento DOM: h('button', { class: 'x', onclick }, 'texto') */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v as EventListener);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export class AbortGame extends Error {
  constructor() {
    super('abandonado');
    this.name = 'AbortGame';
  }
}

export function isAbort(e: unknown): boolean {
  return e instanceof AbortGame || (e instanceof Error && e.name === 'AbortGame');
}

export function checkAbort(ctx: GameContext): void {
  if (ctx.exitSignal.aborted) throw new AbortGame();
}

/** Espera (más corta en modo de prueba). Lanza AbortGame si el niño sale. */
export function wait(ctx: GameContext, ms: number): Promise<void> {
  const real = ctx.fast ? Math.min(ms, 5) : ms;
  return new Promise((resolve, reject) => {
    if (ctx.exitSignal.aborted) return reject(new AbortGame());
    const t = setTimeout(() => {
      ctx.exitSignal.removeEventListener('abort', onAbort);
      resolve();
    }, real);
    const onAbort = () => {
      clearTimeout(t);
      reject(new AbortGame());
    };
    ctx.exitSignal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Espera a que ocurra algo (normalmente un toque). `setup` recibe `done`
 * y devuelve una función de limpieza. Opcionalmente con tiempo límite.
 */
export function waitFor<T>(
  ctx: GameContext,
  setup: (done: (v: T) => void) => void | (() => void),
  timeoutMs?: number,
  onTimeout?: () => T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (ctx.exitSignal.aborted) return reject(new AbortGame());
    let finished = false;
    let cleanup: void | (() => void);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const end = () => {
      finished = true;
      if (timer) clearTimeout(timer);
      ctx.exitSignal.removeEventListener('abort', onAbort);
      if (typeof cleanup === 'function') cleanup();
    };
    const done = (v: T) => {
      if (finished) return;
      end();
      resolve(v);
    };
    const onAbort = () => {
      if (finished) return;
      end();
      reject(new AbortGame());
    };
    ctx.exitSignal.addEventListener('abort', onAbort, { once: true });
    cleanup = setup(done);
    if (timeoutMs !== undefined && onTimeout) {
      const real = ctx.fast ? Math.min(timeoutMs, 30) : timeoutMs;
      timer = setTimeout(() => done(onTimeout()), real);
    }
  });
}

/** Icono de enunciado: dibujo SVG si existe con ese nombre; si no, el emoji tal cual. */
export function art(icon: string | Node, size = 44): Node {
  if (typeof icon !== 'string') return icon;
  return hasIcon(icon) ? ic(icon, size) : document.createTextNode(icon);
}

/** Muestra el enunciado (icono + texto según edad) y lo lee en voz alta. */
export function instruction(ctx: GameContext, icon: string | Node, text: string): HTMLElement {
  const box = h(
    'div',
    { class: 'instruction', role: 'note' },
    h('span', { class: 'instruction-icon', 'aria-hidden': 'true' }, art(icon)),
    h('span', { class: 'instruction-text' }, text),
    speakButton(ctx, text),
  );
  void ctx.say(text);
  return box;
}

/** Botón 🔊 (dibujo de altavoz) que repite un texto. */
export function speakButton(ctx: GameContext, text: string): HTMLButtonElement {
  return h('button', { class: 'speak-btn', type: 'button', 'aria-label': t('listenAgain'), 'data-noBot': 'true', onclick: () => void ctx.say(text) }, ic('speaker', 30));
}

/**
 * Confirmación con ✓ / ✗: muestra la opción elegida en grande, la LEE EN VOZ ALTA
 * (a veces el dibujo no basta) y espera a que el niño confirme (✓) o descarte (✗).
 */
export function confirmChoice(ctx: GameContext, opts: { picture: string | Node; text: string; yes?: string; no?: string }): Promise<boolean> {
  const yes = h('button', { class: 'confirm-btn yes', type: 'button', 'data-confirm': 'yes', 'aria-label': opts.yes ?? t('confirmYes') },
    ic('check', 64), h('span', { class: 'confirm-label' }, opts.yes ?? t('confirmYes')));
  const no = h('button', { class: 'confirm-btn no', type: 'button', 'data-confirm': 'no', 'aria-label': opts.no ?? t('confirmNo') },
    ic('cross', 64), h('span', { class: 'confirm-label' }, opts.no ?? t('confirmNo')));
  const pic = typeof opts.picture === 'string' && !hasIcon(opts.picture) ? h('span', { class: 'confirm-emoji' }, opts.picture) : art(opts.picture, 96);
  const speak = speakButton(ctx, opts.text);
  const overlay = h('div', { class: 'confirm-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.text },
    h('div', { class: 'confirm-card' },
      h('div', { class: 'confirm-picture' }, pic),
      h('p', { class: 'confirm-text' }, opts.text),
      speak,
      h('div', { class: 'confirm-actions' }, no, yes)));
  // Con teclado: el foco pasa al diálogo (al 🔊, para no confirmar sin querer) y vuelve a la tarjeta al cerrarlo; Esc = ✗.
  const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  ctx.root.append(overlay);
  void ctx.say(opts.text);
  return waitFor<boolean>(ctx, (done) => {
    yes.onclick = () => { ctx.sfx('ok'); done(true); };
    no.onclick = () => { ctx.sfx('tap'); done(false); };
    overlay.onkeydown = (e) => { if (e.key === 'Escape') { e.preventDefault(); done(false); } };
    speak.focus();
    return () => {
      overlay.remove();
      if (prevFocus && prevFocus.isConnected) prevFocus.focus();
    };
  });
}

/** Limpia la zona de juego y coloca nuevos elementos. */
export function render(ctx: GameContext, ...children: Child[]): void {
  ctx.root.replaceChildren();
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    ctx.root.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

/** Pequeña animación de feedback positivo/negativo (sin texto). */
export function flash(el: HTMLElement, kind: 'ok' | 'bad'): void {
  el.classList.remove('flash-ok', 'flash-bad', 'wrong');
  void el.offsetWidth;
  el.classList.add(kind === 'ok' ? 'flash-ok' : 'flash-bad');
  if (el.classList.contains('board')) {
    // El tablero solo avisa un momento: el niño sigue jugando en él.
    setTimeout(() => el.classList.remove('flash-ok', 'flash-bad'), 600);
    return;
  }
  // Lo que el niño ha elegido mal se queda en rojo hasta la siguiente pregunta.
  if (kind === 'bad') el.classList.add('wrong');
}

export function obs(dim: Observation['dim'], value: number, weight = 1): Observation {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return { dim, value: v, weight: Math.max(0.05, Math.min(1, weight)) };
}

export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Velocidad relativa (1 = muy rápido, 0 = muy lento) frente a lo esperado para su edad. */
export function speedScore(ms: number, expectedMs: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0.5;
  const ratio = ms / expectedMs;
  return Math.max(0, Math.min(1, 1.25 - 0.5 * ratio));
}

/** Plantilla de resultado de abandono. */
export function abandonedOutcome(
  gameId: string,
  level: number,
  start: number,
  observations: Observation[] = [],
  metrics: Record<string, number> = {},
): GameOutcome {
  return {
    gameId,
    level,
    abandoned: true,
    success: false,
    personalMetric: 0,
    observations: [...observations, obs('autorregulacion', 0.25, 0.5)],
    metrics: { ...metrics, abandoned: 1 },
    durationMs: now() - start,
  };
}

/** Tiempos esperados por respuesta según la edad (ms). */
export function expectedResponseMs(ctx: GameContext): number {
  return ctx.ageBand === 'young' ? 4500 : 3200;
}

/** Botón grande de "¡Listo!" con icono. */
export function doneButton(label?: string): HTMLButtonElement {
  const text = label ?? t('done');
  return h('button', { class: 'big-btn done-btn', type: 'button', 'data-done': 'true', 'aria-label': text }, ic('check', 40), h('span', { class: 'btn-label' }, text));
}

/** Dificultad relativa a lo esperado para su edad (0.5 = nivel de entrada de su edad). */
export function levelRel(ctx: GameContext): number {
  const entry = ctx.student.age <= 7 ? 1 : ctx.student.age === 8 ? 2 : 3;
  return Math.max(0, Math.min(1, 0.5 + (ctx.level - entry) * 0.15));
}

/** Logro/fallo para juegos con respuesta correcta. */
export function closedSuccess(accuracy: number): boolean | null {
  if (accuracy >= 0.8) return true;
  if (accuracy < 0.5) return false;
  return null;
}
