// Dibujos de los animales de los alumnos (SVG en línea, mismo estilo que icons.ts).
// En los datos el alumno sigue guardando su emoji: aquí solo se cambia cómo se ve,
// así los alumnos ya creados no pierden su animal.

const S = '#263238';
const G = `stroke="${S}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
const eyes = (y = 30, dx = 7, cx = 32) => `<circle cx="${cx - dx}" cy="${y}" r="2.6" fill="${S}"/><circle cx="${cx + dx}" cy="${y}" r="2.6" fill="${S}"/><circle cx="${cx - dx + 0.9}" cy="${y - 0.9}" r="0.8" fill="#fff"/><circle cx="${cx + dx + 0.9}" cy="${y - 0.9}" r="0.8" fill="#fff"/>`;
const cheeks = (y = 37, dx = 12) => `<ellipse cx="${32 - dx}" cy="${y}" rx="3" ry="2" fill="#FF8A80" opacity=".55"/><ellipse cx="${32 + dx}" cy="${y}" rx="3" ry="2" fill="#FF8A80" opacity=".55"/>`;
const smile = (y = 40) => `<path d="M28 ${y} Q32 ${y + 4} 36 ${y}" fill="none" ${G}/>`;

export const ANIMAL_ART: Record<string, string> = {
  // León
  '🦁': `<circle cx="32" cy="33" r="25" fill="#B8571A" ${G}/>
    <path d="M32 8 l4 6 6-3 1 7 7 0-2 7 6 4-6 4 2 7-7 0-1 7-6-3-4 6-4-6-6 3-1-7-7 0 2-7-6-4 6-4-2-7 7 0 1-7 6 3z" fill="#9C4712" opacity=".45"/>
    <circle cx="32" cy="34" r="16" fill="#FFC857" ${G}/>${eyes(31, 6)}
    <path d="M29 37 h6 l-3 3.5 z" fill="#6D4C41" ${G}/><path d="M32 40.5 v2 M28 44 Q32 46 36 44" fill="none" ${G}/>`,
  // Elefante
  '🐘': `<ellipse cx="13" cy="30" rx="11" ry="14" fill="#9FB3C8" ${G}/><ellipse cx="51" cy="30" rx="11" ry="14" fill="#9FB3C8" ${G}/>
    <ellipse cx="13" cy="30" rx="6" ry="8.5" fill="#F8BBD0"/><ellipse cx="51" cy="30" rx="6" ry="8.5" fill="#F8BBD0"/>
    <circle cx="32" cy="29" r="16" fill="#B8C9DA" ${G}/>${eyes(27, 6)}
    <path d="M28 35 Q28 50 22 55 Q26 58 31 54 Q36 47 36 35" fill="#B8C9DA" ${G}/>${cheeks(34, 11)}`,
  // Tortuga
  '🐢': `<ellipse cx="32" cy="38" rx="22" ry="17" fill="#5FA845" ${G}/>
    <path d="M32 24 l9 6 0 10 -9 6 -9 -6 0 -10z" fill="#7CC35F" ${G}/><path d="M23 30 l-11 2 M41 30 l11 2 M23 40 l-10 5 M41 40 l10 5 M32 46 v8" ${G}/>
    <circle cx="32" cy="14" r="10" fill="#A5D46A" ${G}/>${eyes(13, 4)}<path d="M29 17.5 Q32 19.5 35 17.5" fill="none" ${G}/>`,
  // Mono
  '🐒': `<circle cx="11" cy="31" r="8" fill="#8D6E63" ${G}/><circle cx="53" cy="31" r="8" fill="#8D6E63" ${G}/>
    <circle cx="11" cy="31" r="4" fill="#FFCC80"/><circle cx="53" cy="31" r="4" fill="#FFCC80"/>
    <circle cx="32" cy="32" r="20" fill="#8D6E63" ${G}/>
    <path d="M32 22 C22 20 18 30 22 34 C18 40 24 50 32 50 C40 50 46 40 42 34 C46 30 42 20 32 22z" fill="#FFCC80" ${G}/>${eyes(31, 5)}
    <ellipse cx="32" cy="38" rx="2" ry="1.4" fill="${S}"/>${smile(42)}`,
  // Jirafa
  '🦒': `<path d="M25 12 v-7 M39 12 v-7" ${G}/><circle cx="25" cy="5" r="3" fill="#A0522D" ${G}/><circle cx="39" cy="5" r="3" fill="#A0522D" ${G}/>
    <ellipse cx="15" cy="20" rx="7" ry="4" fill="#F6C453" ${G} transform="rotate(-25 15 20)"/><ellipse cx="49" cy="20" rx="7" ry="4" fill="#F6C453" ${G} transform="rotate(25 49 20)"/>
    <path d="M18 24 C18 10 46 10 46 24 L44 44 C44 54 20 54 20 44 Z" fill="#F6C453" ${G}/>
    <circle cx="24" cy="21" r="3" fill="#D08A2E"/><circle cx="41" cy="19" r="2.5" fill="#D08A2E"/><circle cx="40" cy="31" r="2" fill="#D08A2E"/>
    ${eyes(28, 7)}<ellipse cx="32" cy="45" rx="11" ry="8" fill="#FBE3A0" ${G}/><circle cx="28.5" cy="44" r="1.4" fill="${S}"/><circle cx="35.5" cy="44" r="1.4" fill="${S}"/>`,
  // Rana
  '🐸': `<circle cx="20" cy="18" r="9" fill="#7CC36A" ${G}/><circle cx="44" cy="18" r="9" fill="#7CC36A" ${G}/>
    <circle cx="20" cy="18" r="5" fill="#fff"/><circle cx="44" cy="18" r="5" fill="#fff"/><circle cx="21" cy="19" r="2.6" fill="${S}"/><circle cx="45" cy="19" r="2.6" fill="${S}"/>
    <ellipse cx="32" cy="38" rx="25" ry="18" fill="#7CC36A" ${G}/>
    <path d="M18 38 Q32 52 46 38" fill="#E57373" ${G}/>${cheeks(34, 18)}`,
  // Loro
  '🦜': `<path d="M30 10 Q26 2 34 4 Q30 8 36 9 Q34 4 42 6 Q36 10 38 13z" fill="#43A047" ${G}/>
    <circle cx="32" cy="32" r="21" fill="#E53935" ${G}/>
    <circle cx="25" cy="27" r="7" fill="#fff" ${G}/><circle cx="26" cy="27" r="3" fill="${S}"/>
    <path d="M36 26 C50 24 52 38 42 44 C42 38 40 35 36 35 Z" fill="#FFC107" ${G}/><path d="M36 35 C38 41 36 46 32 46 C34 42 34 39 36 35z" fill="#F57F17" ${G}/>
    <path d="M14 42 Q22 52 32 53" fill="none" stroke="#1E88E5" stroke-width="5" stroke-linecap="round"/>`,
  // Pez
  '🐠': `<path d="M50 32 L62 20 L62 44 Z" fill="#FFB74D" ${G}/>
    <ellipse cx="30" cy="32" rx="24" ry="18" fill="#FF9800" ${G}/>
    <path d="M24 15 Q20 32 24 49" fill="none" stroke="#fff" stroke-width="5"/><path d="M38 16 Q34 32 38 48" fill="none" stroke="#fff" stroke-width="5"/>
    <path d="M24 15 Q20 32 24 49 M38 16 Q34 32 38 48" fill="none" stroke="${S}" stroke-width="1.2" opacity=".35"/>
    <circle cx="15" cy="28" r="4" fill="#fff" ${G}/><circle cx="15.5" cy="28.5" r="2" fill="${S}"/><path d="M8 37 Q11 39 14 37" fill="none" ${G}/>`,
  // Conejo
  '🐰': `<ellipse cx="23" cy="15" rx="6" ry="14" fill="#F5F5F5" ${G}/><ellipse cx="41" cy="15" rx="6" ry="14" fill="#F5F5F5" ${G}/>
    <ellipse cx="23" cy="15" rx="2.8" ry="9.5" fill="#F8BBD0"/><ellipse cx="41" cy="15" rx="2.8" ry="9.5" fill="#F8BBD0"/>
    <circle cx="32" cy="38" r="19" fill="#F5F5F5" ${G}/>${eyes(35, 7)}
    <path d="M30 41 h4 l-2 2.5z" fill="#F06292" ${G}/><path d="M32 43.5 v2 M29 47 Q32 48.5 35 47" fill="none" ${G}/>
    <path d="M20 42 h-8 M20 45 l-7 2 M44 42 h8 M44 45 l7 2" stroke="${S}" stroke-width="1.5" stroke-linecap="round"/>${cheeks(42, 11)}`,
  // Panda
  '🐼': `<circle cx="15" cy="16" r="8" fill="${S}"/><circle cx="49" cy="16" r="8" fill="${S}"/>
    <circle cx="32" cy="34" r="22" fill="#FAFAFA" ${G}/>
    <ellipse cx="23" cy="32" rx="6" ry="7.5" fill="${S}" transform="rotate(-20 23 32)"/><ellipse cx="41" cy="32" rx="6" ry="7.5" fill="${S}" transform="rotate(20 41 32)"/>
    <circle cx="23.5" cy="31" r="2.4" fill="#fff"/><circle cx="40.5" cy="31" r="2.4" fill="#fff"/>
    <ellipse cx="32" cy="41" rx="3" ry="2" fill="${S}"/>${smile(44)}${cheeks(43, 14)}`,
  // Zorro
  '🦊': `<path d="M10 8 L24 20 L14 30 Z M54 8 L40 20 L50 30 Z" fill="#F57C00" ${G}/><path d="M13 13 L20 20 L15 25z M51 13 L44 20 L49 25z" fill="#FFE0B2"/>
    <path d="M12 26 C12 14 52 14 52 26 C52 38 42 52 32 54 C22 52 12 38 12 26z" fill="#FB8C00" ${G}/>
    <path d="M14 30 C20 36 26 38 32 54 C38 38 44 36 50 30 C46 44 40 52 32 54 C24 52 18 44 14 30z" fill="#FFF3E0" ${G}/>
    ${eyes(30, 9)}<ellipse cx="32" cy="46" rx="3.2" ry="2.4" fill="${S}"/>`,
  // Mariquita
  '🐞': `<path d="M22 14 Q18 6 12 6 M42 14 Q46 6 52 6" fill="none" ${G}/><circle cx="12" cy="6" r="2.5" fill="${S}"/><circle cx="52" cy="6" r="2.5" fill="${S}"/>
    <circle cx="32" cy="20" r="11" fill="${S}"/><circle cx="27.5" cy="18" r="2.6" fill="#fff"/><circle cx="36.5" cy="18" r="2.6" fill="#fff"/>
    <circle cx="32" cy="38" r="21" fill="#E53935" ${G}/><path d="M32 17 V59" ${G}/>
    <circle cx="22" cy="32" r="4" fill="${S}"/><circle cx="42" cy="32" r="4" fill="${S}"/><circle cx="20" cy="45" r="3.5" fill="${S}"/><circle cx="44" cy="45" r="3.5" fill="${S}"/><circle cx="28" cy="53" r="2.5" fill="${S}"/><circle cx="36" cy="53" r="2.5" fill="${S}"/>`,
};

/** Dibujo del animal del alumno; si no hay dibujo para ese valor, se muestra tal cual. */
export function avatarArt(avatar: string, size = 64): HTMLElement {
  const span = document.createElement('span');
  span.className = 'avatar-art';
  span.setAttribute('aria-hidden', 'true');
  const body = ANIMAL_ART[avatar];
  if (body) span.innerHTML = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  else span.textContent = avatar;
  return span;
}
