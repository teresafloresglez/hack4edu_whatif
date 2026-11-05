import type { DimensionId, GameDef, Settings, Student } from '../core/types';
import { earnedPowers, powerInfo, syncPowers } from '../core/superpowers';
import { ALL_DIMS } from '../core/dimensions';
import SP from '../contenido/superpoderes.json';
import { loadSettings, loadStudents, newStudent, saveSettings, saveStudent } from '../core/storage';
import { ageBand, suggestPractice } from '../core/adaptation';
import { currentProject, startProject } from '../core/project';
import { makeRng } from '../core/rng';
import { configureSound, configureVoice, repeatLast, say, sfx, stopSpeaking, voiceForLangAvailable } from '../core/voice';
import { LANGS, setLang, getLang, tr, fill, type Lang } from '../i18n';
import { t } from '../i18n/strings';
import { THEMES, getTheme } from '../data/themes';
import { CULTURES } from '../data/cultures';
import { GAME_BY_ID, PHASES } from '../games/registry';
import { h } from '../games/common';
import { ic, type IconName } from './icons';
import { avatarArt } from './avatars';
import { lineIcon } from './informe';
import { runGame, repairProject, CANDIDATES } from './session';
import { openTeacher } from './teacher';

// Pantallas del niño. Todo funciona con dibujos grandes + voz; el texto es
// un apoyo (se oculta a los 6–7 años si hay voz en el idioma elegido).

const AVATARS = ['🦁', '🐘', '🐢', '🐒', '🦒', '🐸', '🦜', '🐠', '🐰', '🐼', '🦊', '🐞'];
const AVATAR_COLORS = ['#f4a261', '#90be6d', '#43aa8b', '#f9c74f', '#e76f51', '#577590', '#f94144', '#4d908e', '#f8961e', '#b5838d', '#e07a5f', '#81b29a'];

export interface AppState {
  root: HTMLElement;
  settings: Settings;
  student: Student | null;
  abort: AbortController | null;
}

let state: AppState;

export function startApp(root: HTMLElement): void {
  const settings = loadSettings();
  state = { root, settings, student: null, abort: null };
  applySettings(settings);
  showHome();
}

export function applySettings(s: Settings): void {
  state.settings = s;
  setLang(s.lang);
  configureVoice({ enabled: s.voiceEnabled, rate: s.voiceRate });
  configureSound(s.soundEnabled);
}

function screen(cls: string, ...children: (Node | null | false | undefined)[]): HTMLElement {
  stopSpeaking();
  const young = state.student ? ageBand(state.student.age) === 'young' && voiceForLangAvailable() && state.settings.voiceEnabled : false;
  document.body.classList.toggle('young', young);
  document.body.dataset.screen = cls;
  const el = h('main', { class: `screen ${cls}` }, ...children);
  state.root.replaceChildren(el);
  window.scrollTo?.(0, 0);
  return el;
}

function iconBtn(icon: IconName, label: string, onclick: () => void, cls = 'icon-btn'): HTMLButtonElement {
  return h('button', { class: cls, type: 'button', 'aria-label': label, title: label, onclick }, ic(icon, 34));
}

function topBar(opts: { back?: () => void; title?: string; stars?: boolean; powers?: boolean }): HTMLElement {
  const n = state.student ? earnedPowers(state.student).length : 0;
  return h('header', { class: 'topbar' },
    opts.back ? iconBtn('back', t('back'), () => { sfx('tap'); opts.back!(); }) : h('span', { class: 'icon-spacer' }),
    h('span', { class: 'topbar-title' }, opts.title ?? ''),
    h('span', { class: 'topbar-right' },
      opts.stars && state.student ? h('span', { class: 'stars-pill', 'aria-label': t('starsAria', { n: state.student.stars }) }, lineIcon('star', 20), String(state.student.stars)) : null,
      opts.powers && state.student ? h('button', { class: 'powers-pill', type: 'button', 'data-powers': 'true', 'aria-label': fill(tr(SP.ui.pillAria), { n }), onclick: () => { sfx('tap'); showPowers(); } }, lineIcon('bolt', 20), String(n)) : null,
      iconBtn('speaker', t('listenAgain'), () => void repeatLast())));
}

