// Voz: lee en voz alta todos los enunciados para niños que aún no leen.
// Usa las voces instaladas en el dispositivo (funcionan sin conexión
// en Android/iOS/Windows). Si no hay voz, la app sigue funcionando:
// todo tiene iconos y sonidos.

import { getLang, LANGS, onLangChange } from '../i18n';

let enabled = true;
let rate = 0.9;
let cachedVoice: SpeechSynthesisVoice | null = null;
let lastText = '';

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (cachedVoice) return cachedVoice;
  const voices = s.getVoices();
  const lang = getLang();
  const same = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(lang));
  // Preferir voces locales (offline) del idioma de la app.
  // Primero la variante del idioma configurada (es-ES, en-GB, fr-FR), después la predeterminada del sistema.
  const wanted = LANGS.find((x) => x.id === lang)?.voice.toLowerCase();
  const local = same.filter((v) => v.localService);
  cachedVoice = local.find((v) => v.lang?.toLowerCase().replace('_', '-') === wanted) ?? local.find((v) => v.default) ?? local[0] ?? same[0] ?? null;
  return cachedVoice;
}

if (synth()) {
  try {
    synth()!.onvoiceschanged = () => {
      cachedVoice = null;
      pickVoice();
    };
  } catch {
    /* algunos navegadores no permiten asignarlo */
  }
}

// Al cambiar de idioma hay que volver a elegir voz.
onLangChange(() => {
  cachedVoice = null;
  stopSpeaking();
});

export function configureVoice(opts: { enabled?: boolean; rate?: number }): void {
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.rate !== undefined) rate = opts.rate;
  if (!enabled) stopSpeaking();
}

/** ¿Hay voz para el idioma actual? (si el sistema aún no ha cargado la lista, suponemos que sí) */
export function voiceForLangAvailable(): boolean {
  const s = synth();
  if (!s) return false;
  try {
    const voices = s.getVoices();
    if (!voices.length) return true;
    return voices.some((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(getLang()));
  } catch {
    return true;
  }
}

export function voiceAvailable(): boolean {
  return !!synth();
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    /* nada */
  }
}

/** Dice un texto. Resuelve al terminar (o tras un tiempo máximo). */
export function say(text: string): Promise<void> {
  lastText = text;
  const s = synth();
  if (!enabled || !s || !text) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANGS.find((x) => x.id === getLang())?.voice ?? 'es-ES';
      u.rate = rate;
      u.pitch = 1.1;
      const v = pickVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      u.onend = finish;
      u.onerror = finish;
      s.speak(u);
      // Tope de seguridad: ~ 90 ms por carácter.
      setTimeout(finish, Math.min(15000, 1200 + text.length * 90));
    } catch {
      finish();
    }
  });
}

/** Repite lo último que se dijo (botón 🔊). */
export function repeatLast(): Promise<void> {
  return say(lastText);
}

// ── Sonidos de feedback (sin texto, sin archivos) ───────────────────────
let audioCtx: AudioContext | null = null;
let soundOn = true;

export function configureSound(on: boolean): void {
  soundOn = on;
}

export function sfx(kind: 'ok' | 'bad' | 'tap' | 'win'): void {
  if (!soundOn) return;
  try {
    const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AC) return;
    audioCtx ??= new AC();
    const ctx = audioCtx;
    const notes: Record<typeof kind, number[]> = {
      ok: [660, 880],
      bad: [300, 220],
      tap: [520],
      win: [523, 659, 784, 1047],
    };
    notes[kind].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = kind === 'bad' ? 'triangle' : 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.18);
    });
  } catch {
    /* sin audio */
  }
}
