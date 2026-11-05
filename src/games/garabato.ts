import type { Evidence, GameContext, GameDef, GameOutcome } from '../core/types';
import { pick } from '../core/rng';
import { loadIdeaFreq } from '../core/storage';
import { tr, type L } from '../i18n';
import { ic } from '../ui/icons';
import { h, render, instruction, waitFor, obs, now, isAbort, abandonedOutcome, doneButton } from './common';
import { canRecord, startRecording } from './recorder';

// Fase 3 · Idear · Respuesta ABIERTA. Completar un garabato (Torrance).
// Elaboración = trazos, colores, superficie y si sale del garabato inicial.
// Originalidad = lo poco habitual que es lo que dice que ha dibujado (en su región).

const PALETTE = ['#222222', '#d62828', '#2b9348', '#1d4ed8', '#f6c90e', '#f77f00', '#7b2cbf', '#8d5524'];

const SQUIGGLES = [
  'M60 160 C 90 60, 160 60, 180 140 S 260 220, 290 120',
  'M80 200 Q 150 40 220 200',
  'M70 120 C 120 40, 200 40, 160 120 C 120 200, 240 220, 280 150',
  'M100 100 L 160 200 L 220 100',
  'M150 80 C 80 80, 80 200, 150 200 C 200 200, 210 150, 180 130',
];

/** Categorías GENERALES para decir qué es el dibujo (un gato → animal, un sol → cielo…). */
export const DOODLE_CATEGORIES: { id: string; emoji: string; name: L }[] = [
  { id: 'animal', emoji: '🐾', name: { es: 'Un animal', en: 'An animal', fr: 'Un animal' } },
  { id: 'persona', emoji: '🙂', name: { es: 'Una persona', en: 'A person', fr: 'Une personne' } },
  { id: 'casa', emoji: '🏠', name: { es: 'Una casa o edificio', en: 'A house or building', fr: 'Une maison ou un bâtiment' } },
  { id: 'planta', emoji: '🌳', name: { es: 'Una planta o árbol', en: 'A plant or tree', fr: 'Une plante ou un arbre' } },
  { id: 'cielo', emoji: '☀️', name: { es: 'El cielo: sol, nubes, estrellas', en: 'The sky: sun, clouds, stars', fr: 'Le ciel : soleil, nuages, étoiles' } },
  { id: 'agua', emoji: '🏖️', name: { es: 'La playa, el mar o el agua', en: 'The beach, the sea or water', fr: 'La plage, la mer ou l’eau' } },
  { id: 'paisaje', emoji: '⛰️', name: { es: 'Un paisaje o montaña', en: 'A landscape or mountain', fr: 'Un paysage ou une montagne' } },
  { id: 'vehiculo', emoji: '🚗', name: { es: 'Un vehículo', en: 'A vehicle', fr: 'Un véhicule' } },
  { id: 'comida', emoji: '🍎', name: { es: 'Comida', en: 'Food', fr: 'De la nourriture' } },
  { id: 'objeto', emoji: '🎈', name: { es: 'Un juguete u objeto', en: 'A toy or object', fr: 'Un jouet ou un objet' } },
  { id: 'fantasia', emoji: '👾', name: { es: 'Un monstruo o ser mágico', en: 'A monster or magic creature', fr: 'Un monstre ou un être magique' } },
  { id: 'otro', emoji: '❓', name: { es: 'Otra cosa', en: 'Something else', fr: 'Autre chose' } },
];

export interface DoodleStats { strokes: number; colors: number; coverage: number; extension: number; drawMs: number }

/** Proporción de píxeles con tinta (muestreo de 1 de cada 37 píxeles). */
export function inkRatio(data: ArrayLike<number>): number {
  let ink = 0, total = 0;
  for (let i = 0; i + 2 < data.length; i += 4 * 37) {
    total++;
    if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) ink++;
  }
  return total ? ink / total : 0;
}

/** Superficie que ha dibujado el NIÑO: se descuenta la raya gris inicial. */
export function drawnCoverage(before: ArrayLike<number> | null, after: ArrayLike<number>): number {
  return Math.max(0, inkRatio(after) - (before ? inkRatio(before) : 0));
}

