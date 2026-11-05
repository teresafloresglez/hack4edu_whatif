import type { AreaId, DimensionId, Student } from '../core/types';
import { loadAudio } from '../core/storage';
import { AREAS, DIMENSIONS } from '../core/dimensions';
import { MIN_EVIDENCE, STATUS_LABEL, type DimReport, type StudentReport } from '../core/report';
import { entryLevel, levelFor } from '../core/adaptation';
import { currentProject } from '../core/project';
import { CULTURES, getCulture } from '../data/cultures';
import { getTheme } from '../data/themes';
import { USES_BANK, WHAT_IF_PROMPTS } from '../data/ideas';
import { GAMES, GAME_BY_ID, PHASES, gameName } from '../games/registry';
import { h } from '../games/common';
import { fill, locale, tr, type L } from '../i18n';
import { t } from '../i18n/strings';
import C from '../contenido/informe.json';
import { isRobiType, robiBreakdown, TYPE_LABEL } from '../core/robi';

// Informe del docente (también es lo que se imprime en PDF).
// Una sola columna, apartados numerados y sin emojis. Cada marco teórico va
// justo debajo de lo que fundamenta, con los datos del niño que lo respaldan.
// Solo presentación: las cifras salen de buildReport() sin cambios.
// Textos en src/contenido/informe.json.

type Child = Node | string | null | false | undefined;
type FrameId = keyof typeof C.frames;

// ── Iconos de línea (trazo redondeado, sin emojis) ──────────────────────
const LINE_ICONS = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  blocks: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.9.3 5 2.3 5 5.3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="5" width="3" height="13" rx="1"/><rect x="16" y="14" width="3" height="4" rx="1"/>',
  board: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20l2-4M16 20l-2-4M7 8.5h6M7 11.5h4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  sprout: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
  medal: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  book: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  checklist: '<path d="M4 7l2 2 3-3M4 15l2 2 3-3M12 8h8M12 16h8"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  scale: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
} as const;
type LineIcon = keyof typeof LINE_ICONS;

