import type { Settings, Student } from '../core/types';
import {
  deleteStudent, exportAll, importAll, loadSettings, loadStudents, saveSettings, saveStudent,
} from '../core/storage';
import { AREAS } from '../core/dimensions';
import { buildReport } from '../core/report';
import { say } from '../core/voice';
import { CULTURES } from '../data/cultures';
import { THEMES } from '../data/themes';
import { GAMES, PHASES } from '../games/registry';
import { h } from '../games/common';
import { LANGS, isLang, setLang, tr } from '../i18n';
import { t } from '../i18n/strings';
import { ic } from './icons';
import { reportView, lineIcon, AREA_STYLE } from './informe';
import { avatarArt } from './avatars';

// Zona del docente: protegida con PIN. Aquí se ve el perfil agregado,
// nunca en la pantalla del niño.

let root: HTMLElement;
let onExit: () => void;

export function openTeacher(r: HTMLElement, exit: () => void): void {
  root = r;
  onExit = exit;
  document.body.classList.remove('young');
  showPin();
}

function page(...children: (Node | null | false | undefined)[]): HTMLElement {
  document.body.dataset.screen = 'teacher';
  const el = h('main', { class: 'screen teacher' }, ...children);
  root.replaceChildren(el);
  window.scrollTo?.(0, 0);
  return el;
}

function header(title: string, back: () => void, extra?: Node): HTMLElement {
  return h('header', { class: 'teacher-header no-print' },
    h('button', { class: 'tbtn', type: 'button', onclick: back }, t('tBack')),
    h('h1', {}, title), extra ?? h('span', {}));
}

// ── PIN ─────────────────────────────────────────────────────────────────
function showPin(): void {
  const settings = loadSettings();
  let entered = '';
  const display = h('div', { class: 'pin-display', 'aria-live': 'polite' }, '····');
  const msg = h('p', { class: 'pin-msg' }, t('pinPrompt'));
  const press = (d: string) => {
    if (d === '⌫') entered = entered.slice(0, -1);
    else if (entered.length < 6) entered += d;
    display.textContent = '•'.repeat(entered.length).padEnd(4, '·');
    if (entered.length >= settings.teacherPin.length) {
      if (entered === settings.teacherPin) showDashboard();
      else {
        msg.textContent = t('pinWrong');
        entered = '';
        display.textContent = '····';
      }
    }
  };
  const pad = h('div', { class: 'pin-pad' }, ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map((d) =>
    h('button', { class: 'pin-key', type: 'button', 'data-key': d, onclick: () => press(d) }, d)));
  page(header(t('teacherZone'), onExit), h('div', { class: 'pin-box' }, display, msg, pad));
}

// ── Panel principal ─────────────────────────────────────────────────────
function showDashboard(tab: 'alumnos' | 'ajustes' | 'info' = 'alumnos'): void {
  const tabs = h('nav', { class: 'tabs no-print' }, ...([
    ['alumnos', t('tabStudents')], ['ajustes', t('tabSettings')], ['info', t('tabInfo')],
  ] as const).map(([id, label]) => h('button', { class: 'tab' + (tab === id ? ' active' : ''), type: 'button', onclick: () => showDashboard(id) }, label)));
  const body = tab === 'alumnos' ? studentsTab() : tab === 'ajustes' ? settingsTab() : infoTab();
  page(header(t('teacherZone'), onExit), tabs, body);
}

function bar(score: number | null, color: string): HTMLElement {
  const v = score ?? 0;
  return h('span', { class: 'mini-bar', title: score === null ? t('noData') : `${score}/100` },
    h('span', { class: 'mini-fill', style: { width: `${v}%`, background: score === null ? '#ddd' : color } }));
}

