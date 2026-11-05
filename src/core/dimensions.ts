import type { AreaId, DimensionId } from './types';
import type { L } from '../i18n';

export interface DimensionInfo {
  id: DimensionId;
  label: L;
  area: AreaId;
  framework: L; // marco teórico del que sale
  strengthText: L; // frase para el docente cuando es fortaleza
  growthText: L; // frase cuando es área en crecimiento
  classroom: L[]; // ideas para el aula
  games: string[]; // juegos de la app que la trabajan
}

export const AREAS: Record<AreaId, { label: L; icon: string; color: string }> = {
  concreto: { label: { es: 'Pensamiento concreto', en: 'Concrete thinking', fr: 'Pensée concrète' }, icon: '🔍', color: '#2a9d8f' },
  logico: { label: { es: 'Pensamiento lógico', en: 'Logical thinking', fr: 'Pensée logique' }, icon: '🧩', color: '#264653' },
  creatividad: { label: { es: 'Creatividad', en: 'Creativity', fr: 'Créativité' }, icon: '💡', color: '#e9c46a' },
  social: { label: { es: 'Social y estratégico', en: 'Social and strategic', fr: 'Social et stratégique' }, icon: '🤝', color: '#f4a261' },
  autorregulacion: { label: { es: 'Autorregulación', en: 'Self-regulation', fr: 'Autorégulation' }, icon: '🧭', color: '#e76f51' },
};

