import type { Culture } from '../core/types';

// Paquetes culturales por región: objetos, comida, nombres y personajes
// cambiables. La originalidad se compara SOLO con niños de la misma región.

const FRUIT = {
  naranja: { id: 'naranja', emoji: '🍊', the: { es: 'la naranja', en: 'the orange', fr: "l'orange" }, pron: { es: 'la', en: 'it', fr: 'la' } },
  mango: { id: 'mango', emoji: '🥭', the: { es: 'el mango', en: 'the mango', fr: 'la mangue' }, pron: { es: 'lo', en: 'it', fr: 'la' } },
  platano: { id: 'platano', emoji: '🍌', the: { es: 'el plátano', en: 'the banana', fr: 'la banane' }, pron: { es: 'lo', en: 'it', fr: 'la' } },
} satisfies Record<string, Culture['fruit']>;

const OBJ = {
  cubo: { id: 'cubo', emoji: '🪣', name: { es: 'un cubo', en: 'a bucket', fr: 'un seau' } },
  lata: { id: 'lata', emoji: '🥫', name: { es: 'una lata', en: 'a tin can', fr: 'une boîte de conserve' } },
  cesta: { id: 'cesta', emoji: '🧺', name: { es: 'una cesta', en: 'a basket', fr: 'un panier' } },
  coco: { id: 'coco', emoji: '🥥', name: { es: 'un coco', en: 'a coconut', fr: 'une noix de coco' } },
  palo: { id: 'palo', emoji: '🪵', name: { es: 'un palo', en: 'a stick', fr: 'un bâton' } },
  calcetin: { id: 'calcetin', emoji: '🧦', name: { es: 'un calcetín', en: 'a sock', fr: 'une chaussette' } },
} satisfies Record<string, Culture['objects'][number]>;

// Personajes sin tono de piel: la región no se distingue por colores.
const PEOPLE = ['👧', '👦', '👩', '👨'];

export const CULTURES: Culture[] = [
  {
    id: 'africa',
    name: { es: 'África', en: 'Africa', fr: 'Afrique' },
    names: ['Amina', 'Kofi', 'Fatou', 'Juma', 'Zawadi', 'Kwame'],
    fruit: FRUIT.mango,
    treats: { emoji: '🥜', name: { es: 'cacahuetes', en: 'peanuts', fr: 'cacahuètes' } },
    objects: [OBJ.cubo, OBJ.coco, OBJ.palo],
    food: ['🍠', '🥜', '🍌', '🥭', '🌽'],
    people: PEOPLE,
  },
  {
    id: 'america',
    name: { es: 'América', en: 'America', fr: 'Amérique' },
    names: ['Lucía', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Diego'],
    fruit: FRUIT.naranja,
    treats: { emoji: '🍬', name: { es: 'caramelos', en: 'sweets', fr: 'bonbons' } },
    objects: [OBJ.cubo, OBJ.lata, OBJ.cesta],
    food: ['🌽', '🫘', '🥑', '🍌', '🥭'],
    people: PEOPLE,
  },
  {
    id: 'asia',
    name: { es: 'Asia', en: 'Asia', fr: 'Asie' },
    names: ['Priya', 'Arjun', 'Mei', 'Kenji', 'Meera', 'Ravi'],
    fruit: FRUIT.mango,
    treats: { emoji: '🍬', name: { es: 'dulces', en: 'sweets', fr: 'friandises' } },
    objects: [OBJ.cubo, OBJ.coco, OBJ.cesta],
    food: ['🍚', '🥭', '🍌', '🫓', '🌶️'],
    people: PEOPLE,
  },
  {
    id: 'europa',
    name: { es: 'Europa', en: 'Europe', fr: 'Europe' },
    names: ['Sara', 'Leo', 'Nora', 'Hugo', 'Alba', 'Pablo'],
    fruit: FRUIT.naranja,
    treats: { emoji: '🍬', name: { es: 'caramelos', en: 'sweets', fr: 'bonbons' } },
    objects: [OBJ.cubo, OBJ.lata, OBJ.calcetin],
    food: ['🍎', '🍞', '🍌', '🥕', '🧀'],
    people: PEOPLE,
  },
  {
    id: 'oceania',
    name: { es: 'Oceanía', en: 'Oceania', fr: 'Océanie' },
    names: ['Mia', 'Jack', 'Aroha', 'Tane', 'Isla', 'Kai'],
    fruit: FRUIT.platano,
    treats: { emoji: '🍪', name: { es: 'galletas', en: 'biscuits', fr: 'biscuits' } },
    objects: [OBJ.cubo, OBJ.coco, OBJ.cesta],
    food: ['🥥', '🍌', '🐟', '🍠', '🍍'],
    people: PEOPLE,
  },
];

/** Regiones de versiones anteriores → continente (para no perder alumnos guardados). */
const LEGACY_REGION: Record<string, string> = {
  latam: 'america',
  africa_oeste: 'africa',
  africa_este: 'africa',
  asia_sur: 'asia',
  general: 'europa',
};

export function normalizeRegionId(id: string | undefined): string {
  if (id && CULTURES.some((c) => c.id === id)) return id;
  return (id && LEGACY_REGION[id]) || 'america';
}

export const CULTURE_BY_ID: Record<string, Culture> = Object.fromEntries(CULTURES.map((c) => [c.id, c]));

export function getCulture(id: string): Culture {
  return CULTURE_BY_ID[normalizeRegionId(id)];
}