export function elaborationScore(s: DoodleStats, young: boolean): number {
  const strokesN = Math.min(1, s.strokes / (young ? 6 : 9));
  const colorsN = Math.min(1, (s.colors - 1) / 3);
  const coverN = Math.min(1, s.coverage / 0.12);
  return Math.max(0, Math.min(1, 0.35 * strokesN + 0.25 * Math.max(0, colorsN) + 0.25 * coverN + 0.15 * s.extension));
}

async function play(ctx: GameContext): Promise<GameOutcome> {
  const start = now();
  const W = 360, H = 280;
  const squiggle = pick(SQUIGGLES, ctx.rng);
  const canvas = h('canvas', { class: 'doodle-canvas', width: W, height: H, 'aria-label': tr({ es: 'Zona de dibujo', en: 'Drawing area', fr: 'Zone de dessin' }) });
  const g = canvas.getContext?.('2d') ?? null;
  let color = PALETTE[0];
  let strokes = 0, firstDraw = 0, lastDraw = 0;
  const colorsUsed = new Set<string>();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let drawing = false;
  let erasing = false;
  let erases = 0;

  if (g) {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#9aa0a6';
    g.lineWidth = 6;
    try {
      g.stroke(new Path2D(squiggle));
    } catch {
      /* Path2D no disponible */
    }
  }
  let baseline: Uint8ClampedArray | null = null;
  try {
    baseline = g ? g.getImageData(0, 0, W, H).data : null;
  } catch {
    baseline = null;
  }
  let lastX = 0, lastY = 0;
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };

  const toLocal = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / (r.width || W)) * W, ((e.clientY - r.top) / (r.height || H)) * H];
  };
  let activePointer = -1; // un solo dedo dibuja a la vez (un segundo dedo no rompe el trazo)
  canvas.addEventListener('pointerdown', (e) => {
    if (!g || (drawing && e.pointerId !== activePointer)) return;
    drawing = true;
    activePointer = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* nada */
    }
    const [x, y] = toLocal(e);
    // Goma: pinta de blanco con un trazo más grueso. No cuenta como trazo ni como color.
    const ink = erasing ? '#ffffff' : color;
    g.strokeStyle = ink;
    g.fillStyle = ink;
    g.lineWidth = erasing ? 24 : ctx.ageBand === 'young' ? 10 : 7;
    // Un toque sin arrastrar también deja un punto.
    g.beginPath();
    g.arc(x, y, g.lineWidth / 2, 0, Math.PI * 2);
    g.fill();
    lastX = x; lastY = y;
    if (erasing) {
      erases++;
    } else {
      grow(x, y);
      strokes++;
      colorsUsed.add(color);
      if (!firstDraw) firstDraw = now();
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || !g || e.pointerId !== activePointer) return;
    const [x, y] = toLocal(e);
    // Solo el tramo nuevo: repintar todo el trazo en cada movimiento va muy lento en móviles sencillos.
    g.beginPath();
    g.moveTo(lastX, lastY);
    g.lineTo(x, y);
    g.stroke();
    lastX = x; lastY = y;
    if (!erasing) {
      grow(x, y);
      lastDraw = now();
    }
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId === activePointer) drawing = false;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);

  const select = (b: HTMLButtonElement) => {
    palette.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
    b.classList.add('active');
    ctx.sfx('tap');
  };
  const eraser = h('button', { class: 'swatch eraser', type: 'button', 'data-tool': 'eraser', 'aria-label': tr({ es: 'Goma de borrar', en: 'Eraser', fr: 'Gomme' }), title: tr({ es: 'Goma de borrar', en: 'Eraser', fr: 'Gomme' }) });
  eraser.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#263238" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5l4 4-10 10H6.5l-3-3z" fill="#F8BBD0"/><path d="M11 8l5 5" /><path d="M10 20.5h10"/></svg>';
  eraser.onclick = () => { erasing = true; select(eraser); };
  const palette = h('div', { class: 'palette' }, ...PALETTE.map((c, i) => {
    const b = h('button', { class: 'swatch' + (i === 0 ? ' active' : ''), type: 'button', style: { background: c }, 'aria-label': tr({ es: 'color', en: 'colour', fr: 'couleur' }) });
    b.onclick = () => {
      color = c;
      erasing = false;
      select(b);
    };
    return b;
  }), eraser);
  const done = doneButton();
  render(ctx,
    instruction(ctx, 'garabato', tr({ es: '¿Qué puede ser esta raya? ¡Termina el dibujo como tú quieras! Usa muchos colores.', en: 'What could this line be? Finish the drawing however you like! Use lots of colours.', fr: 'Que pourrait être ce trait ? Termine le dessin comme tu veux ! Utilise plein de couleurs.' })),
    h('div', { class: 'doodle-wrap' }, canvas), palette, h('div', { class: 'row-center' }, done));

  try {
    await waitFor<void>(ctx, (finish) => {
      done.onclick = () => finish();
    }, 240000, () => undefined);
  } catch (e) {
    if (!isAbort(e)) throw e;
    return abandonedOutcome('garabato', ctx.level, start, [], { strokes });
  }

  // Medir superficie dibujada (muestreo de píxeles no blancos).
  let coverage = 0;
  try {
    if (g) {
      coverage = drawnCoverage(baseline, g.getImageData(0, 0, W, H).data);
    }
  } catch {
    coverage = Math.min(0.2, strokes * 0.01);
  }
  // ¿Sale del área del garabato? (60..300 x 40..220 aprox.)
  const extension = strokes === 0 ? 0 : Math.min(1, ((minX < 50 ? 1 : 0) + (maxX > 300 ? 1 : 0) + (minY < 40 ? 1 : 0) + (maxY > 220 ? 1 : 0)) / 2);
  const stats: DoodleStats = { strokes, colors: colorsUsed.size, coverage, extension, drawMs: lastDraw && firstDraw ? lastDraw - firstDraw : 0 };

  let thumb = '';
  try {
    const t = document.createElement('canvas');
    t.width = 180; t.height = 140;
    t.getContext('2d')?.drawImage(canvas, 0, 0, 180, 140);
    thumb = t.toDataURL('image/jpeg', 0.6);
  } catch {
    thumb = '';
  }

  // ¿Qué es? El niño lo DICE con el micrófono (el docente lo escucha) o toca una categoría general.
  const evidence: Evidence[] = [];
  let voiceSaid = false;
  const cats = DOODLE_CATEGORIES;
  const labelGrid = h('div', { class: 'choice-grid cols-3 doodle-cats' }, ...cats.map((c) =>
    h('button', { class: 'choice-btn', type: 'button', 'data-label': c.id, 'aria-label': tr(c.name) },
      h('span', { class: 'cat-emoji', 'aria-hidden': 'true' }, c.emoji), h('span', { class: 'tile-label' }, tr(c.name)))));
  let micBtn: HTMLButtonElement | null = null;
  let rec: ReturnType<typeof startRecording> | null = null;
  let recording: Promise<void> | null = null;
  const saidBtn = doneButton();
  saidBtn.hidden = true;
  if (canRecord() && !ctx.fast) {
    micBtn = h('button', { class: 'mic-btn', type: 'button', 'aria-label': tr({ es: 'Decir qué es', en: 'Say what it is', fr: 'Dire ce que c’est' }) },
      ic('mic', 36), h('span', { class: 'btn-label' }, tr({ es: 'Decirlo', en: 'Say it', fr: 'Le dire' })));
    micBtn.onclick = () => {
      if (rec) { rec.stop(); return; }
      micBtn!.classList.add('recording');
      const current = startRecording(8000);
      rec = current;
      recording = (async () => {
        const r = await current.result;
        rec = null;
        recording = null;
        micBtn?.classList.remove('recording');
        if (r && !ctx.exitSignal.aborted) {
          voiceSaid = true;
          evidence.push({ kind: 'audio', ref: r.key, label: tr({ es: 'Garabato · lo que dice que ha dibujado', en: 'Doodle · what they say they drew', fr: 'Gribouillis · ce qu’il dit avoir dessiné' }), date: Date.now() });
          saidBtn.hidden = false;
          ctx.sfx('ok');
        }
      })();
    };
  }
  const stopMic = async (keep: boolean) => {
    const pending = recording;
    rec?.stop();
    if (keep && pending) await pending;
  };
  render(ctx,
    instruction(ctx, '🤔', micBtn
      ? tr({ es: '¿Qué es tu dibujo? Dímelo con el micrófono o toca lo que más se parece.', en: 'What is your drawing? Tell me with the microphone or tap what looks most like it.', fr: 'Qu’est-ce que c’est, ton dessin ? Dis-le avec le micro ou touche ce qui y ressemble le plus.' })
      : tr({ es: '¿Qué es tu dibujo? Toca lo que más se parece.', en: 'What is your drawing? Tap what looks most like it.', fr: 'Qu’est-ce que c’est, ton dessin ? Touche ce qui y ressemble le plus.' })),
    thumb ? h('img', { class: 'doodle-thumb', src: thumb, alt: tr({ es: 'Tu dibujo', en: 'Your drawing', fr: 'Ton dessin' }) }) : null,
    micBtn ? h('div', { class: 'row-center' }, micBtn, saidBtn) : null,
    labelGrid);
  let label = '';
  try {
    label = await waitFor<string>(ctx, (finish) => {
      labelGrid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.onclick = () => {
        const c = cats.find((x) => x.id === b.dataset.label);
        if (c) void ctx.say(tr(c.name));
        finish(b.dataset.label!);
      }));
      saidBtn.onclick = () => finish('');
    }, 60000, () => '');
    await stopMic(true);
  } catch (e) {
    if (!isAbort(e)) throw e;
    void stopMic(false);
  }
  const cat = cats.find((c) => c.id === label);
  const squiggleId = 'garabato_' + SQUIGGLES.indexOf(squiggle);
  const store = loadIdeaFreq()[`${ctx.student.regionId}:${squiggleId}`];
  const freq = label ? ((store?.counts['g_' + label] ?? 0) + 1) / ((store?.players ?? 0) + 6) : 0.5;
  // Si solo lo dijo con la voz, la originalidad se estima (el docente puede escucharlo).
  const originality = label ? Math.max(0, Math.min(1, 1 - freq * 1.6)) : voiceSaid ? 0.55 : 0.4;
  const elaboration = elaborationScore(stats, ctx.ageBand === 'young');

  if (thumb) evidence.unshift({ kind: 'dibujo', ref: thumb, label: cat ? `${tr(garabatoGame.name)} · ${cat.emoji} ${tr(cat.name)}` : tr(garabatoGame.name), date: Date.now() });
  ctx.sfx('win');
  return {
    gameId: 'garabato',
    level: ctx.level,
    abandoned: false,
    success: null,
    personalMetric: Math.round(elaboration * 100),
    observations: [
      obs('elaboracion', elaboration, strokes === 0 ? 0.5 : 1),
      obs('originalidad', originality, label ? 0.5 : voiceSaid ? 0.3 : 0.2),
    ],
    metrics: { strokes, erases, colors: colorsUsed.size, coverage: Math.round(coverage * 100) / 100, extension, elaboration, originality, saidByVoice: voiceSaid ? 1 : 0 },
    tags: { ideaIds: label ? ['g_' + label] : [], promptId: squiggleId },
    evidence,
    durationMs: now() - start,
  };
}

export const garabatoGame: GameDef = {
  id: 'garabato',
  name: { es: 'Garabato', en: 'Doodle', fr: 'Gribouillis' },
  icon: '✏️',
  phase: 3,
  kind: 'abierta',
  dims: ['elaboracion', 'originalidad'],
  predict: 'none',
  teacherInfo: {
    es: 'Completar un dibujo a partir de una raya y decir qué es (por voz, que el docente puede escuchar, o eligiendo una categoría general: animal, persona, cielo, playa…). Mide elaboración (trazos, colores, superficie) y originalidad de lo que dice haber dibujado.',
    en: 'Finish a drawing that starts from a line and say what it is (by voice, which the teacher can listen to, or by choosing a general category: animal, person, sky, beach…). Measures elaboration (strokes, colours, area) and originality of what they say they drew.',
    fr: 'Terminer un dessin à partir d’un trait et dire ce que c’est (à voix haute, que l’enseignant peut écouter, ou en choisissant une catégorie générale : animal, personne, ciel, plage…). Mesure l’élaboration (traits, couleurs, surface) et l’originalité de ce qu’il dit avoir dessiné.',
  },
  play,
};