function studentsTab(): HTMLElement {
  const students = loadStudents();
  if (!students.length) {
    return h('section', { class: 'card' }, h('p', {}, t('noStudents')));
  }
  const reports = students.map(buildReport);
  const areaIds = Object.keys(AREAS) as (keyof typeof AREAS)[];
  const table = h('table', { class: 'class-table' },
    h('thead', {}, h('tr', {}, h('th', {}, t('colStudent')), h('th', {}, t('colAge')), h('th', {}, t('colGames')),
      ...areaIds.map((a) => h('th', { title: tr(AREAS[a].label), class: 'th-area', style: { color: AREA_STYLE[a].ink } }, lineIcon(AREA_STYLE[a].icon, 20), h('span', { class: 'th-label' }, tr(AREAS[a].label)))),
      h('th', {}, t('colObserve')), h('th', {}))),
    h('tbody', {}, ...reports.map((r) => h('tr', {},
      h('td', {}, h('span', { class: 'tavatar', style: { background: r.student.color } }, avatarArt(r.student.avatar, 30)), ' ', r.student.name || t('noName')),
      h('td', {}, String(r.student.age)),
      h('td', {}, String(r.gamesPlayed)),
      ...areaIds.map((a) => {
        const ar = r.areas.find((x) => x.id === a)!;
        return h('td', {}, bar(ar.score, AREA_STYLE[a].fill));
      }),
      h('td', {}, r.signals.length ? h('span', { class: 'signal-pill' }, lineIcon('eye', 16), String(r.signals.length)) : '—'),
      h('td', {}, h('button', { class: 'tbtn primary', type: 'button', onclick: () => showReport(r.student.id) }, t('viewReport')))))));

  // Resumen de clase por área
  const classAreas = areaIds.map((a) => {
    const vals = reports.map((r) => r.areas.find((x) => x.id === a)!.score).filter((x): x is number => x !== null);
    return { a, avg: vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null };
  });
  // Dos bloques separados, uno debajo del otro: resumen de la clase y tabla del alumnado.
  return h('section', { class: 'class-view' },
    h('div', { class: 'card class-card' }, h('h2', {}, t('classSummary')),
      h('div', { class: 'area-summary' }, ...classAreas.map(({ a, avg }) =>
        h('div', { class: 'area-chip', style: { background: AREA_STYLE[a].tint, borderColor: AREA_STYLE[a].fill } },
          h('span', { class: 'area-chip-head', style: { color: AREA_STYLE[a].ink } }, lineIcon(AREA_STYLE[a].icon, 20), tr(AREAS[a].label)),
          bar(avg, AREA_STYLE[a].fill),
          h('span', { class: 'area-chip-val' }, avg === null ? t('noDataLower') : `${avg}/100`))))),
    h('div', { class: 'card class-card' }, h('h2', {}, t('tabStudents').replace(/^\P{L}+/u, '')),
      h('div', { class: 'table-wrap' }, table),
      h('p', { class: 'muted small' }, t('classNote'))));
}

// ── Informe individual ──────────────────────────────────────────────────
export function showReport(studentId: string): void {
  const s = loadStudents().find((x) => x.id === studentId);
  if (!s) return showDashboard();
  const r = buildReport(s);
  page(
    header(t('report'), () => showDashboard(), h('div', { class: 'row' },
      h('button', { class: 'tbtn', type: 'button', onclick: () => showEditStudent(s) }, t('edit')),
      h('button', { class: 'tbtn danger', type: 'button', 'data-delete': 'true', onclick: () => {
        // Solo el docente llega aquí (zona protegida con PIN). Siempre se pide confirmación.
        if (confirm(t('deleteConfirm', { name: s.name || t('thisStudent') }))) {
          deleteStudent(s.id);
          showDashboard();
        }
      } }, t('deleteStudent')),
      h('button', { class: 'tbtn primary', type: 'button', onclick: () => window.print() }, t('print')))),
    reportView(r),
  );
}

// El informe individual vive en ./informe.ts (se reexporta para no romper importaciones).
export { reportView };

function showEditStudent(s: Student): void {
  const name = h('input', { class: 'tinput', type: 'text', value: s.name, maxlength: '30' });
  const age = h('select', { class: 'tinput' }, ...[6, 7, 8, 9, 10].map((a) => h('option', { value: String(a), selected: a === s.age }, t('ageN', { n: a }))));
  const region = h('select', { class: 'tinput' }, ...CULTURES.map((c) => h('option', { value: c.id, selected: c.id === s.regionId }, tr(c.name))));
  const save = h('button', { class: 'tbtn primary', type: 'button', onclick: () => {
    s.name = name.value.trim();
    s.age = Number(age.value);
    s.regionId = region.value;
    saveStudent(s);
    showReport(s.id);
  } }, t('save'));
  const del = h('button', { class: 'tbtn danger', type: 'button', onclick: () => {
    if (confirm(t('deleteConfirm', { name: s.name || t('thisStudent') }))) {
      deleteStudent(s.id);
      showDashboard();
    }
  } }, t('deleteStudent'));
  page(header(t('editStudent'), () => showReport(s.id)),
    h('section', { class: 'card form' },
      h('label', {}, t('fName'), name), h('label', {}, t('fAge'), age), h('label', {}, t('fRegion'), region),
      h('div', { class: 'row' }, save, del)));
}