/** Botón grande con dibujo + texto (el texto se oculta a los 6–7 años). */
function bigTile(cls: string, icon: IconName, label: string, onclick: () => void, extra: Record<string, unknown> = {}, size = 64): HTMLButtonElement {
  return h('button', { class: cls, type: 'button', 'aria-label': label, onclick, ...extra }, ic(icon, size), h('span', { class: 'tile-label' }, label));
}

// ── Inicio: idioma y elegir jugador ─────────────────────────────────────
function changeLang(l: Lang): void {
  const s = { ...state.settings, lang: l };
  saveSettings(s);
  applySettings(s);
  sfx('tap');
  showHome();
}

export function showHome(): void {
  state.student = null;
  const students = loadStudents();
  const langs = h('div', { class: 'lang-row', role: 'group', 'aria-label': t('language') },
    ...LANGS.map((l) => h('button', {
      class: 'lang-btn' + (l.id === getLang() ? ' active' : ''), type: 'button', 'data-lang': l.id, 'aria-label': l.name, 'aria-pressed': String(l.id === getLang()),
      onclick: () => changeLang(l.id),
    }, ic(`flag_${l.id}` as IconName, 34), h('span', { class: 'lang-name' }, l.name))));
  const list = h('div', { class: 'avatar-grid' },
    ...students.map((s) => h('button', {
      class: 'avatar-btn', type: 'button', 'aria-label': s.name || t('player'),
      onclick: () => { sfx('tap'); state.student = s; showHub(); },
    }, h('span', { class: 'avatar-circle', style: { background: s.color } }, avatarArt(s.avatar, 76)), h('span', { class: 'avatar-name' }, s.name || ''))),
    h('button', { class: 'avatar-btn add', type: 'button', 'aria-label': t('newPlayer'), onclick: () => { sfx('tap'); showNewStudent(); } }, ic('add', 72)));
  screen('home',
    h('header', { class: 'home-header' },
      iconBtn('teacher', t('teacherZone'), () => openTeacher(state.root, () => { applySettings(loadSettings()); showHome(); }), 'teacher-btn'),
      h('div', { class: 'brand' },
        h('img', { class: 'brand-logo', src: './logo-192.png', width: 120, height: 120, alt: '' }),
        h('h1', { class: 'logo' }, 'WHAT IF?'),
        h('p', { class: 'brand-tagline' }, t('tagline')))),
    langs,
    h('p', { class: 'home-hint' }, students.length ? t('homeHintPlayers') : t('homeHintEmpty')),
    list);
  void say(students.length ? t('homeSayPlayers') : t('homeSayEmpty'));
}

