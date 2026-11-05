// Idiomas de la app. Todo texto visible o leído en voz alta pasa por aquí.
// Los contenidos usan objetos L = { es, en, fr } para que el compilador
// avise si falta una traducción.

export type Lang = 'es' | 'en' | 'fr';
export type L = Record<Lang, string>;

export const LANGS: { id: Lang; name: string; voice: string; locale: string }[] = [
  { id: 'es', name: 'Español', voice: 'es-ES', locale: 'es-ES' },
  { id: 'en', name: 'English', voice: 'en-GB', locale: 'en-GB' },
  { id: 'fr', name: 'Français', voice: 'fr-FR', locale: 'fr-FR' },
];

let current: Lang = 'es';
const listeners = new Set<(l: Lang) => void>();

export function isLang(x: unknown): x is Lang {
  return x === 'es' || x === 'en' || x === 'fr';
}

export function setLang(l: Lang): void {
  if (!isLang(l)) l = 'es';
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  for (const fn of listeners) fn(l);
}

export function getLang(): Lang {
  return current;
}

export function onLangChange(fn: (l: Lang) => void): void {
  listeners.add(fn);
}

export function locale(): string {
  return LANGS.find((x) => x.id === current)!.locale;
}

/** Traduce un texto multilingüe (o devuelve el texto tal cual). */
export function tr(x: L | string | undefined | null): string {
  if (x === undefined || x === null) return '';
  if (typeof x === 'string') return x;
  return x[current] ?? x.es ?? '';
}

/** Sustituye {nombre} por los parámetros. */
export function fill(text: string, params: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}