/** Icono de línea en el color del texto que lo rodea. */
export function lineIcon(name: LineIcon, size = 22): HTMLElement {
  const span = h('span', { class: 'li', 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LINE_ICONS[name]}</svg>`;
  return span;
}

/** Color de cada competencia: tinta (texto, AA sobre blanco y sobre su tinte), relleno de barra y tinte de fondo. */
export const AREA_STYLE: Record<AreaId, { ink: string; fill: string; tint: string; icon: LineIcon }> = {
  concreto: { ink: '#0f6e66', fill: '#14b8a6', tint: '#dcf5f1', icon: 'eye' },
  logico: { ink: '#1d4fb8', fill: '#3b82f6', tint: '#e3eeff', icon: 'blocks' },
  creatividad: { ink: '#8a5a00', fill: '#f5b301', tint: '#fff3cc', icon: 'bulb' },
  social: { ink: '#b42a42', fill: '#f2566b', tint: '#ffe4e8', icon: 'users' },
  autorregulacion: { ink: '#6d28d9', fill: '#8b5cf6', tint: '#efe6ff', icon: 'compass' },
};
const AREA_INK = Object.fromEntries(Object.entries(AREA_STYLE).map(([k, v]) => [k, v.fill])) as Record<AreaId, string>;

/** Color e icono de cada apartado. */
const SECTION_STYLE: Record<string, { ink: string; tint: string; icon: LineIcon }> = {
  summary: { ink: '#8a5a00', tint: '#fff3cc', icon: 'star' },
  profile: { ink: '#6d28d9', tint: '#efe6ff', icon: 'chart' },
  classroom: { ink: '#1d4fb8', tint: '#e3eeff', icon: 'board' },
  how: { ink: '#b42a42', tint: '#ffe4e8', icon: 'route' },
  progress: { ink: '#15803d', tint: '#dcfce7', icon: 'trend' },
  evidence: { ink: '#0f6e66', tint: '#dcf5f1', icon: 'image' },
};

/** Marco que respalda cada área del perfil (las áreas sin marco en la lista no llevan recuadro). */
const AREA_FRAME: Partial<Record<AreaId, { frame: FrameId; dims?: DimensionId[] }>> = {
  logico: { frame: 'robi', dims: ['logica'] },
  creatividad: { frame: 'torrance' },
  social: { frame: 'ultimatum', dims: ['justicia', 'perspectiva'] },
  autorregulacion: { frame: 'metacog' },
};

const CONFLICT_TEXT: Record<string, L> = {
  competir: C.styleCompetir, ceder: C.styleCeder, compromiso: C.styleCompromiso, evitar: C.styleEvitar, integrar: C.styleIntegrar,
};
const CHEAT_TEXT: Record<string, L> = { castiga: C.cheatCastiga, perdona: C.cheatPerdona, copia: C.cheatCopia };

/** Quita emojis de textos que vienen de los datos (etiquetas de evidencias, temas). */
export const noEmoji = (s: string): string => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').replace(/·\s*·/g, '·').trim();

const crit = (text: L) => h('p', { class: 'crit' }, tr(text));
const times = (n: number) => fill(tr(n === 1 ? C.times : C.timesPl), { n });
const list = (items: Child[]) => h('ul', {}, ...items.map((x) => h('li', {}, x)));
const label = (text: string, icon?: LineIcon) => h('p', { class: 'kicker' }, icon ? lineIcon(icon, 18) : null, h('span', {}, text));

/** Apartado numerado con cabecera de color e icono. */
function section(n: number, cls: string, title: string, criterion: L, ...children: Child[]): HTMLElement {
  const st = SECTION_STYLE[cls];
  return h('section', { class: `rsec ${cls}`, style: { borderTopColor: st.ink } },
    h('h2', { class: 'rsec-title', style: { borderBottomColor: st.tint } },
      h('span', { class: 'rsec-icon', style: { background: st.tint, color: st.ink } }, lineIcon(st.icon, 26)),
      h('span', { class: 'rsec-num', style: { color: st.ink } }, String(n).padStart(2, '0')),
      h('span', {}, title)),
    h('div', { class: 'rsec-body' }, ...children, crit(criterion)));
}

/** Etiqueta de estado con color y texto (nunca solo color). */
const statusChip = (status: DimReport['status']) => h('span', { class: `status-chip st-${status}` }, tr(STATUS_LABEL[status]));

/** Recuadro «Se apoya en»: marco y referencia en una línea; debajo, los datos del niño. */
function basisBox(id: FrameId, facts: string[]): HTMLElement {
  const f = C.frames[id];
  return h('aside', { class: 'basis-box', 'data-frame': id },
    h('p', { class: 'basis-head' }, h('span', { class: 'basis-tag' }, lineIcon('book', 15), tr(C.basisLabel)), h('b', {}, tr(f.frame)), h('span', { class: 'basis-ref' }, tr(f.ref))),
    h('div', { class: 'basis-facts' }, ...(facts.length ? facts : [tr(C.noDataYet)]).map((x) => h('span', { class: 'fact' }, x))));
}

/** Perfil de demostración o de prueba: no hay marca en los datos, se deduce del nombre. */
export function isDemoProfile(s: Student): boolean {
  return /\b(demo|demostraci[oó]n|prueba|test|ejemplo)\b/i.test(s.name ?? '');
}

const shownScore = (d: DimReport) => (d.n >= MIN_EVIDENCE && d.score !== null ? d.score : null);

function dimRow(d: DimReport, color: string): HTMLElement {
  const score = shownScore(d)!;
  const trend = d.trend === 'sube' ? tr(C.trendUp) : d.trend === 'baja' ? tr(C.trendDown) : '';
  return h('div', { class: `rdim status-${d.status}` },
    h('span', { class: 'rdim-label' }, d.label),
    h('span', { class: 'rbar', role: 'img', 'aria-label': `${score}/100` },
      h('span', { class: 'rbar-fill', style: { width: `${score}%`, background: color } }),
      h('span', { class: 'rbar-mark m40' }), h('span', { class: 'rbar-mark m70' })),
    h('span', { class: 'rdim-score' }, String(score)),
    h('span', { class: 'rdim-status' }, statusChip(d.status), trend ? h('span', { class: 'trend' }, trend) : null));
}

interface IdeaRound { question: string; ideas: string[]; own: number }

/** Ideas reales que eligió en los juegos de ideas (sin repetir pregunta). */
function ideaRounds(s: Student, max = 3): IdeaRound[] {
  const out: IdeaRound[] = [];
  const seen = new Set<string>();
  for (const p of [...s.plays].reverse()) {
    if (out.length >= max) break;
    if ((p.gameId !== 'quepasaria' && p.gameId !== 'milusos') || p.outcome.abandoned) continue;
    const promptId = p.outcome.tags?.promptId ?? '';
    const ids = p.outcome.tags?.ideaIds ?? [];
    const own = p.outcome.metrics.ownIdeas ?? 0;
    if ((!ids.length && !own) || seen.has(promptId)) continue;
    seen.add(promptId);
    let question = '';
    let cards: { id: string; text: L }[] = [];
    const prompt = WHAT_IF_PROMPTS.find((x) => x.id === promptId);
    if (prompt) {
      question = tr(prompt.question);
      cards = prompt.cards;
    } else {
      const obj = CULTURES.flatMap((c) => c.objects).find((o) => 'usos_' + o.name.es.replace(/\s+/g, '_') === promptId);
      if (obj) {
        question = `${gameName('milusos').name}: ${tr(obj.name)}`;
        cards = USES_BANK[obj.id] ?? [];
      }
    }
    const ideas = ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean).map((c) => tr(c!.text));
    out.push({ question: noEmoji(question), ideas, own });
  }
  return out;
}

function audioItem(ref: string, text: string): HTMLElement {
  const player = h('audio', { controls: true, preload: 'none', class: 'no-print' });
  const status = h('span', { class: 'muted no-print' });
  const missing = () => { player.remove(); status.textContent = tr(C.audioMissing); };
  void loadAudio(ref).then((blob) => (blob ? (player.src = URL.createObjectURL(blob)) : missing())).catch(missing);
  return h('div', { class: 'ev-audio' }, h('p', { class: 'ev-label' }, text), player, status, h('p', { class: 'print-only muted' }, tr(C.audioPrint)));
}

export function reportView(r: StudentReport): HTMLElement {
  const s = r.student;
  const proj = currentProject(s);
  const culture = getCulture(s.regionId);
  const fmt = (d: number) => new Date(d).toLocaleDateString(locale());
  const dateStr = new Date(r.generatedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const dimInfo = (id: string) => DIMENSIONS.find((d) => d.id === id)!;
  const dimById = (id: DimensionId) => r.dims.find((d) => d.id === id)!;
  const dimFacts = (ids: DimensionId[]) => ids.map(dimById).filter((d) => shownScore(d) !== null)
    .map((d) => fill(tr(C.pct), { label: d.label, n: d.score! }));
  const name = s.name || t('unnamed');
  // ¡Robi, eso no!: desglose por tipo de razonamiento y la última decisión de la IA adaptativa.
  // Las etiquetas llegan de localStorage sin validar: solo se usa una decisión bien formada.
  const lastRobi = [...s.plays].reverse().find((p) => p.gameId === 'robi' && Array.isArray(p.outcome.tags?.robiPlan) && p.outcome.tags.robiPlan.length);
  const practiced = lastRobi?.outcome.tags?.robiPlan?.find((d) => !!d && d.motivo === 'practicar' && isRobiType(d.tipo) && Number.isFinite(d.dominio));
  const robiFacts = [
    ...robiBreakdown(s).map((b) => fill(tr(C.robiType), { t: tr(TYPE_LABEL[b.tipo]), ok: b.ok, n: b.n })),
    ...(practiced ? [fill(tr(C.robiLast), { t: tr(TYPE_LABEL[practiced.tipo]), p: Math.round(practiced.dominio * 100) })] : []),
  ];

  // Cabecera
  const theme = proj ? getTheme(proj.themeId) : null;
  const phase = proj ? Math.min(5, Math.max(1, proj.phase)) : 0;
  const head = h('header', { class: 'rhead' },
    h('div', { class: 'rhead-top' },
      h('span', { class: 'initial', style: { background: s.color }, 'aria-hidden': 'true' }, (s.name || '?').trim().charAt(0).toUpperCase()),
      h('div', {},
        h('h1', { class: 'rhead-name' }, name, isDemoProfile(s) ? h('span', { class: 'demo-badge' }, tr(C.demoBadge)) : null),
        h('p', { class: 'muted' }, fill(tr(C.meta), { age: s.age, region: tr(culture.name), games: r.gamesPlayed, min: r.totalMinutes }), ' · ', fill(tr(C.reportDate), { date: dateStr })),
        proj && theme ? h('p', {}, fill(tr(C.project), { theme: tr(theme.name), n: phase, phase: tr(PHASES[phase - 1].name) })) : null)),
    basisBox('abp', [...(proj ? [fill(tr(C.phaseOf), { n: phase })] : []), fill(tr(C.projectsDone), { n: r.projectsDone })]),
    crit(C.critHeader));

  // 1 · Lo más importante
  const action = r.recommendations[0]?.classroom[0] ?? r.signals[0]?.suggestion ?? null;
  const summary = section(1, 'summary', tr(C.sumTitle), C.critSummary,
    h('div', { class: 'sum-box good' }, label(tr(C.sumStrengths), 'medal'),
      r.strengths.length ? list(r.strengths.map((d) => h('span', {}, h('b', {}, `${d.label} ${d.score}`), ' — ', tr(dimInfo(d.id).strengthText)))) : h('p', { class: 'muted' }, tr(C.sumNoStrengths))),
    h('div', { class: 'sum-box grow' }, label(tr(C.sumGrowth), 'sprout'),
      r.growth.length ? list(r.growth.map((d) => h('span', {}, h('b', {}, `${d.label} ${d.score}`), ' — ', tr(dimInfo(d.id).growthText)))) : h('p', { class: 'muted' }, tr(C.sumNoGrowth))),
    h('div', { class: 'sum-box action' }, label(tr(C.sumAction), 'target'), h('p', { class: 'action-text' }, action ?? tr(C.sumNoAction))));

  // 2 · Perfil por dimensiones
  const areaIds = Object.keys(AREAS) as AreaId[];
  const areaAvg = (a: AreaId) => {
    const vals = r.dims.filter((d) => d.area === a).map(shownScore).filter((x): x is number => x !== null);
    return vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null;
  };
  const avgStatus = (v: number) => (v >= 70 ? 'fortaleza' : v < 40 ? 'crecimiento' : 'en_desarrollo') as DimReport['status'];
  const overview = h('div', { class: 'overview' },
    ...areaIds.map((a) => {
      const st = AREA_STYLE[a];
      const v = areaAvg(a);
      return h('div', { class: 'ov-card', style: { background: st.tint, borderColor: st.fill } },
        h('div', { class: 'ov-top' },
          h('span', { class: 'ov-icon', style: { background: '#fff', color: st.ink } }, lineIcon(st.icon, 26)),
          h('span', { class: 'ov-score', style: { color: st.ink } }, v === null ? '—' : String(v))),
        h('p', { class: 'ov-name', style: { color: st.ink } }, tr(AREAS[a].label)),
        h('p', { class: 'ov-desc' }, tr(C.areaInfo[a])),
        h('span', { class: 'rbar ov-bar' }, v !== null ? h('span', { class: 'rbar-fill', style: { width: `${v}%`, background: st.fill } }) : null),
        v === null ? h('span', { class: 'status-chip st-sin_datos' }, tr(C.noDataShort)) : statusChip(avgStatus(v)));
    }));
  const legend = h('div', { class: 'legend' },
    statusChip('fortaleza'), h('span', {}, '70–100'),
    statusChip('en_desarrollo'), h('span', {}, '40–69'),
    statusChip('crecimiento'), h('span', {}, '0–39'),
    h('span', { class: 'legend-trend' }, tr(C.legend).split('·').pop()!.trim()));
  const profile = section(2, 'profile', tr(C.profileTitle), C.critProfile,
    label(tr(C.overviewTitle), 'chart'),
    overview,
    h('p', { class: 'ov-note' }, tr(C.overviewNote)),
    legend,
    basisBox('adaptacion', [fill(tr(C.entryLevel), { n: entryLevel(s.age) }), fill(tr(C.compareWith), { c: tr(culture.name) })]),
    label(tr(C.detailTitle), 'layers'),
    ...areaIds.map((a) => {
      const st = AREA_STYLE[a];
      const dims = r.dims.filter((d) => d.area === a);
      const withData = dims.filter((d) => shownScore(d) !== null);
      const without = dims.filter((d) => shownScore(d) === null);
      const fr = AREA_FRAME[a];
      return h('div', { class: 'area-block', style: { borderColor: st.fill } },
        h('div', { class: 'area-head', style: { background: st.tint } },
          h('span', { class: 'ov-icon', style: { background: '#fff', color: st.ink } }, lineIcon(st.icon, 24)),
          h('div', {}, h('h3', { class: 'area-title', style: { color: st.ink } }, tr(AREAS[a].label)), h('p', { class: 'area-desc' }, tr(C.areaInfo[a])))),
        h('div', { class: 'area-body' },
          ...withData.map((d) => dimRow(d, st.fill)),
          without.length ? h('p', { class: 'nodata' }, fill(tr(C.noDataDims), { list: without.map((d) => d.label).join(', ') })) : null,
          fr ? basisBox(fr.frame, [...dimFacts(fr.dims ?? dims.map((d) => d.id)), ...(a === 'logico' ? robiFacts : [])]) : null));
    }),
    h('p', { class: 'pilot' }, tr(C.pilot)));

  // 3 · Qué hacer en el aula
  const classroom = section(3, 'classroom', tr(C.classTitle), C.critClass,
    r.signals.length ? h('div', { class: 'sub' }, label(tr(C.observeSub), 'eye'),
      ...r.signals.map((sg) => h('div', { class: 'signal' }, h('p', {}, h('b', {}, sg.title), ' — ', sg.text), h('p', { class: 'suggest' }, sg.suggestion)))) : null,
    r.recommendations.length ? h('div', { class: 'sub' }, label(tr(C.recSub), 'checklist'),
      ...r.recommendations.map((rec) => h('div', { class: 'rec' },
        h('p', {}, h('b', {}, rec.dim.label)),
        list(rec.classroom),
        h('p', { class: 'muted' }, fill(tr(C.inApp), { games: rec.games.map((g) => GAME_BY_ID[g] ? tr(GAME_BY_ID[g].name) : g).join(', ') }))))) : null,
    !r.signals.length && !r.recommendations.length ? h('p', { class: 'muted' }, tr(C.classNothing)) : null);

  // 4 · Cómo trabaja
  const how = section(4, 'how', tr(C.howTitle), C.critHow,
    h('div', { class: 'sub' }, label(tr(C.conflictSub), 'chat'),
      r.conflict.length
        ? h('div', {}, ...r.conflict.map((c) => h('div', { class: 'conf-row' },
          h('span', {}, tr(CONFLICT_TEXT[c.style])),
          h('span', { class: 'rbar' }, h('span', { class: 'rbar-fill', style: { width: `${c.pct}%`, background: AREA_INK.social } })),
          h('span', { class: 'conf-pct' }, `${c.pct} %`))))
        : h('p', { class: 'muted' }, tr(C.noOrange)),
      basisBox('conflicto', r.conflict.length ? [fill(tr(C.stylesUsed), { n: r.conflict.length }), ...dimFacts(['conflicto'])] : [])),
    r.reciprocity.length ? h('div', { class: 'sub' }, label(tr(C.cheatSub), 'scale'),
      list(r.reciprocity.map((x) => `${tr(CHEAT_TEXT[x.style])} (${times(x.count)})`))) : null,
    h('div', { class: 'sub' }, label(tr(C.workSub), 'route'), r.workStyle.length ? list(r.workStyle) : h('p', { class: 'muted' }, tr(C.notEnough))));

  // 5 · Progreso
  const recent = s.plays.slice(-15).reverse();
  const table = (rows: typeof recent) => h('table', { class: 'history' },
    h('thead', {}, h('tr', {}, ...[C.colDate, C.colGame, C.colLevel, C.colStars].map((c) => h('th', {}, tr(c))))),
    h('tbody', {}, ...rows.map((p) => h('tr', {},
      h('td', {}, fmt(p.date)),
      h('td', {}, gameName(p.gameId).name, p.outcome.abandoned ? h('span', { class: 'muted' }, ' ', tr(C.abandoned)) : null),
      h('td', {}, String(p.level)),
      h('td', { class: 'stars', 'aria-label': `${p.stars}/3` }, '★'.repeat(p.stars) + '☆'.repeat(Math.max(0, 3 - p.stars)))))));
  const older = recent.slice(5);
  const starSum = s.plays.reduce((a, p) => a + p.stars, 0);
  const avgStars = s.plays.length ? (starSum / s.plays.length).toLocaleString(locale(), { maximumFractionDigits: 1 }) : null;
  const progress = section(5, 'progress', tr(C.progressTitle), C.critProgress,
    h('div', { class: 'sub' }, label(tr(C.levelsSub), 'layers'),
      h('ul', { class: 'levels' }, ...GAMES.filter((g) => g.id !== 'reflexion').map((g) =>
        h('li', {}, h('span', {}, tr(g.name)), h('b', {}, String(levelFor(s, g.id))))))),
    h('div', { class: 'sub' }, label(tr(C.recentSub), 'calendar'),
      recent.length ? table(recent.slice(0, 5)) : h('p', { class: 'muted' }, tr(C.noGames)),
      older.length ? h('details', { class: 'older no-print' }, h('summary', {}, fill(tr(C.olderGames), { n: older.length })), table(older)) : null),
    basisBox('pigmalion', avgStars ? [fill(tr(C.starsAvg), { n: avgStars })] : []));

  // 6 · Evidencias
  const rounds = ideaRounds(s);
  const drawings = s.evidence.filter((e) => e.kind === 'dibujo').reverse().slice(0, 4);
  const audios = s.evidence.filter((e) => e.kind === 'audio').reverse().slice(0, 3);
  const evidence = section(6, 'evidence', tr(C.evidenceTitle), C.critEvidence,
    rounds.length ? h('div', { class: 'sub' }, label(tr(C.ideasChosen), 'bulb'),
      ...rounds.map((x) => h('div', { class: 'ev-ideas' },
        h('p', { class: 'ev-label' }, x.question),
        h('p', {}, [...x.ideas, ...(x.own ? [fill(tr(C.ownIdeas), { n: x.own })] : [])].join(' · '))))) : null,
    drawings.length ? h('div', { class: 'sub' }, label(tr(C.drawings), 'pencil'),
      h('div', { class: 'evidence-grid' }, ...drawings.map((e) => h('figure', {}, h('img', { src: e.ref, alt: noEmoji(e.label) }), h('figcaption', {}, noEmoji(e.label)))))) : null,
    audios.length ? h('div', { class: 'sub' }, label(tr(C.voice), 'mic'), ...audios.map((e) => audioItem(e.ref, `${noEmoji(e.label)} · ${fmt(e.date)}`))) : null,
    !rounds.length && !drawings.length && !audios.length ? h('p', { class: 'muted' }, tr(C.noEvidence)) : null);

  return h('article', { class: 'report' },
    head,
    !r.enoughData ? h('p', { class: 'warn-line' }, tr(C.fewGames)) : null,
    summary, profile, classroom, how, progress, evidence,
    h('footer', { class: 'report-note' }, tr(C.finalNote)));
}
