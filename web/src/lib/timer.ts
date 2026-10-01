// Pause-Timer zwischen den Sätzen. Läuft über eine feste Endzeit, damit er Seitenwechsel
// und Neuladen übersteht. Am Ende: Ton + Vibration (sofern das Gerät es unterstützt).
// Kleiner Store mit subscribe(), damit React-Komponenten mitbekommen, wenn er startet/endet.

const STATE_KEY = 'gym-tracker-rest';
const SETTINGS_KEY = 'gym-tracker-settings';
export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export interface RestState { endAt: number; total: number }

function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nur Komfort */
  }
}

export function getDefaultRest(): number {
  const s = read<{ restSeconds?: number }>(SETTINGS_KEY);
  return Number.isInteger(s?.restSeconds) ? s!.restSeconds! : 90;
}
export function setDefaultRest(seconds: number) {
  write(SETTINGS_KEY, { ...(read<object>(SETTINGS_KEY) || {}), restSeconds: seconds });
}

let state: RestState | null = read<RestState>(STATE_KEY);
if (state && state.endAt <= Date.now()) {
  state = null;
  write(STATE_KEY, null);
}
let audio: AudioContext | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getRest = () => state;
export function subscribeRest(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

function beep() {
  try {
    if (!audio) return;
    const now = audio.currentTime;
    [0, 0.25, 0.5].forEach((t) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
  } catch {
    /* kein Ton möglich */
  }
}

/** Vom Timer-Anzeigeelement regelmäßig aufgerufen: beendet abgelaufene Pausen mit Signal. */
export function checkRestFinished() {
  if (state && state.endAt <= Date.now()) {
    stopRest();
    beep();
    navigator.vibrate?.([200, 100, 200]);
  }
}

export function startRest(seconds: number) {
  // AudioContext muss in einer Nutzeraktion entstehen (Klick auf ✓), sonst bleibt er stumm.
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new Ctx();
    audio.resume?.();
  } catch {
    audio = null;
  }
  state = { endAt: Date.now() + seconds * 1000, total: seconds };
  write(STATE_KEY, state);
  emit();
}

export function stopRest() {
  state = null;
  write(STATE_KEY, null);
  emit();
}

export function adjustRest(delta: number) {
  if (!state) return;
  state = { endAt: state.endAt + delta * 1000, total: Math.max(state.total + delta, 1) };
  write(STATE_KEY, state);
  emit();
}
