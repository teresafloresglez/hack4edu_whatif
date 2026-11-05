import type { L } from '../i18n';

// Banco de tarjetas etiquetadas para los juegos de respuesta abierta.
// Cada tarjeta: categoría (flexibilidad) y frecuencia previa estimada
// (proporción de niños que la eligen) por región (originalidad).
// Las frecuencias se van corrigiendo con los niños reales del dispositivo.

export type IdeaCategory =
  | 'comida'
  | 'juego'
  | 'casa'
  | 'transporte'
  | 'naturaleza'
  | 'ayudar'
  | 'arte'
  | 'inventar'
  | 'cuerpo'
  | 'sinsentido';

export const CATEGORY_LABEL: Record<IdeaCategory, L> = {
  comida: { es: 'Comida', en: 'Food', fr: 'Nourriture' },
  juego: { es: 'Juego', en: 'Play', fr: 'Jeu' },
  casa: { es: 'Casa y refugio', en: 'Home and shelter', fr: 'Maison et abri' },
  transporte: { es: 'Moverse', en: 'Getting around', fr: 'Se déplacer' },
  naturaleza: { es: 'Naturaleza', en: 'Nature', fr: 'Nature' },
  ayudar: { es: 'Ayudar a otros', en: 'Helping others', fr: 'Aider les autres' },
  arte: { es: 'Arte y música', en: 'Art and music', fr: 'Art et musique' },
  inventar: { es: 'Inventar', en: 'Inventing', fr: 'Inventer' },
  cuerpo: { es: 'Cuerpo y sentidos', en: 'Body and senses', fr: 'Corps et sens' },
  sinsentido: { es: 'Sin sentido', en: 'Nonsense', fr: 'Absurde' },
};

export interface IdeaCard {
  id: string;
  emoji: string;
  text: L;
  cat: IdeaCategory;
  /** frecuencia previa por defecto (0..1) */
  f: number;
  /** frecuencias previas que cambian según la región */
  fr?: Record<string, number>;
  /** respuesta sin sentido (uso imposible): no cuenta como idea válida */
  nonsense?: boolean;
}

export interface IdeaPrompt {
  id: string;
  /** 1 = cotidiana … 3 = muy absurda */
  absurdity: 1 | 2 | 3;
  emoji: string;
  question: L;
  cards: IdeaCard[];
}