// ── Nuevo jugador (avatar → edad → región → nombre opcional) ────────────
function showNewStudent(): void {
  let avatarIdx = -1;
  let age = 7;
  let regionId = state.settings.defaultRegion;
  const stepAvatar = () => {
    const grid = h('div', { class: 'avatar-grid' }, ...AVATARS.map((a, i) =>
      h('button', { class: 'avatar-btn', type: 'button', 'aria-label': t('animalN', { n: i + 1 }), onclick: () => { sfx('tap'); avatarIdx = i; stepAge(); } },
        h('span', { class: 'avatar-circle', style: { background: AVATAR_COLORS[i] } }, avatarArt(a, 76)))));
    screen('new', topBar({ back: showHome, title: t('whoAreYou') }), grid);
    void say(t('pickAnimal'));
  };
  const stepAge = () => {
    const grid = h('div', { class: 'age-grid' }, ...[6, 7, 8, 9, 10].map((a) =>
      h('button', { class: 'age-btn', type: 'button', 'data-age': String(a), 'aria-label': t('ageN', { n: a }), onclick: () => { sfx('tap'); age = a; stepRegion(); } },
        h('span', { class: 'age-num' }, String(a)), h('span', { class: 'age-dots', 'aria-hidden': 'true' }, '●'.repeat(a)))));
    screen('new', topBar({ back: stepAvatar, title: t('howOld') }), h('div', { class: 'hub-hero' }, h('span', { class: 'hub-avatar small', style: { background: AVATAR_COLORS[avatarIdx] } }, avatarArt(AVATARS[avatarIdx], 80))), grid);
    void say(t('howOldSay'));
  };
  const stepRegion = () => {
    // La región decide nombres, frutas y objetos, y con quién se compara la originalidad.
    const confirm = h('button', { class: 'big-btn done-btn', type: 'button', 'aria-label': t('next'), onclick: () => { sfx('tap'); stepName(); } }, ic('check', 40), h('span', { class: 'btn-label' }, t('next')));
    const grid = h('div', { class: 'region-grid' }, ...CULTURES.map((c) => {
      const b = h('button', { class: 'region-btn' + (c.id === regionId ? ' selected' : ''), type: 'button', 'data-region': c.id, 'aria-label': tr(c.name), 'aria-pressed': String(c.id === regionId) },
        h('span', { class: 'region-name' }, tr(c.name)));
      b.onclick = () => {
        sfx('tap');
        regionId = c.id;
        grid.querySelectorAll('.region-btn').forEach((x) => { x.classList.remove('selected'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('selected');
        b.setAttribute('aria-pressed', 'true');
        void say(tr(c.name));
      };
      return b;
    }));
    screen('new', topBar({ back: stepAge, title: t('whereFrom') }), grid, h('div', { class: 'row-center' }, confirm));
    void say(t('whereFromSay'));
  };
  const stepName = () => {
    const input = h('input', { class: 'name-input', type: 'text', maxlength: '20', placeholder: t('namePlaceholder'), 'aria-label': t('nameAria') });
    const create = () => {
      const s = newStudent({ name: input.value.trim(), avatar: AVATARS[avatarIdx], color: AVATAR_COLORS[avatarIdx], age, regionId });
      saveStudent(s);
      state.student = s;
      sfx('win');
      showHub();
    };
    screen('new', topBar({ back: stepRegion, title: t('yourName') }), h('div', { class: 'hub-hero' }, h('span', { class: 'hub-avatar small', style: { background: AVATAR_COLORS[avatarIdx] } }, avatarArt(AVATARS[avatarIdx], 80))),
      input,
      h('div', { class: 'row-center' }, h('button', { class: 'big-btn done-btn', type: 'button', 'aria-label': t('done'), onclick: create }, ic('check', 40), h('span', { class: 'btn-label' }, t('done')))));
    void say(t('nameSay'));
  };
  stepAvatar();
}

// ── Pantalla principal del niño ─────────────────────────────────────────
function showHub(): void {
  const s = state.student!;
  // Alumnos de versiones anteriores: sus puntos fuertes ya ganados pasan a ser superpoderes.
  if (syncPowers(s).length) saveStudent(s);
  const proj = currentProject(s);
  const buttons = h('div', { class: 'hub-actions' },
    proj
      ? bigTile('hub-btn primary', 'continue', t('continueProject'), () => { sfx('tap'); showMap(); })
      : bigTile('hub-btn primary', 'rocket', t('startProject'), () => { sfx('tap'); showThemes(); }),
    proj ? bigTile('hub-btn', 'newProject', t('newProject'), () => { sfx('tap'); showThemes(); }) : null,
    bigTile('hub-btn', 'dice', t('freePlay'), () => { sfx('tap'); showFreePlay(); }));
  screen('hub', topBar({ back: showHome, stars: true, powers: true }),
    h('div', { class: 'hub-hero' }, h('span', { class: 'hub-avatar', style: { background: s.color } }, avatarArt(s.avatar, 110)), h('span', { class: 'hub-name' }, s.name)),
    buttons);
  void say(proj ? t('hubSayContinue') : t('hubSayStart'));
}

// ── Jugar libre: catálogo de juegos (el sugerido por la app va primero) ──
function showFreePlay(): void {
  const s = state.student!;
  const suggested = suggestPractice(s, CANDIDATES, makeRng());
  const ids = CANDIDATES.map((c) => c.id).sort((a, b) => (a === suggested ? -1 : b === suggested ? 1 : 0));
  const grid = h('div', { class: 'next-games free-games' }, ...ids.map((gid, i) => {
    const g = GAME_BY_ID[gid];
    const name = tr(g.name);
    return h('button', { class: 'game-tile' + (i === 0 ? ' first' : ''), type: 'button', 'data-game': gid, 'aria-label': name, onclick: () => { sfx('tap'); void playGame(g, false); } },
      ic(g.id, 72), h('span', { class: 'game-name' }, name));
  }));
  screen('free', topBar({ back: showHub, title: t('freePlay'), stars: true }), grid);
  void say(t('freePlaySay'));
}

// ── Mis superpoderes (perfil del niño: sin puntuaciones, solo lo que se le da bien) ──
function powerCard(id: DimensionId, fresh = false): HTMLButtonElement {
  const p = powerInfo(id);
  const text = `${tr(p.name)}. ${tr(p.text)}`;
  return h('button', { class: 'power-card' + (fresh ? ' fresh' : ''), type: 'button', style: { background: p.color }, 'data-power': id, 'aria-label': text, onclick: () => { sfx('tap'); void say(text); } },
    h('span', { class: 'power-emoji', 'aria-hidden': 'true' }, p.emoji),
    h('span', { class: 'power-name' }, tr(p.name)),
    h('span', { class: 'power-text' }, tr(p.text)));
}

function showPowers(): void {
  const s = state.student!;
  const mine = earnedPowers(s);
  // Pocas cartas misteriosas: invitan a seguir jugando sin mostrar lo que falta.
  const hidden = Math.min(3, ALL_DIMS.length - mine.length);
  const mystery = Array.from({ length: hidden }, () =>
    h('button', { class: 'power-card mystery', type: 'button', 'aria-label': tr(SP.ui.mystery), onclick: () => { sfx('tap'); void say(tr(SP.ui.mysterySay)); } },
      h('span', { class: 'power-emoji', 'aria-hidden': 'true' }, '?'),
      h('span', { class: 'power-name' }, tr(SP.ui.mystery))));
  screen('powers', topBar({ back: showHub, title: tr(SP.ui.title), stars: true }),
    h('div', { class: 'hub-hero' }, h('span', { class: 'hub-avatar small', style: { background: s.color } }, avatarArt(s.avatar, 80)), h('span', { class: 'hub-name' }, s.name)),
    h('div', { class: 'power-grid' }, ...mine.map((d) => powerCard(d)), ...mystery));
  void say(tr(mine.length ? SP.ui.say : SP.ui.sayNone));
}

// ── Elegir tema (lo elige el niño; en modo clase, el docente) ───────────
function showThemes(): void {
  const s = state.student!;
  const classTheme = state.settings.classProject;
  const themes = classTheme ? THEMES.filter((th) => th.id === classTheme) : THEMES;
  let selected: string | null = null;
  const confirm = h('button', { class: 'big-btn done-btn', type: 'button', disabled: true, 'aria-label': t('thisOne') }, ic('check', 40), h('span', { class: 'btn-label' }, t('thisOne')));
  const grid = h('div', { class: 'theme-grid' }, ...themes.map((th) => {
    const b = h('button', { class: 'theme-btn', type: 'button', style: { background: th.bg }, 'data-theme': th.id, 'aria-label': tr(th.name) },
      ic(th.id, 76), h('span', { class: 'theme-name' }, tr(th.name)));
    b.onclick = () => {
      sfx('tap');
      selected = th.id;
      grid.querySelectorAll('.theme-btn').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      confirm.disabled = false;
      void say(tr(th.question));
    };
    return b;
  }));
  confirm.onclick = () => {
    if (!selected) return;
    startProject(s, selected, CANDIDATES, makeRng());
    saveStudent(s);
    sfx('win');
    showMap(true);
  };
  screen('themes', topBar({ back: showHub, title: t('whatDoYouLike') }), grid, h('div', { class: 'row-center' }, confirm));
  void say(classTheme ? t('themesSayClass') : t('themesSay'));
}

// ── Mapa del proyecto (5 fases) ─────────────────────────────────────────
function showMap(intro = false): void {
  const s = state.student!;
  if (repairProject(s)) saveStudent(s);
  const proj = currentProject(s);
  if (!proj) return showHub();
  const theme = getTheme(proj.themeId);
  const question = tr(theme.question);
  const path = h('ol', { class: 'phase-path' }, ...PHASES.map((ph) => {
    const st = ph.id < proj.phase ? 'done' : ph.id === proj.phase ? 'now' : 'todo';
    return h('li', { class: `phase-step ${st}`, 'aria-current': st === 'now' ? 'step' : undefined },
      ic(st === 'done' ? 'check' : ph.icon, 36), h('span', { class: 'phase-name' }, tr(ph.name)));
  }));
  const nextGames = h('div', { class: 'next-games' }, ...proj.plan.map((gid, i) => {
    const g = GAME_BY_ID[gid];
    if (!g) return null;
    const name = tr(g.name);
    return h('button', { class: 'game-tile' + (i === 0 ? ' first' : ''), type: 'button', 'data-game': gid, 'aria-label': name, onclick: () => { sfx('tap'); void playGame(g, true); } },
      ic(g.id, 72), h('span', { class: 'game-name' }, name), i === 0 ? h('span', { class: 'play-badge' }, ic('play', 34)) : null);
  }));
  const product = h('div', { class: 'product-strip', style: { background: theme.bg } },
    h('span', { class: 'product-base-small' }, theme.productBase),
    ...proj.productItems.map((it) => h('span', { class: 'product-item small' }, it)));
  screen('map', topBar({ back: showHub, title: tr(theme.name), stars: true }),
    h('div', { class: 'question-card' }, ic(theme.id, 52), h('span', { class: 'question-text' }, question),
      h('button', { class: 'speak-btn', type: 'button', 'aria-label': t('listen'), onclick: () => void say(question) }, ic('speaker', 30))),
    path, nextGames, product);
  const phase = PHASES.find((p) => p.id === proj.phase)!;
  void say((intro ? question + ' ' : '') + t('nowPhase', { phase: tr(phase.name) }));
}

// ── Predicción antes del juego (autoconocimiento) ───────────────────────
/** Devuelve la predicción, `undefined` si el juego no la pide, o `null` si el niño vuelve atrás. */
function askPrediction(game: GameDef, back: () => void): Promise<number | undefined | null> {
  if (game.predict === 'none') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let grid: HTMLElement;
    let text: string;
    if (game.predict === 'stars') {
      text = t('predictStars');
      grid = h('div', { class: 'choice-grid cols-3' }, ...([
        { v: 1, icon: 'faceWorried', label: t('predOk') },
        { v: 2, icon: 'faceHappy', label: t('predGood') },
        { v: 3, icon: 'faceGreat', label: t('predGreat') },
      ] as const).map((o) => h('button', { class: 'choice-btn predict-btn', type: 'button', 'data-v': String(o.v), 'aria-label': o.label, onclick: () => { sfx('tap'); resolve(o.v); } },
        ic(o.icon, 64), h('span', { class: 'small-label' }, o.label))));
    } else {
      text = t('predictIdeas');
      grid = h('div', { class: 'choice-grid cols-4' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
        h('button', { class: 'choice-btn predict-btn', type: 'button', 'data-v': String(n), 'aria-label': String(n), onclick: () => { sfx('tap'); resolve(n); } },
          h('span', { class: 'predict-num' }, String(n)), h('span', { class: 'predict-dots', 'aria-hidden': 'true' }, '●'.repeat(n)))));
    }
    screen('predict', topBar({ title: tr(game.name), back: () => { resolve(null); back(); } }), h('div', { class: 'center' }, ic(game.id, 96)),
      h('div', { class: 'instruction' }, ic('idear', 44), h('span', { class: 'instruction-text' }, text),
        h('button', { class: 'speak-btn', type: 'button', 'aria-label': t('listenAgain'), onclick: () => void say(text) }, ic('speaker', 30))), grid);
    void say(text);
  });
}

// ── Jugar ───────────────────────────────────────────────────────────────
async function playGame(game: GameDef, inProject: boolean): Promise<void> {
  const s = state.student!;
  // «Atrás» vuelve a donde eligió el juego: el mapa del proyecto o el catálogo de «Jugar libre».
  const prediction = await askPrediction(game, () => (inProject && currentProject(s) ? showMap() : inProject ? showHub() : showFreePlay()));
  if (prediction === null) return;
  const stage = h('section', { class: 'stage', 'aria-live': 'polite' });
  const abort = new AbortController();
  state.abort = abort;
  screen('game',
    h('header', { class: 'topbar' },
      iconBtn('home', t('exit'), () => { sfx('tap'); stopSpeaking(); abort.abort(); }, 'icon-btn exit'),
      h('span', { class: 'topbar-title' }, ic(game.id, 30), ' ', tr(game.name)),
      h('span', { class: 'topbar-right' }, iconBtn('speaker', t('listenAgain'), () => void repeatLast()))),
    stage);
  try {
    const r = await runGame({ student: s, game, root: stage, exitSignal: abort.signal, prediction, settings: state.settings });
    state.abort = null;
    showReward(game, r.applied.stars, r.applied.improved, r.earnedItem, r.outcome.abandoned, r.projectFinished, inProject, r.newPowers);
  } catch (err) {
    console.error(err);
    state.abort = null;
    screen('error', topBar({ back: showHub }), h('div', { class: 'big-emoji center' }, '🙈'),
      h('p', { class: 'center' }, t('gameError')));
  }
}

function showReward(game: GameDef, stars: number, improved: boolean, item: string | null, abandoned: boolean, finished: boolean, inProject: boolean, newPowers: DimensionId[] = []): void {
  const s = state.student!;
  const theme = getTheme(currentProject(s)?.themeId ?? s.projects[s.projects.length - 1]?.themeId ?? 'parque');
  const product = tr(theme.product);
  const msg = abandoned ? t('rewardAbandon') : improved ? t('rewardImproved') : t('rewardGood');
  const starRow = h('div', { class: 'reward-stars' }, ...Array.from({ length: stars }, (_, i) => h('span', { class: 'reward-star', style: { animationDelay: `${i * 0.25}s` } }, '⭐')));
  const next = h('button', { class: 'big-btn done-btn icon-only', type: 'button', 'aria-label': t('next'), onclick: () => {
    sfx('tap');
    if (finished) showFinished();
    else if (inProject && currentProject(s)) showMap();
    else showHub();
  } }, ic('next', 52));
  screen('reward', topBar({ title: tr(game.name), stars: true }), starRow,
    h('p', { class: 'reward-msg' }, msg),
    item ? h('div', { class: 'reward-item' }, h('span', { class: 'big-emoji' }, item), h('span', { class: 'small-label' }, t('rewardFor', { product }))) : null,
    newPowers.length ? h('div', { class: 'new-power' }, h('p', { class: 'new-power-title' }, tr(SP.ui.new)), ...newPowers.map((d) => powerCard(d, true))) : null,
    h('div', { class: 'row-center' }, next));
  sfx('win');
  const powersSay = newPowers.map((d) => ' ' + fill(tr(SP.ui.newSay), { name: tr(powerInfo(d).name) })).join('');
  void say(msg + (item ? t('rewardItemSay', { product }) : '') + powersSay);
}

function showFinished(): void {
  const s = state.student!;
  screen('finished', topBar({ title: t('projectDone'), stars: true }),
    h('div', { class: 'center' }, ic('reflexion', 140)),
    h('p', { class: 'reward-msg' }, t('projectDoneMsg')),
    h('div', { class: 'row-center' }, iconBtn('home', t('back'), () => { sfx('tap'); showHub(); }, 'big-btn done-btn icon-only')));
  sfx('win');
  void say(t('projectDoneSay', { name: s.name ? ', ' + s.name : '' }));
}
