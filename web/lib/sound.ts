/**
 * Tiny Web Audio sound kit — no audio files, all synthesised. Used by the games
 * for spin ticks, a settle "ding" and a win fanfare. Muteable + persisted.
 */
const MUTE_KEY = "f1slam:muted";

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}
export function setMuted(m: boolean) {
  if (typeof window !== "undefined") localStorage.setItem(MUTE_KEY, m ? "1" : "0");
}

function blip(freq: number, dur = 0.08, type: OscillatorType = "square", gain = 0.06, when = 0) {
  const a = ac();
  if (!a || isMuted()) return;
  if (a.state === "suspended") a.resume().catch(() => {});
  const t = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A single reel tick (call repeatedly while spinning). */
export function tick() {
  blip(420 + Math.random() * 180, 0.04, "square", 0.04);
}

/** A short rising "reel stop" / settle sound. */
export function settle() {
  blip(523, 0.09, "triangle", 0.06, 0);
  blip(784, 0.12, "triangle", 0.06, 0.06);
}

/** A little win fanfare. */
export function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, "triangle", 0.07, i * 0.1));
}

/** A soft confirm tap (selecting an option). */
export function tap() {
  blip(660, 0.05, "sine", 0.05);
}
