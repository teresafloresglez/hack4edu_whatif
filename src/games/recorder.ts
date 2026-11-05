import { saveAudio, uid } from '../core/storage';

// Grabación de voz para que los niños que no escriben puedan dar sus
// propias ideas. Funciona sin conexión (MediaRecorder); si el dispositivo
// no lo permite, el botón simplemente no aparece.

export function canRecord(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;
}

export interface Recording { key: string; ms: number }

/** Graba hasta `maxMs` o hasta que se llame a stop(). Devuelve la clave en IndexedDB. */
export function startRecording(maxMs = 8000): { stop: () => void; result: Promise<Recording | null> } {
  let stopRequested = false;
  // Si se para mientras el navegador aún pide permiso (el niño no contesta al aviso),
  // el resultado es «nada» al momento: ✅ y 🏠 no pueden quedarse esperando para siempre.
  let stopEarly: (v: null) => void = () => {};
  const stoppedEarly = new Promise<null>((r) => (stopEarly = r));
  let stopFn = () => {
    stopRequested = true; // aún esperando el permiso del micrófono
    stopEarly(null);
  };
  const recorded = (async (): Promise<Recording | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stopRequested) {
        stream.getTracks().forEach((t) => t.stop());
        return null;
      }
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const t0 = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((r) => (rec.onstop = () => r()));
      rec.start();
      const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
      stopFn = () => rec.state !== 'inactive' && rec.stop();
      await done;
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      const ms = Date.now() - t0;
      if (ms < 600 || chunks.length === 0) return null;
      const key = 'idea-' + uid();
      await saveAudio(key, new Blob(chunks, { type: chunks[0].type || 'audio/webm' }));
      return { key, ms };
    } catch {
      return null;
    }
  })();
  return { stop: () => stopFn(), result: Promise.race([recorded, stoppedEarly]) };
}