export const DIMENSIONS: DimensionInfo[] = [
  {
    id: 'atencion',
    label: { es: 'Atención y percepción', en: 'Attention and perception', fr: 'Attention et perception' },
    area: 'concreto',
    framework: { es: 'Fase 1 del ABP · Investigar', en: 'PBL phase 1 · Investigate', fr: 'Phase 1 de l’APP · Enquêter' },
    strengthText: {
      es: 'Distingue con rapidez y precisión colores, formas y detalles.',
      en: 'Quickly and accurately tells colours, shapes and details apart.',
      fr: 'Distingue rapidement et avec précision les couleurs, les formes et les détails.',
    },
    growthText: {
      es: 'Le cuesta fijarse en los detalles visuales o distinguir elementos parecidos.',
      en: 'Finds it hard to notice visual details or tell similar things apart.',
      fr: 'A du mal à remarquer les détails visuels ou à distinguer des éléments semblables.',
    },
    classroom: [
      {
        es: 'Juegos de "busca las diferencias" con objetos reales del aula.',
        en: '"Spot the difference" games with real classroom objects.',
        fr: 'Jeux des « différences » avec de vrais objets de la classe.',
      },
      {
        es: 'Clasificar piedras, semillas u hojas por color, tamaño y forma.',
        en: 'Sort stones, seeds or leaves by colour, size and shape.',
        fr: 'Trier des cailloux, des graines ou des feuilles par couleur, taille et forme.',
      },
    ],
    games: ['colores'],
  },
  {
    id: 'memoria',
    label: { es: 'Memoria de trabajo', en: 'Working memory', fr: 'Mémoire de travail' },
    area: 'concreto',
    framework: { es: 'Fase 1 del ABP · Investigar', en: 'PBL phase 1 · Investigate', fr: 'Phase 1 de l’APP · Enquêter' },
    strengthText: {
      es: 'Recuerda bien dónde están las cosas y lo que ya ha visto.',
      en: 'Remembers well where things are and what they have already seen.',
      fr: 'Se souvient bien de l’emplacement des choses et de ce qu’il ou elle a déjà vu.',
    },
    growthText: {
      es: 'Olvida con facilidad lo que acaba de ver; repite errores ya cometidos.',
      en: 'Easily forgets what they have just seen; repeats mistakes already made.',
      fr: 'Oublie facilement ce qui vient d’être vu ; répète des erreurs déjà commises.',
    },
    classroom: [
      {
        es: 'Juego "¿Qué falta?": mostrar 5 objetos, taparlos y quitar uno.',
        en: '"What\'s missing?" game: show 5 objects, cover them and take one away.',
        fr: 'Jeu « Qu’est-ce qui manque ? » : montrer 5 objets, les cacher et en retirer un.',
      },
      {
        es: 'Dar instrucciones de 2 y luego 3 pasos y pedir que las repita.',
        en: 'Give 2-step and then 3-step instructions and ask the child to repeat them.',
        fr: 'Donner des consignes en 2 puis 3 étapes et demander de les répéter.',
      },
    ],
    games: ['memoria'],
  },
  {
    id: 'logica',
    label: { es: 'Razonamiento lógico', en: 'Logical reasoning', fr: 'Raisonnement logique' },
    area: 'logico',
    framework: { es: 'Fase 2 del ABP · Planificar', en: 'PBL phase 2 · Plan', fr: 'Phase 2 de l’APP · Planifier' },
    strengthText: {
      es: 'Descubre reglas y patrones con facilidad.',
      en: 'Discovers rules and patterns easily.',
      fr: 'Découvre facilement les règles et les motifs.',
    },
    growthText: {
      es: 'Le cuesta descubrir la regla que siguen las series.',
      en: 'Finds it hard to work out the rule a sequence follows.',
      fr: 'A du mal à trouver la règle que suit une suite.',
    },
    classroom: [
      {
        es: 'Hacer collares o filas de objetos que sigan un patrón y continuarlos.',
        en: 'Make necklaces or rows of objects that follow a pattern and continue them.',
        fr: 'Faire des colliers ou des rangées d’objets qui suivent un motif et les continuer.',
      },
      {
        es: 'Palmas y pasos rítmicos: "palma, palma, pie…" ¿qué viene después?',
        en: 'Rhythmic claps and steps: "clap, clap, stamp…" what comes next?',
        fr: 'Frappes et pas rythmés : « clap, clap, pied… » qu’est-ce qui vient ensuite ?',
      },
    ],
    games: ['patrones', 'robi'],
  },
  {
    id: 'planificacion',
    label: { es: 'Planificación', en: 'Planning', fr: 'Planification' },
    area: 'logico',
    framework: {
      es: 'Fase 2 del ABP · Planificar · El camino del explorador',
      en: 'PBL phase 2 · Plan · The explorer’s path',
      fr: 'Phase 2 de l’APP · Planifier · Le chemin de l’explorateur',
    },
    strengthText: {
      es: 'Piensa antes de moverse y encuentra caminos cortos.',
      en: 'Thinks before moving and finds short paths.',
      fr: 'Réfléchit avant de bouger et trouve des chemins courts.',
    },
    growthText: {
      es: 'Actúa sin planificar y da muchos rodeos para llegar a la meta.',
      en: 'Acts without planning and takes long detours to reach the goal.',
      fr: 'Agit sans planifier et fait de nombreux détours pour atteindre le but.',
    },
    classroom: [
      {
        es: 'Dibujar en el suelo un laberinto con tiza y planificar la ruta antes de andarla.',
        en: 'Draw a chalk maze on the ground and plan the route before walking it.',
        fr: 'Dessiner un labyrinthe à la craie au sol et planifier le trajet avant de le parcourir.',
      },
      {
        es: 'Antes de una tarea, pedir que diga en voz alta los pasos que va a seguir.',
        en: 'Before a task, ask the child to say out loud the steps they will follow.',
        fr: 'Avant une tâche, demander de dire à voix haute les étapes qui vont être suivies.',
      },
    ],
    games: ['camino'],
  },
  {
    id: 'fluidez',
    label: { es: 'Fluidez de ideas', en: 'Fluency of ideas', fr: 'Fluidité des idées' },
    area: 'creatividad',
    framework: { es: 'Torrance · Fase 3 del ABP · Idear', en: 'Torrance · PBL phase 3 · Imagine', fr: 'Torrance · Phase 3 de l’APP · Imaginer' },
    strengthText: {
      es: 'Produce muchas ideas ante un problema abierto.',
      en: 'Comes up with many ideas for an open-ended problem.',
      fr: 'Produit beaucoup d’idées face à un problème ouvert.',
    },
    growthText: {
      es: 'Genera pocas ideas cuando no hay una respuesta única.',
      en: 'Comes up with few ideas when there is no single answer.',
      fr: 'Produit peu d’idées quand il n’y a pas de réponse unique.',
    },
    classroom: [
      {
        es: 'Lluvia de ideas diaria de 2 minutos: "¿Para qué sirve una piedra?".',
        en: 'Daily 2-minute brainstorm: "What can a stone be used for?".',
        fr: 'Remue-méninges quotidien de 2 minutes : « À quoi peut servir un caillou ? ».',
      },
      {
        es: 'Valorar en voz alta la cantidad de ideas, no si son correctas.',
        en: 'Praise the number of ideas out loud, not whether they are correct.',
        fr: 'Valoriser à voix haute le nombre d’idées, pas leur justesse.',
      },
    ],
    games: ['quepasaria', 'milusos'],
  },
  {
    id: 'flexibilidad',
    label: { es: 'Flexibilidad', en: 'Flexibility', fr: 'Flexibilité' },
    area: 'creatividad',
    framework: { es: 'Torrance · Fase 3 del ABP · Idear', en: 'Torrance · PBL phase 3 · Imagine', fr: 'Torrance · Phase 3 de l’APP · Imaginer' },
    strengthText: {
      es: 'Sus ideas son muy variadas: cambia de enfoque con facilidad.',
      en: 'Their ideas are very varied: they switch approach easily.',
      fr: 'Ses idées sont très variées : change facilement de point de vue.',
    },
    growthText: {
      es: 'Sus ideas suelen ser del mismo tipo; le cuesta cambiar de enfoque.',
      en: 'Their ideas tend to be of the same kind; finds it hard to switch approach.',
      fr: 'Ses idées sont souvent du même type ; a du mal à changer de point de vue.',
    },
    classroom: [
      {
        es: 'Pedir ideas de "otro tipo": si dijo comida, ahora algo para jugar.',
        en: 'Ask for ideas of "another kind": if they said food, now something to play with.',
        fr: 'Demander des idées « d’un autre type » : après la nourriture, quelque chose pour jouer.',
      },
      {
        es: 'Juego de roles: ¿qué haría un pájaro, un abuelo, un médico?',
        en: 'Role play: what would a bird, a grandad or a doctor do?',
        fr: 'Jeu de rôle : que ferait un oiseau, un grand-père, un médecin ?',
      },
    ],
    games: ['quepasaria', 'milusos'],
  },
  {
    id: 'originalidad',
    label: { es: 'Originalidad', en: 'Originality', fr: 'Originalité' },
    area: 'creatividad',
    framework: {
      es: 'Torrance (comparado con niños de su región)',
      en: 'Torrance (compared with children from the same region)',
      fr: 'Torrance (comparé aux enfants de sa région)',
    },
    strengthText: {
      es: 'Propone ideas poco habituales entre los niños de su región.',
      en: 'Suggests ideas that are unusual among children from their region.',
      fr: 'Propose des idées peu courantes chez les enfants de sa région.',
    },
    growthText: {
      es: 'Tiende a elegir las ideas más comunes.',
      en: 'Tends to choose the most common ideas.',
      fr: 'A tendance à choisir les idées les plus courantes.',
    },
    classroom: [
      {
        es: 'Premiar la idea "más rara" del día, sin juzgar si es posible.',
        en: 'Reward the "strangest" idea of the day, without judging whether it is possible.',
        fr: 'Récompenser l’idée « la plus bizarre » du jour, sans juger si elle est possible.',
      },
      {
        es: 'Preguntas "¿Y si…?" absurdas: ¿y si los árboles hablaran?',
        en: 'Silly "What if…?" questions: what if trees could talk?',
        fr: 'Questions « Et si… ? » absurdes : et si les arbres parlaient ?',
      },
    ],
    games: ['quepasaria', 'milusos', 'garabato'],
  },
  {
    id: 'elaboracion',
    label: { es: 'Elaboración y detalle', en: 'Elaboration and detail', fr: 'Élaboration et détail' },
    area: 'creatividad',
    framework: { es: 'Torrance · Producto final del ABP', en: 'Torrance · PBL final product', fr: 'Torrance · Production finale de l’APP' },
    strengthText: {
      es: 'Añade muchos detalles y completa sus creaciones.',
      en: 'Adds lots of detail and finishes their creations.',
      fr: 'Ajoute beaucoup de détails et termine ses créations.',
    },
    growthText: {
      es: 'Sus creaciones son muy simples; deja las ideas sin desarrollar.',
      en: 'Their creations are very simple; leaves ideas undeveloped.',
      fr: 'Ses créations sont très simples ; laisse les idées peu développées.',
    },
    classroom: [
      {
        es: 'Tras un dibujo, preguntar "¿qué más podría tener?" y dejar que añada.',
        en: 'After a drawing, ask "what else could it have?" and let the child add more.',
        fr: 'Après un dessin, demander « qu’est-ce qu’il pourrait y avoir d’autre ? » et laisser ajouter.',
      },
      {
        es: 'Construir historias en cadena añadiendo un detalle cada vez.',
        en: 'Build chain stories, adding one detail each time.',
        fr: 'Construire des histoires en chaîne en ajoutant un détail à chaque fois.',
      },
    ],
    games: ['garabato'],
  },
  {
    id: 'justicia',
    label: { es: 'Sentido de la justicia', en: 'Sense of fairness', fr: 'Sens de la justice' },
    area: 'social',
    framework: { es: 'Teoría de juegos · El reparto', en: 'Game theory · Sharing out', fr: 'Théorie des jeux · Le partage' },
    strengthText: {
      es: 'Reparte de forma justa y tiene en cuenta a los demás.',
      en: 'Shares fairly and takes others into account.',
      fr: 'Partage de façon juste et tient compte des autres.',
    },
    growthText: {
      es: 'Tiende a quedarse con más de lo que reparte.',
      en: 'Tends to keep more than they give away.',
      fr: 'A tendance à garder plus que ce qui est partagé.',
    },
    classroom: [
      {
        es: 'Repartos reales en grupo (material, turnos) y comentar si fue justo.',
        en: 'Real sharing in groups (materials, turns) and discuss whether it was fair.',
        fr: 'Partages réels en groupe (matériel, tours) et discuter si c’était juste.',
      },
      {
        es: 'Cuentos con dilemas de reparto y preguntar cómo se siente cada uno.',
        en: 'Stories with sharing dilemmas, asking how each character feels.',
        fr: 'Histoires avec des dilemmes de partage en demandant ce que ressent chacun.',
      },
    ],
    games: ['reparto'],
  },
  {
    id: 'perspectiva',
    label: { es: 'Ponerse en el lugar del otro', en: 'Seeing others’ point of view', fr: 'Se mettre à la place de l’autre' },
    area: 'social',
    framework: { es: 'Teoría de juegos · Teoría de la mente', en: 'Game theory · Theory of mind', fr: 'Théorie des jeux · Théorie de l’esprit' },
    strengthText: {
      es: 'Anticipa bien lo que piensan y harán los demás.',
      en: 'Anticipates well what others think and will do.',
      fr: 'Anticipe bien ce que les autres pensent et vont faire.',
    },
    growthText: {
      es: 'Le cuesta anticipar cómo reaccionarán los demás.',
      en: 'Finds it hard to anticipate how others will react.',
      fr: 'A du mal à anticiper comment les autres vont réagir.',
    },
    classroom: [
      {
        es: 'Antes de un juego en grupo, preguntar "¿qué crees que hará tu compañero?".',
        en: 'Before a group game, ask "what do you think your partner will do?".',
        fr: 'Avant un jeu en groupe, demander « que va faire ton camarade, à ton avis ? ».',
      },
      {
        es: 'Teatro de sombras o marionetas cambiando de personaje.',
        en: 'Shadow theatre or puppets, swapping characters.',
        fr: 'Théâtre d’ombres ou de marionnettes en changeant de personnage.',
      },
    ],
    games: ['reparto', 'naranja'],
  },
  {
    id: 'conflicto',
    label: { es: 'Repertorio ante conflictos', en: 'Range of conflict strategies', fr: 'Répertoire face aux conflits' },
    area: 'social',
    framework: { es: 'Integración de conflictos · La naranja', en: 'Conflict integration · The orange', fr: 'Intégration des conflits · L’orange' },
    strengthText: {
      es: 'Explora antes de decidir y usa estrategias variadas, incluida la integración.',
      en: 'Explores before deciding and uses varied strategies, including integration.',
      fr: 'Explore avant de décider et utilise des stratégies variées, y compris l’intégration.',
    },
    growthText: {
      es: 'Usa casi siempre la misma estrategia ante un conflicto y decide sin preguntar.',
      en: 'Almost always uses the same strategy in a conflict and decides without asking.',
      fr: 'Utilise presque toujours la même stratégie face à un conflit et décide sans demander.',
    },
    classroom: [
      {
        es: 'Ante un conflicto real, preguntar primero "¿para qué lo quiere cada uno?".',
        en: 'In a real conflict, first ask "what does each of you want it for?".',
        fr: 'Face à un vrai conflit, demander d’abord « pourquoi chacun le veut-il ? ».',
      },
      {
        es: 'Representar el cuento de la naranja y buscar soluciones donde ganen los dos.',
        en: 'Act out the story of the orange and look for solutions where both win.',
        fr: 'Jouer l’histoire de l’orange et chercher des solutions où les deux gagnent.',
      },
    ],
    games: ['naranja'],
  },
  {
    id: 'autorregulacion',
    label: { es: 'Autorregulación', en: 'Self-regulation', fr: 'Autorégulation' },
    area: 'autorregulacion',
    framework: { es: 'Autorregulación · Reacción al error', en: 'Self-regulation · Response to mistakes', fr: 'Autorégulation · Réaction à l’erreur' },
    strengthText: {
      es: 'Persiste ante el error, controla el impulso y pide ayuda cuando la necesita.',
      en: 'Keeps going after mistakes, controls impulses and asks for help when needed.',
      fr: 'Persévère face à l’erreur, contrôle ses impulsions et demande de l’aide quand il le faut.',
    },
    growthText: {
      es: 'Abandona ante el error, responde por impulso o no pide ayuda.',
      en: 'Gives up after mistakes, answers impulsively or does not ask for help.',
      fr: 'Abandonne face à l’erreur, répond de façon impulsive ou ne demande pas d’aide.',
    },
    classroom: [
      {
        es: 'Rutina "para, piensa, actúa" antes de responder.',
        en: '"Stop, think, act" routine before answering.',
        fr: 'Routine « stop, je réfléchis, j’agis » avant de répondre.',
      },
      {
        es: 'Normalizar el error: contar en clase un error propio y cómo se arregló.',
        en: 'Normalise mistakes: share one of your own in class and how it was fixed.',
        fr: 'Banaliser l’erreur : raconter en classe une erreur personnelle et comment elle a été réparée.',
      },
    ],
    games: ['camino', 'colores'],
  },
  {
    id: 'metacognicion',
    label: { es: 'Autoconocimiento', en: 'Self-awareness', fr: 'Connaissance de soi' },
    area: 'autorregulacion',
    framework: {
      es: 'Autorregulación · Calibración metacognitiva',
      en: 'Self-regulation · Metacognitive calibration',
      fr: 'Autorégulation · Calibration métacognitive',
    },
    strengthText: {
      es: 'Sabe bien lo que es capaz de hacer: sus predicciones se cumplen.',
      en: 'Knows well what they can do: their predictions come true.',
      fr: 'Sait bien de quoi il ou elle est capable : ses prédictions se réalisent.',
    },
    growthText: {
      es: 'Le cuesta prever cómo le va a ir (se sobreestima o se infravalora).',
      en: 'Finds it hard to predict how they will do (over- or underestimates themselves).',
      fr: 'A du mal à prévoir sa réussite (se surestime ou se sous-estime).',
    },
    classroom: [
      {
        es: 'Antes de una tarea: "¿cuántas crees que harás?", y después comparar.',
        en: 'Before a task: "how many do you think you will do?", then compare afterwards.',
        fr: 'Avant une tâche : « combien penses-tu en faire ? », puis comparer après.',
      },
      {
        es: 'Preguntas de cierre: ¿qué fue lo más difícil? ¿qué harías distinto?',
        en: 'Closing questions: what was the hardest part? What would you do differently?',
        fr: 'Questions de fin : qu’est-ce qui a été le plus difficile ? Que ferais-tu autrement ?',
      },
    ],
    games: ['reflexion'],
  },
];

export const DIM_BY_ID: Record<DimensionId, DimensionInfo> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.id, d]),
) as Record<DimensionId, DimensionInfo>;

export const ALL_DIMS: DimensionId[] = DIMENSIONS.map((d) => d.id);
