// Pause-Timer zwischen den Sätzen. Läuft über eine feste Endzeit, damit er Seitenwechsel
// und Neuladen übersteht. Am Ende: Ton + Vibration (sofern das Gerät es unterstützt).

const STATE_KEY = 'gym-tracker-rest';
const SETTINGS_KEY = 'gym-tracker-settings';
export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nur Komfort */
  }
}

export function getDefaultRest() {
  const s = read(SETTINGS_KEY);
  return Number.isInteger(s?.restSeconds) ? s.restSeconds : 90;
}
export function setDefaultRest(seconds) {
  write(SETTINGS_KEY, { ...(read(SETTINGS_KEY) || {}), restSeconds: seconds });
}

export const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let state = read(STATE_KEY); // { endAt, total }
let tick = null;
let audio = null;
let el = null;

function beep() {
  try {
    if (!audio) return;
    const now = audio.currentTime;
    [0, 0.25, 0.5].forEach((t) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
  } catch {
    /* kein Ton möglich */
  }
}

function render() {
  if (!el) return;
  if (!state) {
    el.hidden = true;
    document.body.classList.remove('has-timer');
    return;
  }
  const left = (state.endAt - Date.now()) / 1000;
  if (left <= 0) {
    stop();
    beep();
    navigator.vibrate?.([200, 100, 200]);
    return;
  }
  el.hidden = false;
  document.body.classList.add('has-timer');
  el.querySelector('.rest-time').textContent = fmtDuration(Math.ceil(left));
  el.querySelector('.rest-bar span').style.width = `${Math.min(100, (left / state.total) * 100)}%`;
}

function loop() {
  clearInterval(tick);
  if (state) tick = setInterval(render, 250);
  render();
}

export function startRest(seconds) {
  // AudioContext muss in einer Nutzeraktion entstehen (Klick auf ✓), sonst bleibt er stumm.
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume?.();
  } catch {
    audio = null;
  }
  state = { endAt: Date.now() + seconds * 1000, total: seconds };
  write(STATE_KEY, state);
  loop();
}

export function stop() {
  state = null;
  write(STATE_KEY, null);
  clearInterval(tick);
  render();
}

function adjust(delta) {
  if (!state) return;
  state.endAt += delta * 1000;
  state.total = Math.max(state.total + delta, 1);
  write(STATE_KEY, state);
  render();
}

export function initTimer(element) {
  el = element;
  el.querySelector('[data-rest="minus"]').onclick = () => adjust(-15);
  el.querySelector('[data-rest="plus"]').onclick = () => adjust(15);
  el.querySelector('[data-rest="skip"]').onclick = stop;
  if (state && state.endAt <= Date.now()) {
    state = null;
    write(STATE_KEY, null);
  }
  loop();
}