// ── Ajustes ─────────────────────────────────────────────────────────────
function settingsTab(): HTMLElement {
  const s: Settings = loadSettings();
  const lang = h('select', { class: 'tinput' }, ...LANGS.map((l) => h('option', { value: l.id, selected: l.id === s.lang }, l.name)));
  const region = h('select', { class: 'tinput' }, ...CULTURES.map((c) => h('option', { value: c.id, selected: c.id === s.defaultRegion }, tr(c.name))));
  const classProject = h('select', { class: 'tinput' },
    h('option', { value: '', selected: !s.classProject }, t('sClassOff')),
    ...THEMES.map((th) => h('option', { value: th.id, selected: s.classProject === th.id }, `${th.icon} ${tr(th.name)}`)));
  const voice = h('input', { type: 'checkbox', checked: s.voiceEnabled });
  const sound = h('input', { type: 'checkbox', checked: s.soundEnabled });
  const rate = h('input', { type: 'range', min: '0.6', max: '1.3', step: '0.05', value: String(s.voiceRate) });
  const pin = h('input', { class: 'tinput', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', value: s.teacherPin });
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const save = h('button', { class: 'tbtn primary', type: 'button', onclick: () => {
    const newPin = pin.value.replace(/\D/g, '');
    if (newPin.length < 4) { status.textContent = t('sPinShort'); return; }
    const newLang = isLang(lang.value) ? lang.value : s.lang;
    saveSettings({ ...s, lang: newLang, defaultRegion: region.value, classProject: classProject.value || undefined, voiceEnabled: voice.checked, soundEnabled: sound.checked, voiceRate: Number(rate.value), teacherPin: newPin });
    if (newLang !== s.lang) { setLang(newLang); showDashboard('ajustes'); return; }
    status.textContent = t('sSaved');
  } }, t('sSave'));
  const test = h('button', { class: 'tbtn', type: 'button', onclick: () => void say(t('sTestVoiceSay')) }, t('sTestVoice'));

  const exportBtn = h('button', { class: 'tbtn', type: 'button', onclick: () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `whatif-copia-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
  } }, t('sExport'));
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'tinput' });
  file.onchange = async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const n = importAll(await f.text());
      status.textContent = t('sImported', { n });
    } catch (e) {
      status.textContent = t('sImportFail') + (e as Error).message;
    }
  };
  return h('section', { class: 'card form' },
    h('label', {}, t('sLang'), lang),
    h('label', {}, t('sDefaultRegion'), region),
    h('label', {}, t('sClass'), classProject),
    h('label', { class: 'check' }, voice, t('sVoice')),
    h('label', {}, t('sRate'), rate),
    h('label', { class: 'check' }, sound, t('sSound')),
    h('label', {}, t('sPin'), pin),
    h('div', { class: 'row' }, save, test),
    status,
    h('hr', {}),
    h('h2', {}, t('sBackups')),
    h('p', { class: 'muted' }, t('sBackupsNote')),
    h('div', { class: 'row' }, exportBtn),
    h('label', {}, t('sImport'), file));
}

function infoTab(): HTMLElement {
  return h('section', { class: 'card info' },
    h('h2', {}, t('iWhat')),
    h('p', {}, t('iWhatText')),
    h('p', {}, h('b', {}, t('iCycle')), t('iCycleText')),
    h('h3', {}, t('iProjects')),
    h('p', {}, t('iProjectsText')),
    h('ol', {}, ...PHASES.map((p) => h('li', {}, ic(p.icon, 22), ` ${tr(p.name)} (${tr(p.thinking)}): `, GAMES.filter((g) => g.phase === p.id).map((g) => tr(g.name)).join(', ')))),
    h('h3', {}, t('iGames')),
    h('ul', {}, ...GAMES.map((g) => h('li', {}, ic(g.id, 22), ' ', h('b', {}, `${tr(g.name)}: `), tr(g.teacherInfo)))),
    h('h3', {}, t('iGolden')),
    h('p', {}, t('iGoldenText')),
    h('h3', {}, t('iAdapt')),
    h('ul', {}, h('li', {}, t('iAdapt1')), h('li', {}, t('iAdapt2')), h('li', {}, t('iAdapt3')), h('li', {}, t('iAdapt4'))),
    h('h3', {}, t('iOffline')),
    h('p', {}, t('iOfflineText')));
}