export const WHAT_IF_PROMPTS: IdeaPrompt[] = [
  {
    id: 'lluvia',
    absurdity: 1,
    emoji: '🌧️',
    question: {
      es: '¿Qué pasaría si lloviera todo el día en tu pueblo?',
      en: 'What would happen if it rained all day in your village?',
      fr: "Que se passerait-il s'il pleuvait toute la journée dans ton village ?",
    },
    cards: [
      { id: 'lluvia_charcos', emoji: '💦', text: { es: 'Saltaríamos en los charcos', en: 'We would jump in the puddles', fr: 'On sauterait dans les flaques' }, cat: 'juego', f: 0.7 },
      { id: 'lluvia_casa', emoji: '🏠', text: { es: 'Nos quedaríamos en casa', en: 'We would stay at home', fr: 'On resterait à la maison' }, cat: 'casa', f: 0.75 },
      { id: 'lluvia_plantas', emoji: '🌱', text: { es: 'Las plantas crecerían mucho', en: 'The plants would grow a lot', fr: 'Les plantes pousseraient beaucoup' }, cat: 'naturaleza', f: 0.45 },
      { id: 'lluvia_barco', emoji: '⛵', text: { es: 'Haríamos barcos de papel', en: 'We would make paper boats', fr: 'On ferait des bateaux en papier' }, cat: 'juego', f: 0.3 },
      { id: 'lluvia_agua', emoji: '🪣', text: { es: 'Guardaríamos agua para beber', en: 'We would save water to drink', fr: "On garderait de l'eau pour boire" }, cat: 'ayudar', f: 0.35, fr: { africa: 0.6 } },
      { id: 'lluvia_musica', emoji: '🥁', text: { es: 'Haríamos música con las gotas', en: 'We would make music with the raindrops', fr: 'On ferait de la musique avec les gouttes' }, cat: 'arte', f: 0.08 },
      { id: 'lluvia_ranas', emoji: '🐸', text: { es: 'Saldrían muchas ranas', en: 'Lots of frogs would come out', fr: 'Plein de grenouilles sortiraient' }, cat: 'naturaleza', f: 0.2 },
      { id: 'lluvia_paraguas', emoji: '☂️', text: { es: 'Inventaría un paraguas gigante para todos', en: 'I would invent a giant umbrella for everyone', fr: 'J’inventerais un parapluie géant pour tout le monde' }, cat: 'inventar', f: 0.1 },
      { id: 'lluvia_vecinos', emoji: '🤝', text: { es: 'Ayudaríamos a los vecinos con goteras', en: 'We would help neighbours with leaky roofs', fr: 'On aiderait les voisins qui ont des fuites' }, cat: 'ayudar', f: 0.12 },
      { id: 'lluvia_frio', emoji: '🥶', text: { es: 'Tendríamos frío y nos taparíamos', en: 'We would feel cold and wrap up warm', fr: 'On aurait froid et on se couvrirait' }, cat: 'cuerpo', f: 0.4 },
    ],
  },
  {
    id: 'mercado',
    absurdity: 1,
    emoji: '🧺',
    question: {
      es: '¿Qué pasaría si te encargaras de vender en el mercado un día?',
      en: 'What would happen if you ran a stall at the market for a day?',
      fr: 'Que se passerait-il si tu tenais un stand au marché pendant une journée ?',
    },
    cards: [
      { id: 'merc_fruta', emoji: '🍌', text: { es: 'Vendería fruta', en: 'I would sell fruit', fr: 'Je vendrais des fruits' }, cat: 'comida', f: 0.75 },
      { id: 'merc_cantar', emoji: '🎤', text: { es: 'Cantaría para que vinieran clientes', en: 'I would sing so customers would come', fr: 'Je chanterais pour attirer les clients' }, cat: 'arte', f: 0.1 },
      { id: 'merc_regalo', emoji: '🎁', text: { es: 'Regalaría algo a los más pobres', en: 'I would give something to the poorest people', fr: 'Je donnerais quelque chose aux plus pauvres' }, cat: 'ayudar', f: 0.18 },
      { id: 'merc_cartel', emoji: '🎨', text: { es: 'Pintaría un cartel bonito', en: 'I would paint a pretty sign', fr: 'Je peindrais une jolie pancarte' }, cat: 'arte', f: 0.2 },
      { id: 'merc_cuentas', emoji: '🧮', text: { es: 'Contaría bien el dinero', en: 'I would count the money carefully', fr: "Je compterais bien l'argent" }, cat: 'inventar', f: 0.4 },
      { id: 'merc_juego', emoji: '🎲', text: { es: 'Haría un juego para ganar premios', en: 'I would make a game to win prizes', fr: 'Je ferais un jeu pour gagner des prix' }, cat: 'juego', f: 0.12 },
      { id: 'merc_bici', emoji: '🚲', text: { es: 'Llevaría la comida a casa de la gente', en: "I would take the food to people's homes", fr: 'J’apporterais la nourriture chez les gens' }, cat: 'transporte', f: 0.09 },
      { id: 'merc_comer', emoji: '😋', text: { es: 'Me comería parte de la fruta', en: 'I would eat some of the fruit', fr: 'Je mangerais une partie des fruits' }, cat: 'cuerpo', f: 0.35 },
      { id: 'merc_sombra', emoji: '⛱️', text: { es: 'Pondría sombra para no tener calor', en: 'I would put up some shade to keep cool', fr: "J’installerais de l'ombre pour ne pas avoir chaud" }, cat: 'casa', f: 0.22 },
    ],
  },
  {
    id: 'animales_hablan',
    absurdity: 2,
    emoji: '🐐',
    question: {
      es: '¿Qué pasaría si los animales pudieran hablar?',
      en: 'What would happen if animals could talk?',
      fr: 'Que se passerait-il si les animaux pouvaient parler ?',
    },
    cards: [
      { id: 'anim_amigos', emoji: '🐶', text: { es: 'Seríamos amigos y charlaríamos', en: 'We would be friends and chat', fr: 'On serait amis et on bavarderait' }, cat: 'juego', f: 0.7 },
      { id: 'anim_dolor', emoji: '🩹', text: { es: 'Nos dirían cuándo están enfermos', en: 'They would tell us when they are ill', fr: 'Ils nous diraient quand ils sont malades' }, cat: 'ayudar', f: 0.3 },
      { id: 'anim_comida', emoji: '🌾', text: { es: 'Pedirían su comida favorita', en: 'They would ask for their favourite food', fr: 'Ils demanderaient leur nourriture préférée' }, cat: 'comida', f: 0.45 },
      { id: 'anim_secretos', emoji: '🤫', text: { es: 'Nos contarían secretos del bosque', en: 'They would tell us secrets of the forest', fr: 'Ils nous raconteraient les secrets de la forêt' }, cat: 'naturaleza', f: 0.15 },
      { id: 'anim_cantar', emoji: '🎶', text: { es: 'Cantarían canciones con nosotros', en: 'They would sing songs with us', fr: 'Ils chanteraient des chansons avec nous' }, cat: 'arte', f: 0.2 },
      { id: 'anim_escuela', emoji: '🏫', text: { es: 'Irían a la escuela', en: 'They would go to school', fr: "Ils iraient à l'école" }, cat: 'casa', f: 0.25 },
      { id: 'anim_quejas', emoji: '😠', text: { es: 'Se quejarían de cómo los tratamos', en: 'They would complain about how we treat them', fr: 'Ils se plaindraient de la façon dont on les traite' }, cat: 'ayudar', f: 0.1 },
      { id: 'anim_lluvia', emoji: '⛈️', text: { es: 'Avisarían cuando va a llover', en: 'They would warn us when it is going to rain', fr: 'Ils nous préviendraient quand il va pleuvoir' }, cat: 'naturaleza', f: 0.06 },
      { id: 'anim_taxi', emoji: '🐴', text: { es: 'Nos llevarían de viaje si se lo pedimos', en: 'They would take us on trips if we asked', fr: 'Ils nous emmèneraient en voyage si on leur demandait' }, cat: 'transporte', f: 0.12 },
      { id: 'anim_traductor', emoji: '📻', text: { es: 'Inventaría una máquina para entenderlos a todos', en: 'I would invent a machine to understand them all', fr: 'J’inventerais une machine pour tous les comprendre' }, cat: 'inventar', f: 0.05 },
    ],
  },
  {
    id: 'escuela_arbol',
    absurdity: 2,
    emoji: '🌳',
    question: {
      es: '¿Qué pasaría si la escuela estuviera encima de un árbol gigante?',
      en: 'What would happen if your school was at the top of a giant tree?',
      fr: "Que se passerait-il si l'école était en haut d'un arbre géant ?",
    },
    cards: [
      { id: 'arbol_escalera', emoji: '🪜', text: { es: 'Subiríamos con escaleras', en: 'We would climb up ladders', fr: 'On monterait avec des échelles' }, cat: 'transporte', f: 0.6 },
      { id: 'arbol_columpio', emoji: '🛝', text: { es: 'Bajaríamos por un tobogán', en: 'We would go down a slide', fr: 'On descendrait par un toboggan' }, cat: 'juego', f: 0.35 },
      { id: 'arbol_fruta', emoji: '🍎', text: { es: 'Comeríamos fruta del árbol', en: 'We would eat fruit from the tree', fr: "On mangerait les fruits de l'arbre" }, cat: 'comida', f: 0.4 },
      { id: 'arbol_pajaros', emoji: '🐦', text: { es: 'Los pájaros serían compañeros de clase', en: 'The birds would be our classmates', fr: 'Les oiseaux seraient nos camarades de classe' }, cat: 'naturaleza', f: 0.18 },
      { id: 'arbol_miedo', emoji: '😨', text: { es: 'Algunos tendrían miedo a la altura', en: 'Some children would be scared of heights', fr: 'Certains auraient peur du vide' }, cat: 'cuerpo', f: 0.3 },
      { id: 'arbol_ascensor', emoji: '🧺', text: { es: 'Haríamos un ascensor con una cesta y una cuerda', en: 'We would make a lift with a basket and a rope', fr: 'On ferait un ascenseur avec un panier et une corde' }, cat: 'inventar', f: 0.07 },
      { id: 'arbol_regar', emoji: '💧', text: { es: 'Tendríamos que cuidar y regar el árbol', en: 'We would have to look after and water the tree', fr: "On devrait prendre soin de l'arbre et l'arroser" }, cat: 'ayudar', f: 0.1 },
      { id: 'arbol_vista', emoji: '🔭', text: { es: 'Veríamos todo el pueblo desde arriba', en: 'We would see the whole village from above', fr: "On verrait tout le village d'en haut" }, cat: 'naturaleza', f: 0.25 },
      { id: 'arbol_casa', emoji: '🏡', text: { es: 'Construiríamos casitas en las ramas', en: 'We would build little houses in the branches', fr: 'On construirait des cabanes dans les branches' }, cat: 'casa', f: 0.2 },
    ],
  },
  {
    id: 'sin_noche',
    absurdity: 3,
    emoji: '☀️',
    question: {
      es: '¿Qué pasaría si nunca se hiciera de noche?',
      en: 'What would happen if night never came?',
      fr: "Que se passerait-il si la nuit ne tombait jamais ?",
    },
    cards: [
      { id: 'noche_jugar', emoji: '⚽', text: { es: 'Jugaríamos todo el tiempo', en: 'We would play all the time', fr: 'On jouerait tout le temps' }, cat: 'juego', f: 0.65 },
      { id: 'noche_dormir', emoji: '😴', text: { es: 'No sabríamos cuándo dormir', en: 'We would not know when to sleep', fr: 'On ne saurait pas quand dormir' }, cat: 'cuerpo', f: 0.45 },
      { id: 'noche_estrellas', emoji: '✨', text: { es: 'Echaríamos de menos las estrellas', en: 'We would miss the stars', fr: 'Les étoiles nous manqueraient' }, cat: 'naturaleza', f: 0.15 },
      { id: 'noche_calor', emoji: '🥵', text: { es: 'Haría muchísimo calor', en: 'It would be very, very hot', fr: 'Il ferait très, très chaud' }, cat: 'naturaleza', f: 0.35 },
      { id: 'noche_gafas', emoji: '🕶️', text: { es: 'Inventaría unas gafas para crear la noche', en: 'I would invent glasses that make it night', fr: 'J’inventerais des lunettes pour créer la nuit' }, cat: 'inventar', f: 0.05 },
      { id: 'noche_cosecha', emoji: '🌽', text: { es: 'Las plantas crecerían sin parar', en: 'The plants would never stop growing', fr: "Les plantes pousseraient sans s'arrêter" }, cat: 'comida', f: 0.15 },
      { id: 'noche_turnos', emoji: '🔁', text: { es: 'Dormiríamos por turnos para cuidar el pueblo', en: 'We would take turns sleeping to look after the village', fr: 'On dormirait chacun son tour pour veiller sur le village' }, cat: 'ayudar', f: 0.06 },
      { id: 'noche_sombra', emoji: '⛺', text: { es: 'Haríamos cuevas oscuras para descansar', en: 'We would make dark caves to rest in', fr: 'On ferait des grottes sombres pour se reposer' }, cat: 'casa', f: 0.1 },
      { id: 'noche_buhos', emoji: '🦉', text: { es: 'Los búhos estarían muy confundidos', en: 'The owls would be very confused', fr: 'Les hiboux seraient tout perdus' }, cat: 'naturaleza', f: 0.12 },
      { id: 'noche_dibujo', emoji: '🖍️', text: { es: 'Pintaríamos el cielo de colores', en: 'We would paint the sky in colours', fr: 'On peindrait le ciel de toutes les couleurs' }, cat: 'arte', f: 0.08 },
    ],
  },
  {
    id: 'casa_vuela',
    absurdity: 3,
    emoji: '🎈',
    question: {
      es: '¿Qué pasaría si tu casa pudiera volar?',
      en: 'What would happen if your house could fly?',
      fr: 'Que se passerait-il si ta maison pouvait voler ?',
    },
    cards: [
      { id: 'vuela_viajar', emoji: '🗺️', text: { es: 'Viajaríamos a otros países', en: 'We would travel to other countries', fr: "On voyagerait dans d'autres pays" }, cat: 'transporte', f: 0.7 },
      { id: 'vuela_familia', emoji: '👵', text: { es: 'Iríamos a visitar a la familia lejana', en: 'We would visit family who live far away', fr: 'On irait voir la famille qui habite loin' }, cat: 'ayudar', f: 0.25 },
      { id: 'vuela_nubes', emoji: '☁️', text: { es: 'Tocaríamos las nubes', en: 'We would touch the clouds', fr: 'On toucherait les nuages' }, cat: 'cuerpo', f: 0.35 },
      { id: 'vuela_miedo', emoji: '😱', text: { es: 'Nos daría miedo caernos', en: 'We would be scared of falling', fr: 'On aurait peur de tomber' }, cat: 'cuerpo', f: 0.3 },
      { id: 'vuela_volante', emoji: '🎡', text: { es: 'Le pondría un volante para dirigirla', en: 'I would add a steering wheel to drive it', fr: 'J’ajouterais un volant pour la diriger' }, cat: 'inventar', f: 0.12 },
      { id: 'vuela_agua', emoji: '💧', text: { es: 'Llevaríamos agua a donde no llueve', en: 'We would take water to places where it never rains', fr: "On apporterait de l'eau là où il ne pleut pas" }, cat: 'ayudar', f: 0.06 },
      { id: 'vuela_pajaros', emoji: '🦅', text: { es: 'Volaríamos con los pájaros', en: 'We would fly with the birds', fr: 'On volerait avec les oiseaux' }, cat: 'naturaleza', f: 0.2 },
      { id: 'vuela_fiesta', emoji: '🎉', text: { es: 'Haríamos una fiesta en el cielo', en: 'We would have a party in the sky', fr: 'On ferait une fête dans le ciel' }, cat: 'juego', f: 0.15 },
      { id: 'vuela_huerto', emoji: '🥕', text: { es: 'Tendríamos un huerto en el tejado', en: 'We would have a vegetable garden on the roof', fr: 'On aurait un potager sur le toit' }, cat: 'comida', f: 0.05 },
      { id: 'vuela_luna', emoji: '🌙', text: { es: 'Llegaríamos hasta la Luna', en: 'We would fly all the way to the Moon', fr: "On irait jusqu'à la Lune" }, cat: 'transporte', f: 0.18 },
    ],
  },
];

