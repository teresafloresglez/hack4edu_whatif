// Dibujos sencillos (SVG en línea, sin archivos) para los BOTONES de la app.
// Cada dibujo cuenta un poco más que un emoji lo que hace el botón, y se ve
// igual en todos los móviles (los emojis cambian según el sistema).

const S = '#263238'; // trazo
const G = `stroke="${S}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function face(mouth: string, eyes = '<circle cx="24" cy="27" r="3.5" fill="#263238"/><circle cx="40" cy="27" r="3.5" fill="#263238"/>', fill = '#FFD54F', extra = ''): string {
  return `<circle cx="32" cy="33" r="25" fill="${fill}" ${G}/>${eyes}<path d="${mouth}" fill="none" ${G}/>${extra}`;
}

function arrow(rot: number, fill = '#4FC3F7'): string {
  return `<g transform="rotate(${rot} 32 32)"><path d="M32 8 L54 32 L41 32 L41 56 L23 56 L23 32 L10 32 Z" fill="${fill}" ${G}/></g>`;
}

const thumb = (fill: string) =>
  `<path d="M18 30 H26 L34 12 C38 10 42 13 41 18 L39 27 H50 C54 27 56 31 55 35 L51 50 C50 53 48 54 45 54 H26 V30 Z" fill="${fill}" ${G}/><rect x="10" y="28" width="10" height="28" rx="3" fill="#90A4AE" ${G}/>`;

const candy = (x: number, y: number) =>
  `<g transform="translate(${x} ${y})"><path d="M-12 -6 L-6 0 L-12 6 Z M12 -6 L6 0 L12 6 Z" fill="#F48FB1" ${G}/><circle r="7" fill="#EC407A" ${G}/></g>`;

const plate = (x: number) => `<ellipse cx="${x}" cy="44" rx="13" ry="6" fill="#ECEFF1" ${G}/>`;

const bulb = `<path d="M32 8 C20 8 14 18 16 27 C17 33 22 36 24 42 H40 C42 36 47 33 48 27 C50 18 44 8 32 8 Z" fill="#FFEB3B" ${G}/><rect x="24" y="42" width="16" height="8" rx="2" fill="#B0BEC5" ${G}/><path d="M27 54 H37" ${G}/><path d="M28 30 L32 36 L36 30" fill="none" ${G}/>`;

const trophy = `<path d="M20 10 H44 V24 C44 34 38 40 32 40 C26 40 20 34 20 24 Z" fill="#FFC107" ${G}/><path d="M20 15 H10 C10 26 16 29 21 29 M44 15 H54 C54 26 48 29 43 29" fill="none" ${G}/><rect x="28" y="40" width="8" height="8" fill="#FFC107" ${G}/><rect x="20" y="48" width="24" height="8" rx="2" fill="#8D6E63" ${G}/><path d="M32 17 L34 22 L39 22 L35 25 L37 30 L32 27 L27 30 L29 25 L25 22 L30 22 Z" fill="#FFF59D"/>`;

const mapArt = `<path d="M8 14 L22 9 L42 15 L56 10 V50 L42 55 L22 49 L8 54 Z" fill="#FFF3C4" ${G}/><path d="M22 9 V49 M42 15 V55" stroke="${S}" stroke-width="2" opacity=".5"/><path d="M14 44 C20 36 26 40 30 32 C34 24 40 30 44 22" fill="none" stroke="#E53935" stroke-width="3" stroke-dasharray="3 4" stroke-linecap="round"/><path d="M45 15 L51 21 M51 15 L45 21" stroke="#E53935" stroke-width="3.5" stroke-linecap="round"/>`;

const ICONS = {
  // ── Navegación ──
  back: arrow(-90, '#90CAF9'),
  next: arrow(90, '#81C784'),
  speaker: `<path d="M10 24 H20 L34 12 V52 L20 40 H10 Z" fill="#FFB74D" ${G}/><path d="M42 24 C46 28 46 36 42 40 M48 18 C56 26 56 38 48 46" fill="none" ${G}/>`,
  home: `<path d="M8 32 L32 10 L56 32" fill="none" ${G}/><path d="M15 28 V54 H49 V28" fill="#FFCC80" ${G}/><rect x="27" y="38" width="10" height="16" fill="#8D6E63" ${G}/><path d="M8 32 L32 10 L56 32 L49 32 L32 17 L15 32 Z" fill="#E57373" ${G}/>`,
  teacher: `<rect x="6" y="8" width="38" height="28" rx="2" fill="#2E7D32" ${G}/><path d="M12 16 H26 M12 23 H34 M12 29 H22" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="48" cy="30" r="7" fill="#FFCC80" ${G}/><path d="M36 58 C36 44 42 40 48 40 C54 40 60 44 60 58 Z" fill="#7E57C2" ${G}/><path d="M42 44 L32 34" ${G}/>`,
  add: `<circle cx="32" cy="32" r="25" fill="#E0E0E0" ${G}/><path d="M32 18 V46 M18 32 H46" stroke="${S}" stroke-width="6" stroke-linecap="round"/>`,
  check: `<circle cx="32" cy="32" r="26" fill="#43A047" ${G}/><path d="M19 33 L28 42 L46 22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross: `<circle cx="32" cy="32" r="26" fill="#E53935" ${G}/><path d="M22 22 L42 42 M42 22 L22 42" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  play: `<circle cx="32" cy="32" r="26" fill="#26A69A" ${G}/><path d="M26 19 L46 32 L26 45 Z" fill="#fff" ${G}/>`,
  mic: `<rect x="24" y="8" width="16" height="28" rx="8" fill="#F06292" ${G}/><path d="M16 30 C16 40 23 46 32 46 C41 46 48 40 48 30" fill="none" ${G}/><path d="M32 46 V56 M24 56 H40" ${G}/>`,
  hint: bulb + `<path d="M8 18 L13 20 M56 18 L51 20 M32 2 V5" ${G}/>`,
  up: arrow(0),
  down: arrow(180),
  left: arrow(-90),
  right: arrow(90),

  // ── Pantalla del niño ──
  rocket: `<path d="M32 6 C44 14 46 30 42 44 H22 C18 30 20 14 32 6 Z" fill="#ECEFF1" ${G}/><circle cx="32" cy="24" r="6" fill="#4FC3F7" ${G}/><path d="M22 36 L12 46 L22 46 Z M42 36 L52 46 L42 46 Z" fill="#E53935" ${G}/><path d="M26 46 L32 58 L38 46" fill="#FF9800" ${G}/>`,
  continue: mapArt + `<circle cx="14" cy="44" r="4" fill="#43A047" ${G}/>`,
  newProject: `<rect x="10" y="16" width="40" height="40" rx="4" fill="#FFF59D" ${G}/><path d="M10 24 H50" ${G}/><path d="M30 30 V48 M21 39 H39" stroke="#43A047" stroke-width="5" stroke-linecap="round"/><path d="M50 4 L53 11 L60 12 L54 16 L56 23 L50 19 L44 23 L46 16 L40 12 L47 11 Z" fill="#FFC107" ${G}/>`,
  dice: `<rect x="10" y="10" width="44" height="44" rx="9" fill="#fff" ${G}/><g fill="${S}"><circle cx="21" cy="21" r="4"/><circle cx="43" cy="21" r="4"/><circle cx="32" cy="32" r="4"/><circle cx="21" cy="43" r="4"/><circle cx="43" cy="43" r="4"/></g>`,

  // ── Juegos ──
  colores: `<path d="M32 8 C14 8 6 22 8 34 C10 46 22 50 26 44 C29 39 24 34 30 32 C38 30 42 40 50 36 C58 32 58 8 32 8 Z" fill="#FFE0B2" ${G}/><circle cx="20" cy="22" r="5" fill="#E53935" ${G}/><circle cx="33" cy="17" r="5" fill="#1E88E5" ${G}/><circle cx="46" cy="22" r="5" fill="#43A047" ${G}/><path d="M40 48 L48 40 L56 48 L48 56 Z" fill="#FDD835" ${G}/>`,
  memoria: `<rect x="8" y="12" width="26" height="36" rx="4" fill="#5C6BC0" ${G} transform="rotate(-8 21 30)"/><text x="16" y="38" font-size="20" font-weight="900" fill="#fff" font-family="Arial" transform="rotate(-8 21 30)">?</text><rect x="30" y="16" width="26" height="36" rx="4" fill="#fff" ${G} transform="rotate(8 43 34)"/><path d="M43 26 L46 32 L52 33 L47 37 L48 43 L43 40 L38 43 L39 37 L34 33 L40 32 Z" fill="#FFC107" ${G} transform="rotate(8 43 34)"/>`,
  patrones: `<circle cx="11" cy="32" r="7" fill="#E53935" ${G}/><rect x="20" y="25" width="14" height="14" rx="2" fill="#1E88E5" ${G}/><circle cx="43" cy="32" r="7" fill="#E53935" ${G}/><rect x="50" y="25" width="12" height="14" rx="2" fill="none" stroke="${S}" stroke-width="2.5" stroke-dasharray="3 3"/><text x="52" y="37" font-size="12" font-weight="900" fill="${S}" font-family="Arial">?</text>`,
  camino: `<rect x="6" y="6" width="52" height="52" rx="6" fill="#E9DCC3" ${G}/><path d="M14 48 H30 V30 H48 V16" fill="none" stroke="#FF7043" stroke-width="4" stroke-dasharray="4 4" stroke-linecap="round"/><circle cx="40" cy="44" r="6" fill="#A1887F" ${G}/><circle cx="22" cy="20" r="6" fill="#A1887F" ${G}/><circle cx="14" cy="48" r="5" fill="#26A69A" ${G}/><path d="M48 18 V6 L56 10 L48 14" fill="#E53935" ${G}/>`,
  quepasaria: `<path d="M18 40 C8 40 6 28 14 24 C12 14 24 8 30 14 C34 6 50 8 50 18 C60 20 58 36 48 36 C46 44 34 46 30 40 C26 44 20 44 18 40 Z" fill="#E1F5FE" ${G}/><circle cx="14" cy="50" r="4" fill="#E1F5FE" ${G}/><circle cx="8" cy="58" r="2.5" fill="#E1F5FE" ${G}/><text x="25" y="35" font-size="20" font-weight="900" fill="#7E57C2" font-family="Arial">?!</text>`,
  milusos: `<path d="M14 24 H46 L42 56 H18 Z" fill="#90A4AE" ${G}/><path d="M14 24 C14 12 46 12 46 24" fill="none" ${G}/><path d="M50 8 L52 14 L58 16 L52 18 L50 24 L48 18 L42 16 L48 14 Z M8 34 L9.5 38 L13 39 L9.5 40 L8 44 L6.5 40 L3 39 L6.5 38 Z M56 36 L57.5 40 L61 41 L57.5 42 L56 46 L54.5 42 L51 41 L54.5 40 Z" fill="#FFC107" stroke="${S}" stroke-width="1.5"/>`,
  garabato: `<path d="M6 44 C14 20 22 52 30 30 C36 14 42 40 34 46" fill="none" stroke="#7E57C2" stroke-width="4" stroke-linecap="round"/><path d="M40 52 L52 14 L58 16 L46 54 L40 58 Z" fill="#FFCA28" ${G}/><path d="M52 14 L54 8 L60 10 L58 16" fill="#F48FB1" ${G}/>`,
  naranja: `<circle cx="32" cy="36" r="20" fill="#FB8C00" ${G}/><path d="M32 16 C30 10 34 6 40 6 C40 12 36 16 32 16 Z" fill="#43A047" ${G}/><path d="M32 18 V54" stroke="#fff" stroke-width="3" stroke-dasharray="4 4"/><circle cx="6" cy="36" r="5" fill="#FFCC80" ${G}/><circle cx="58" cy="36" r="5" fill="#8D6E63" ${G}/>`,
  reparto: plate(17) + plate(47) + candy(12, 36) + candy(22, 36) + candy(47, 36) + `<path d="M28 14 H36 M32 10 L36 14 L32 18" fill="none" ${G}/>`,
  reflexion: trophy,

  // ── Fases ──
  investigar: `<circle cx="26" cy="26" r="16" fill="#E1F5FE" ${G}/><path d="M38 38 L56 56" stroke="${S}" stroke-width="7" stroke-linecap="round"/><path d="M18 22 C20 17 24 15 28 15" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  planificar: mapArt,
  idear: bulb,
  acordar: `<circle cx="14" cy="16" r="7" fill="#FFCC80" ${G}/><path d="M4 56 V36 C4 28 24 28 24 36 V56 Z" fill="#26A69A" ${G}/><circle cx="50" cy="16" r="7" fill="#A1887F" ${G}/><path d="M40 56 V36 C40 28 60 28 60 36 V56 Z" fill="#FFB300" ${G}/><path d="M22 38 L32 42 L42 38" fill="none" stroke="${S}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="42" r="5" fill="#FFCC80" ${G}/><path d="M32 6 C30 2 25 4 27 8 L32 13 L37 8 C39 4 34 2 32 6 Z" fill="#E91E63"/>`,
  presentar: trophy,

  // ── Caras y sentimientos ──
  faceGreat: face('M18 36 C22 50 42 50 46 36 Z', '<path d="M19 26 L24 21 L29 26 M35 26 L40 21 L45 26" fill="none" stroke="#263238" stroke-width="3" stroke-linecap="round"/>', '#FFD54F', '<path d="M18 36 H46" stroke="#263238" stroke-width="3"/>'),
  faceHappy: face('M20 38 C24 46 40 46 44 38'),
  faceOk: face('M22 42 H42'),
  faceWorried: face('M20 46 C26 38 38 38 44 46', undefined, '#FFE082', '<path d="M18 20 L28 23 M46 20 L36 23" stroke="#263238" stroke-width="2.5" stroke-linecap="round"/>'),
  faceSad: face('M20 46 C26 38 38 38 44 46', undefined, '#90CAF9', '<path d="M22 32 C20 38 26 38 24 32" fill="#4FC3F7"/>'),
  faceAngry: face('M22 46 C28 40 36 40 42 46', undefined, '#EF9A9A', '<path d="M17 19 L29 25 M47 19 L35 25" stroke="#263238" stroke-width="3" stroke-linecap="round"/>'),
  thumbUp: thumb('#FFCC80'),
  thumbDown: `<g transform="rotate(180 32 32)">${thumb('#FFAB91')}</g>`,

  // ── La naranja: decisiones ──
  keep: `<circle cx="32" cy="14" r="8" fill="#FFCC80" ${G}/><path d="M18 58 V34 C18 26 46 26 46 34 V58" fill="#26A69A" ${G}/><circle cx="32" cy="40" r="9" fill="#FB8C00" ${G}/><path d="M18 36 C22 46 28 44 26 40 M46 36 C42 46 36 44 38 40" fill="#FFCC80" ${G}/>`,
  give: `<rect x="12" y="26" width="40" height="30" rx="3" fill="#EF5350" ${G}/><rect x="8" y="18" width="48" height="10" rx="2" fill="#E53935" ${G}/><path d="M32 18 V56" stroke="#FFEB3B" stroke-width="5"/><path d="M32 18 C24 6 14 12 24 18 M32 18 C40 6 50 12 40 18" fill="none" stroke="#FFEB3B" stroke-width="4" stroke-linecap="round"/>`,
  split: `<path d="M28 12 A20 20 0 0 0 28 52 Z" fill="#FB8C00" ${G}/><path d="M36 12 A20 20 0 0 1 36 52 Z" fill="#FB8C00" ${G}/><path d="M32 4 V60" stroke="#E53935" stroke-width="2.5" stroke-dasharray="4 4"/>`,
  leave: `<rect x="34" y="8" width="24" height="48" rx="2" fill="#A1887F" ${G}/><circle cx="52" cy="34" r="2" fill="${S}"/><circle cx="18" cy="16" r="6" fill="#FFCC80" ${G}/><path d="M18 22 V38 M18 38 L10 52 M18 38 L26 50 M18 28 L8 32 M18 28 L28 24" fill="none" ${G}/><path d="M4 58 H30" stroke="${S}" stroke-width="2" stroke-dasharray="3 4"/>`,
  integrate: `<path d="M8 14 H28 V22 C32 18 38 20 38 26 C38 32 32 34 28 30 V50 H8 Z" fill="#66BB6A" ${G}/><path d="M56 14 H36 V22 C32 18 26 20 26 26 C26 32 32 34 36 30 V50 H56 Z" fill="#FFCA28" ${G} transform="translate(2 0)"/>`,
  ask: `<path d="M8 12 H56 V42 H28 L16 54 V42 H8 Z" fill="#BBDEFB" ${G}/><path d="M26 22 C26 16 38 16 38 22 C38 28 32 27 32 33" fill="none" stroke="#1565C0" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="38" r="2.5" fill="#1565C0"/>`,

  // ── El reparto ──
  giveOne: plate(46) + candy(46, 36) + `<path d="M8 22 H36 M28 14 L36 22 L28 30" fill="none" stroke="#43A047" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  takeOne: plate(18) + candy(18, 36) + `<path d="M56 22 H28 M36 14 L28 22 L36 30" fill="none" stroke="#E53935" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,

  // ── ¿Qué harías distinto? ──
  slow: `<path d="M8 50 H52 C56 50 58 46 56 42 L50 40" fill="#A5D6A7" ${G}/><circle cx="30" cy="36" r="14" fill="#FFB74D" ${G}/><path d="M30 36 m0 -7 a7 7 0 1 1 -6 10" fill="none" ${G}/><path d="M48 40 L50 22 M54 42 L58 24" ${G}/><circle cx="50" cy="20" r="2.5" fill="${S}"/><circle cx="58" cy="22" r="2.5" fill="${S}"/>`,
  help: `<path d="M24 58 V30 C24 26 30 26 30 30 V14 C30 10 36 10 36 14 V28 V12 C36 8 42 8 42 12 V30 V18 C42 14 48 14 48 18 V40 C48 50 42 58 34 58 Z" fill="#FFCC80" ${G}/><path d="M24 36 L16 30 C12 28 9 32 12 35 L24 48" fill="#FFCC80" ${G}/><path d="M10 10 L14 16 M4 20 L10 22 M18 4 L19 10" ${G}/>`,
  ideas: `<path d="M6 50 A26 26 0 0 1 58 50" fill="none" stroke="#E53935" stroke-width="6"/><path d="M12 50 A20 20 0 0 1 52 50" fill="none" stroke="#FDD835" stroke-width="6"/><path d="M18 50 A14 14 0 0 1 46 50" fill="none" stroke="#43A047" stroke-width="6"/><path d="M24 50 A8 8 0 0 1 40 50" fill="none" stroke="#1E88E5" stroke-width="6"/>`,
  talk: `<path d="M4 8 H38 V30 H18 L10 38 V30 H4 Z" fill="#BBDEFB" ${G}/><path d="M60 26 H26 V48 H46 L54 56 V48 H60 Z" fill="#FFE0B2" ${G}/><circle cx="14" cy="19" r="2" fill="${S}"/><circle cx="21" cy="19" r="2" fill="${S}"/><circle cx="28" cy="19" r="2" fill="${S}"/>`,
  same: face('M20 38 C24 46 40 46 44 38', '<rect x="14" y="22" width="16" height="9" rx="3" fill="#263238"/><rect x="34" y="22" width="16" height="9" rx="3" fill="#263238"/><path d="M30 25 H34" stroke="#263238" stroke-width="3"/>'),

  robi: `<path d="M32 6 v6" ${G}/><circle cx="32" cy="5" r="3" fill="#FF7043" ${G}/><rect x="12" y="12" width="40" height="32" rx="10" fill="#4FC3B0" ${G}/><rect x="17" y="18" width="30" height="21" rx="7" fill="#263238"/><circle cx="25" cy="27" r="3.6" fill="#B2FF59"/><circle cx="39" cy="27" r="3.6" fill="#B2FF59"/><path d="M25 34 q7 6 14 0" fill="none" stroke="#B2FF59" stroke-width="3" stroke-linecap="round"/><rect x="20" y="44" width="24" height="14" rx="5" fill="#4FC3B0" ${G}/><circle cx="32" cy="51" r="3" fill="#FFD54F" ${G}/>`,
  // ── Temas ──
  parque: `<rect x="28" y="38" width="8" height="20" fill="#8D6E63" ${G}/><circle cx="32" cy="24" r="16" fill="#66BB6A" ${G}/><circle cx="24" cy="30" r="9" fill="#81C784" ${G}/><circle cx="41" cy="30" r="9" fill="#81C784" ${G}/><path d="M4 58 H60" stroke="#43A047" stroke-width="4" stroke-linecap="round"/><circle cx="12" cy="50" r="3" fill="#EC407A"/><circle cx="52" cy="50" r="3" fill="#FFEB3B"/>`,
  animales: `<path d="M14 44 C10 26 22 14 36 16 C50 18 58 28 56 42 V54 H48 V46 H24 V54 H16 Z" fill="#B0BEC5" ${G}/><path d="M14 28 C6 30 4 46 10 54" fill="none" stroke="${S}" stroke-width="6" stroke-linecap="round"/><path d="M14 28 C6 30 4 46 10 54" fill="none" stroke="#B0BEC5" stroke-width="3" stroke-linecap="round"/><path d="M26 18 C20 8 34 6 34 18 C34 26 26 26 26 18 Z" fill="#90A4AE" ${G}/><circle cx="20" cy="26" r="2.5" fill="${S}"/>`,
  espacio: `<path d="M32 6 C44 14 46 30 42 44 H22 C18 30 20 14 32 6 Z" fill="#ECEFF1" ${G}/><circle cx="32" cy="24" r="6" fill="#4FC3F7" ${G}/><path d="M22 36 L12 46 L22 46 Z M42 36 L52 46 L42 46 Z" fill="#E53935" ${G}/><path d="M26 46 L32 58 L38 46" fill="#FF9800" ${G}/><circle cx="8" cy="12" r="2" fill="#FFC107"/><circle cx="56" cy="8" r="2" fill="#FFC107"/><circle cx="54" cy="56" r="2" fill="#FFC107"/>`,
  futbol: `<circle cx="32" cy="32" r="24" fill="#fff" ${G}/><path d="M32 22 L41 28 L38 39 H26 L23 28 Z" fill="${S}"/><path d="M32 22 V9 M41 28 L53 24 M38 39 L45 50 M26 39 L19 50 M23 28 L11 24" stroke="${S}" stroke-width="2.5"/>`,
  cocina: `<path d="M10 28 H54 V46 C54 52 50 56 44 56 H20 C14 56 10 52 10 46 Z" fill="#78909C" ${G}/><path d="M6 28 H58" ${G}/><path d="M4 32 H10 M54 32 H60" ${G}/><path d="M22 20 C20 14 26 12 24 6 M32 20 C30 14 36 12 34 6 M42 20 C40 14 46 12 44 6" fill="none" stroke="#B0BEC5" stroke-width="3" stroke-linecap="round"/>`,


  // ── Idiomas ──
  flag_es: `<rect x="4" y="12" width="56" height="40" rx="4" fill="#C62828" ${G}/><rect x="5.5" y="22" width="53" height="20" fill="#FFC400"/>`,
  flag_fr: `<rect x="4" y="12" width="56" height="40" rx="4" fill="#fff" ${G}/><rect x="5.5" y="13.5" width="17" height="37" fill="#1E3A8A"/><rect x="41.5" y="13.5" width="17" height="37" fill="#D32F2F"/>`,
  flag_en: `<rect x="4" y="12" width="56" height="40" rx="4" fill="#1E3A8A" ${G}/><path d="M6 14 L58 50 M58 14 L6 50" stroke="#fff" stroke-width="8"/><path d="M6 14 L58 50 M58 14 L6 50" stroke="#D32F2F" stroke-width="3"/><path d="M32 13 V51 M5 32 H59" stroke="#fff" stroke-width="11"/><path d="M32 13 V51 M5 32 H59" stroke="#D32F2F" stroke-width="6"/>`,
} as const;

export type IconName = keyof typeof ICONS;

export function hasIcon(name: string): name is IconName {
  return name in ICONS;
}

/** Devuelve un <span> con el dibujo. Es decorativo: el botón lleva su propio aria-label. */
export function ic(name: IconName | string, size = 48, cls = ''): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = `ic ${cls}`.trim();
  span.setAttribute('aria-hidden', 'true');
  const body = hasIcon(name) ? ICONS[name] : ICONS.play;
  span.innerHTML = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  return span;
}

export const ALL_ICONS = Object.keys(ICONS) as IconName[];
