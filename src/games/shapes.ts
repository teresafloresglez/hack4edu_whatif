// Formas y colores dibujados con SVG (sin imágenes externas: ligero y offline).

import type { L } from '../i18n';

export type ShapeId = 'circulo' | 'cuadrado' | 'triangulo' | 'estrella' | 'corazon' | 'rombo';

export const SHAPES: ShapeId[] = ['circulo', 'cuadrado', 'triangulo', 'estrella', 'corazon', 'rombo'];

export const SHAPE_NAME: Record<ShapeId, L> = {
  circulo: { es: 'círculo', en: 'circle', fr: 'cercle' },
  cuadrado: { es: 'cuadrado', en: 'square', fr: 'carré' },
  triangulo: { es: 'triángulo', en: 'triangle', fr: 'triangle' },
  estrella: { es: 'estrella', en: 'star', fr: 'étoile' },
  corazon: { es: 'corazón', en: 'heart', fr: 'cœur' },
  rombo: { es: 'rombo', en: 'diamond', fr: 'losange' },
};

export interface ColorDef {
  id: string;
  hex: string;
  name: L;
  /** colores "parecidos" con los que se puede confundir */
  similar: string[];
  /** grupo rojo/verde para detectar posibles dificultades de discriminación */
  rg?: 'r' | 'g';
}

export const COLORS: ColorDef[] = [
  { id: 'rojo', hex: '#d62828', name: { es: 'rojo', en: 'red', fr: 'rouge' }, similar: ['naranja', 'verde_oliva'], rg: 'r' },
  { id: 'verde', hex: '#2b9348', name: { es: 'verde', en: 'green', fr: 'vert' }, similar: ['verde_oliva', 'marron'], rg: 'g' },
  { id: 'azul', hex: '#1d4ed8', name: { es: 'azul', en: 'blue', fr: 'bleu' }, similar: ['morado', 'celeste'] },
  { id: 'amarillo', hex: '#f6c90e', name: { es: 'amarillo', en: 'yellow', fr: 'jaune' }, similar: ['naranja'] },
  { id: 'naranja', hex: '#f77f00', name: { es: 'naranja', en: 'orange', fr: 'orange' }, similar: ['rojo', 'amarillo'], rg: 'r' },
  { id: 'morado', hex: '#7b2cbf', name: { es: 'morado', en: 'purple', fr: 'violet' }, similar: ['azul'] },
  { id: 'celeste', hex: '#4cc9f0', name: { es: 'celeste', en: 'light blue', fr: 'bleu ciel' }, similar: ['azul'] },
  { id: 'verde_oliva', hex: '#8a8a1f', name: { es: 'verde oliva', en: 'olive green', fr: 'vert olive' }, similar: ['verde', 'marron', 'rojo'], rg: 'g' },
  { id: 'marron', hex: '#7f4f24', name: { es: 'marrón', en: 'brown', fr: 'marron' }, similar: ['verde_oliva', 'rojo'] },
];

export const BASIC_COLORS = ['rojo', 'verde', 'azul', 'amarillo', 'morado', 'naranja'];

export const COLOR_BY_ID: Record<string, ColorDef> = Object.fromEntries(COLORS.map((c) => [c.id, c]));

const PATHS: Record<ShapeId, string> = {
  circulo: '<circle cx="50" cy="50" r="40"/>',
  cuadrado: '<rect x="12" y="12" width="76" height="76" rx="6"/>',
  triangulo: '<polygon points="50,8 92,88 8,88"/>',
  estrella:
    '<polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38"/>',
  corazon: '<path d="M50 88 C10 60 4 34 22 20 C36 9 48 18 50 28 C52 18 64 9 78 20 C96 34 90 60 50 88Z"/>',
  rombo: '<polygon points="50,6 92,50 50,94 8,50"/>',
};

export function shapeSvg(shape: ShapeId, colorId: string, size = 64): string {
  const hex = COLOR_BY_ID[colorId]?.hex ?? '#888';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><g fill="${hex}" stroke="rgba(0,0,0,.25)" stroke-width="3">${PATHS[shape]}</g></svg>`;
}

export function shapeEl(shape: ShapeId, colorId: string, size = 64): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'shape';
  span.innerHTML = shapeSvg(shape, colorId, size);
  return span;
}