/** Bancos de "mil usos" por id de objeto (ver `objects` en cultures.ts). */
export const USES_BANK: Record<string, IdeaCard[]> = {
  cubo: [
    { id: 'cubo_agua', emoji: '💧', text: { es: 'Llevar agua', en: 'Carry water', fr: "Porter de l'eau" }, cat: 'ayudar', f: 0.85 },
    { id: 'cubo_tambor', emoji: '🥁', text: { es: 'Hacer un tambor', en: 'Make a drum', fr: 'Faire un tambour' }, cat: 'arte', f: 0.25 },
    { id: 'cubo_sombrero', emoji: '🎩', text: { es: 'Ponérmelo de sombrero', en: 'Wear it as a hat', fr: 'Le mettre comme chapeau' }, cat: 'cuerpo', f: 0.15 },
    { id: 'cubo_maceta', emoji: '🌱', text: { es: 'Plantar una flor', en: 'Plant a flower in it', fr: 'Y planter une fleur' }, cat: 'naturaleza', f: 0.3 },
    { id: 'cubo_silla', emoji: '🪑', text: { es: 'Sentarme encima', en: 'Sit on it', fr: "M'asseoir dessus" }, cat: 'casa', f: 0.2 },
    { id: 'cubo_canasta', emoji: '🏀', text: { es: 'Encestar pelotas', en: 'Throw balls into it', fr: 'Y lancer des balles' }, cat: 'juego', f: 0.2 },
    { id: 'cubo_casa_rana', emoji: '🐸', text: { es: 'Casa para una rana', en: 'A home for a frog', fr: 'Une maison pour une grenouille' }, cat: 'naturaleza', f: 0.07 },
    { id: 'cubo_cocinar', emoji: '🍲', text: { es: 'Cocinar una sopa', en: 'Cook a soup', fr: 'Faire cuire une soupe' }, cat: 'comida', f: 0.15 },
    { id: 'cubo_lluvia', emoji: '🌧️', text: { es: 'Medir cuánto llueve', en: 'Measure how much it rains', fr: "Mesurer la quantité de pluie" }, cat: 'inventar', f: 0.05 },
    { id: 'cubo_escalon', emoji: '🧗', text: { es: 'Subirme para alcanzar algo alto', en: 'Stand on it to reach something high', fr: 'Monter dessus pour attraper un objet en hauteur' }, cat: 'transporte', f: 0.12 },
    { id: 'cubo_x1', emoji: '🐦', text: { es: 'Volar con él como un pájaro', en: 'Fly with it like a bird', fr: 'Voler avec lui comme un oiseau' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'cubo_x2', emoji: '🍰', text: { es: 'Comérmelo de postre', en: 'Eat it for pudding', fr: 'Le manger en dessert' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'cubo_x3', emoji: '📺', text: { es: 'Ver dibujos animados en él', en: 'Watch cartoons on it', fr: 'Regarder des dessins animés dessus' }, cat: 'sinsentido', f: 0.05, nonsense: true },
  ],
  lata: [
    { id: 'lata_lapices', emoji: '✏️', text: { es: 'Guardar lápices', en: 'Keep pencils in it', fr: 'Ranger des crayons' }, cat: 'casa', f: 0.55 },
    { id: 'lata_telefono', emoji: '📞', text: { es: 'Teléfono con un hilo', en: 'A string telephone', fr: 'Un téléphone avec une ficelle' }, cat: 'inventar', f: 0.15 },
    { id: 'lata_tambor', emoji: '🥁', text: { es: 'Hacer música', en: 'Make music', fr: 'Faire de la musique' }, cat: 'arte', f: 0.3 },
    { id: 'lata_maceta', emoji: '🌵', text: { es: 'Maceta para una planta', en: 'A pot for a plant', fr: 'Un pot pour une plante' }, cat: 'naturaleza', f: 0.3 },
    { id: 'lata_bolos', emoji: '🎳', text: { es: 'Jugar a los bolos', en: 'Play skittles', fr: 'Jouer aux quilles' }, cat: 'juego', f: 0.25 },
    { id: 'lata_zancos', emoji: '🦶', text: { es: 'Hacer zancos para andar', en: 'Make stilts to walk on', fr: 'Faire des échasses pour marcher' }, cat: 'transporte', f: 0.06 },
    { id: 'lata_farol', emoji: '🏮', text: { es: 'Un farol con agujeros', en: 'A lantern with holes', fr: 'Une lanterne avec des trous' }, cat: 'arte', f: 0.05 },
    { id: 'lata_agua_perro', emoji: '🐕', text: { es: 'Darle agua a un perro', en: 'Give a dog some water', fr: "Donner de l'eau à un chien" }, cat: 'ayudar', f: 0.18 },
    { id: 'lata_cocina', emoji: '🔥', text: { es: 'Calentar comida', en: 'Heat up food', fr: 'Faire chauffer de la nourriture' }, cat: 'comida', f: 0.12 },
    { id: 'lata_x1', emoji: '🛏️', text: { es: 'Dormir dentro de ella', en: 'Sleep inside it', fr: 'Dormir dedans' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'lata_x2', emoji: '🐘', text: { es: 'Guardar un elefante dentro', en: 'Keep an elephant inside it', fr: 'Ranger un éléphant dedans' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'lata_x3', emoji: '🚀', text: { es: 'Viajar en ella hasta la Luna', en: 'Ride it to the Moon', fr: "Aller jusqu'à la Lune dedans" }, cat: 'sinsentido', f: 0.05, nonsense: true },
  ],
  cesta: [
    { id: 'cesta_fruta', emoji: '🍎', text: { es: 'Llevar fruta', en: 'Carry fruit', fr: 'Porter des fruits' }, cat: 'comida', f: 0.8 },
    { id: 'cesta_cuna', emoji: '👶', text: { es: 'Cuna para un muñeco', en: 'A cot for a doll', fr: 'Un berceau pour une poupée' }, cat: 'juego', f: 0.2 },
    { id: 'cesta_nido', emoji: '🐣', text: { es: 'Nido para pollitos', en: 'A nest for chicks', fr: 'Un nid pour des poussins' }, cat: 'naturaleza', f: 0.18 },
    { id: 'cesta_sombrero', emoji: '👒', text: { es: 'Un sombrero', en: 'A hat', fr: 'Un chapeau' }, cat: 'cuerpo', f: 0.15 },
    { id: 'cesta_canasta', emoji: '🏀', text: { es: 'Canasta de baloncesto', en: 'A basketball hoop', fr: 'Un panier de basket' }, cat: 'juego', f: 0.15 },
    { id: 'cesta_lampara', emoji: '💡', text: { es: 'Lámpara de techo', en: 'A ceiling lamp', fr: 'Une lampe de plafond' }, cat: 'arte', f: 0.04 },
    { id: 'cesta_globo', emoji: '🎈', text: { es: 'Cesta de un globo para volar', en: 'The basket of a hot-air balloon', fr: "La nacelle d'une montgolfière" }, cat: 'transporte', f: 0.05 },
    { id: 'cesta_regalo', emoji: '🎁', text: { es: 'Llevar regalos a un vecino', en: 'Take presents to a neighbour', fr: 'Apporter des cadeaux à un voisin' }, cat: 'ayudar', f: 0.12 },
    { id: 'cesta_ropa', emoji: '👕', text: { es: 'Guardar la ropa', en: 'Keep clothes in it', fr: 'Ranger les vêtements' }, cat: 'casa', f: 0.35 },
    { id: 'cesta_x1', emoji: '🐟', text: { es: 'Que nade en el río como un pez', en: 'Make it swim in the river like a fish', fr: 'La faire nager dans la rivière comme un poisson' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'cesta_x2', emoji: '🍽️', text: { es: 'Comérmela para cenar', en: 'Eat it for dinner', fr: 'La manger au dîner' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'cesta_x3', emoji: '🎤', text: { es: 'Que me cante una canción', en: 'Make it sing me a song', fr: 'Lui demander de me chanter une chanson' }, cat: 'sinsentido', f: 0.05, nonsense: true },
  ],
  coco: [
    { id: 'coco_beber', emoji: '🥥', text: { es: 'Beber su agua', en: 'Drink its water', fr: 'Boire son eau' }, cat: 'comida', f: 0.85 },
    { id: 'coco_cuenco', emoji: '🥣', text: { es: 'Usar la cáscara de cuenco', en: 'Use the shell as a bowl', fr: 'Utiliser la coque comme bol' }, cat: 'casa', f: 0.3 },
    { id: 'coco_pelota', emoji: '⚽', text: { es: 'Jugar como una pelota', en: 'Play with it like a ball', fr: 'Jouer avec comme un ballon' }, cat: 'juego', f: 0.25 },
    { id: 'coco_maracas', emoji: '🪇', text: { es: 'Hacer maracas', en: 'Make maracas', fr: 'Faire des maracas' }, cat: 'arte', f: 0.12 },
    { id: 'coco_caballo', emoji: '🐎', text: { es: 'Hacer ruido de caballo', en: 'Make horse-hoof sounds', fr: 'Imiter le bruit du cheval' }, cat: 'arte', f: 0.06 },
    { id: 'coco_barco', emoji: '⛵', text: { es: 'Un barquito que flota', en: 'A little boat that floats', fr: 'Un petit bateau qui flotte' }, cat: 'transporte', f: 0.08 },
    { id: 'coco_pajaros', emoji: '🐦', text: { es: 'Comedero para pájaros', en: 'A bird feeder', fr: 'Une mangeoire pour oiseaux' }, cat: 'naturaleza', f: 0.1 },
    { id: 'coco_cara', emoji: '🙂', text: { es: 'Pintarle una cara', en: 'Paint a face on it', fr: 'Lui dessiner un visage' }, cat: 'arte', f: 0.15 },
    { id: 'coco_regalo', emoji: '🤲', text: { es: 'Compartirlo con un amigo', en: 'Share it with a friend', fr: 'Le partager avec un ami' }, cat: 'ayudar', f: 0.2 },
    { id: 'coco_x1', emoji: '🚗', text: { es: 'Conducirlo como un coche', en: 'Drive it like a car', fr: 'Le conduire comme une voiture' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'coco_x2', emoji: '🐕', text: { es: 'Enseñarle a ladrar como un perro', en: 'Teach it to bark like a dog', fr: 'Lui apprendre à aboyer comme un chien' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'coco_x3', emoji: '🦒', text: { es: 'Que crezca hasta ser una jirafa', en: 'Wait for it to grow into a giraffe', fr: "Attendre qu'il devienne une girafe" }, cat: 'sinsentido', f: 0.05, nonsense: true },
  ],
  palo: [
    { id: 'palo_bastón', emoji: '🦯', text: { es: 'Un bastón para andar', en: 'A walking stick', fr: 'Une canne pour marcher' }, cat: 'transporte', f: 0.4 },
    { id: 'palo_espada', emoji: '⚔️', text: { es: 'Una espada para jugar', en: 'A pretend sword', fr: 'Une épée pour jouer' }, cat: 'juego', f: 0.55 },
    { id: 'palo_dibujar', emoji: '✍️', text: { es: 'Dibujar en la tierra', en: 'Draw in the dirt', fr: 'Dessiner dans la terre' }, cat: 'arte', f: 0.3 },
    { id: 'palo_fruta', emoji: '🥭', text: { es: 'Bajar fruta de un árbol', en: 'Knock fruit down from a tree', fr: "Faire tomber des fruits d'un arbre" }, cat: 'comida', f: 0.3 },
    { id: 'palo_bandera', emoji: '🚩', text: { es: 'Hacer una bandera', en: 'Make a flag', fr: 'Faire un drapeau' }, cat: 'arte', f: 0.12 },
    { id: 'palo_tienda', emoji: '⛺', text: { es: 'Montar una tienda', en: 'Put up a tent', fr: 'Monter une tente' }, cat: 'casa', f: 0.1 },
    { id: 'palo_medir', emoji: '📏', text: { es: 'Medir cosas', en: 'Measure things', fr: 'Mesurer des choses' }, cat: 'inventar', f: 0.06 },
    { id: 'palo_planta', emoji: '🌿', text: { es: 'Sujetar una planta que se cae', en: 'Hold up a plant that is falling over', fr: 'Tenir une plante qui tombe' }, cat: 'naturaleza', f: 0.07 },
    { id: 'palo_rescate', emoji: '🛟', text: { es: 'Ayudar a alguien a salir del agua', en: 'Help someone get out of the water', fr: "Aider quelqu'un à sortir de l'eau" }, cat: 'ayudar', f: 0.05 },
    { id: 'palo_x1', emoji: '🥛', text: { es: 'Beberme su leche', en: 'Drink its milk', fr: 'Boire son lait' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'palo_x2', emoji: '💡', text: { es: 'Que dé luz por la noche', en: 'Make it light up at night', fr: "Qu'il fasse de la lumière la nuit" }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'palo_x3', emoji: '🗣️', text: { es: 'Contarle mis problemas y que me conteste', en: 'Tell it my problems and hear it answer', fr: 'Lui raconter mes problèmes et qu’il me réponde' }, cat: 'sinsentido', f: 0.05, nonsense: true },
  ],
  calcetin: [
    { id: 'calc_marioneta', emoji: '🧸', text: { es: 'Hacer una marioneta', en: 'Make a puppet', fr: 'Faire une marionnette' }, cat: 'arte', f: 0.4 },
    { id: 'calc_pie', emoji: '🦶', text: { es: 'Ponérmelo en el pie', en: 'Put it on my foot', fr: 'Le mettre à mon pied' }, cat: 'cuerpo', f: 0.7 },
    { id: 'calc_pelota', emoji: '⚾', text: { es: 'Rellenarlo y hacer una pelota', en: 'Stuff it to make a ball', fr: 'Le remplir pour faire une balle' }, cat: 'juego', f: 0.15 },
    { id: 'calc_guante', emoji: '🧤', text: { es: 'Un guante para el frío', en: 'A glove for the cold', fr: 'Un gant pour le froid' }, cat: 'cuerpo', f: 0.2 },
    { id: 'calc_limpiar', emoji: '🧽', text: { es: 'Limpiar el polvo', en: 'Dust things', fr: 'Faire la poussière' }, cat: 'casa', f: 0.2 },
    { id: 'calc_monedero', emoji: '🪙', text: { es: 'Guardar monedas', en: 'Keep coins in it', fr: 'Garder des pièces' }, cat: 'casa', f: 0.1 },
    { id: 'calc_cama_gato', emoji: '🐈', text: { es: 'Camita para un gatito', en: 'A little bed for a kitten', fr: 'Un petit lit pour un chaton' }, cat: 'naturaleza', f: 0.06 },
    { id: 'calc_bolsa_hielo', emoji: '🧊', text: { es: 'Bolsa de frío para un golpe', en: 'A cold pack for a bump', fr: 'Une poche de froid pour une bosse' }, cat: 'ayudar', f: 0.04 },
    { id: 'calc_semillas', emoji: '🌱', text: { es: 'Guardar semillas', en: 'Keep seeds in it', fr: 'Garder des graines' }, cat: 'comida', f: 0.05 },
    { id: 'calc_x1', emoji: '🚲', text: { es: 'Montar en él como una bici', en: 'Ride it like a bike', fr: 'Rouler dessus comme un vélo' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'calc_x2', emoji: '🔨', text: { es: 'Clavar clavos con él', en: 'Hammer nails with it', fr: 'Planter des clous avec' }, cat: 'sinsentido', f: 0.05, nonsense: true },
    { id: 'calc_x3', emoji: '🔥', text: { es: 'Cocinar el arroz dentro, en el fuego', en: 'Cook rice in it over the fire', fr: 'Faire cuire le riz dedans sur le feu' }, cat: 'sinsentido', f: 0.05, nonsense: true },
  ],
};

export function ideaPrior(card: IdeaCard, regionId: string): number {
  return card.fr?.[regionId] ?? card.f;
}
