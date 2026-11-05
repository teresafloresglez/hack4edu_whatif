import type { Theme } from '../core/types';

// El tema lo elige el niño (ABP). Decide la pregunta guía, el producto final
// y los objetos con los que se "visten" los minijuegos.
export const THEMES: Theme[] = [
  {
    id: 'parque',
    name: { es: 'El parque', en: 'The park', fr: 'Le parc' },
    icon: '🌳',
    question: {
      es: '¿Y si tuvieras que diseñar el parque de tu barrio?',
      en: 'What if you had to design the park in your neighbourhood?',
      fr: 'Et si tu devais dessiner le parc de ton quartier ?',
    },
    product: { es: 'tu parque', en: 'your park', fr: 'ton parc' },
    productBase: '🏞️',
    items: ['🌳', '🌻', '🛝', '⛲', '🐦', '🦋', '🌈', '🏡', '🪁', '🐿️'],
    bg: '#d8f3dc',
  },
  {
    id: 'animales',
    name: { es: 'Animales', en: 'Animals', fr: 'Les animaux' },
    icon: '🐘',
    question: {
      es: '¿Y si tuvieras que cuidar un refugio de animales?',
      en: 'What if you had to look after an animal shelter?',
      fr: "Et si tu devais t'occuper d'un refuge pour animaux ?",
    },
    product: { es: 'tu refugio de animales', en: 'your animal shelter', fr: 'ton refuge pour animaux' },
    productBase: '🏕️',
    items: ['🐘', '🦒', '🐢', '🐒', '🦜', '🐄', '🐐', '🦓', '🐓', '🐕'],
    bg: '#fde2c3',
  },
  {
    id: 'espacio',
    name: { es: 'El espacio', en: 'Space', fr: "L'espace" },
    icon: '🚀',
    question: {
      es: '¿Y si tuvieras que construir una ciudad en la Luna?',
      en: 'What if you had to build a city on the Moon?',
      fr: 'Et si tu devais construire une ville sur la Lune ?',
    },
    product: { es: 'tu ciudad en la Luna', en: 'your city on the Moon', fr: 'ta ville sur la Lune' },
    productBase: '🌌',
    items: ['🚀', '🌙', '⭐', '🪐', '👽', '🛸', '☄️', '🛰️', '🌍', '👩‍🚀'],
    bg: '#d6d3f0',
  },
  {
    id: 'futbol',
    name: { es: 'Fútbol', en: 'Football', fr: 'Le football' },
    icon: '⚽',
    question: {
      es: '¿Y si tuvieras que organizar un campeonato en tu pueblo?',
      en: 'What if you had to organise a tournament in your village?',
      fr: 'Et si tu devais organiser un tournoi dans ton village ?',
    },
    product: { es: 'tu campeonato', en: 'your tournament', fr: 'ton tournoi' },
    productBase: '🏟️',
    items: ['⚽', '🥅', '🏆', '👟', '🎽', '🥇', '📣', '🧃', '🎉', '🧤'],
    bg: '#cfeef7',
  },
  {
    id: 'cocina',
    name: { es: 'Cocina', en: 'Cooking', fr: 'La cuisine' },
    icon: '🍲',
    question: {
      es: '¿Y si tuvieras que preparar una gran comida para todo el pueblo?',
      en: 'What if you had to cook a big meal for the whole village?',
      fr: 'Et si tu devais préparer un grand repas pour tout le village ?',
    },
    product: { es: 'tu gran comida', en: 'your big meal', fr: 'ton grand repas' },
    productBase: '🍽️',
    items: ['🍲', '🥕', '🍅', '🧅', '🥚', '🍚', '🫓', '🥘', '🧄', '🥥'],
    bg: '#fbe0e0',
  },
];

export const THEME_BY_ID: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));

export function getTheme(id: string): Theme {
  return THEME_BY_ID[id] ?? THEMES[0];
}
