import { createBackend } from './api.js';
import { todayISO, weeklySummary, exerciseProgress, personalRecords, setVolume } from './stats.js';
import { MUSCLES, MUSCLE_NAMES, LEVELS, musclesOf, strengthLevels, bodySvg } from './muscles.js';
import { REST_OPTIONS, getDefaultRest, setDefaultRest, fmtDuration, startRest, stop as stopRest, initTimer } from './timer.js';
import { STARTER_TEMPLATES } from './starter-templates.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const DRAFT_KEY = 'gym-tracker-draft';
const APP_VERSION = '2026-09-25 · 3 (Workouts, Pause-Timer, Körpergraph)';

let api = null; // Speicher-Backend: lokal (Browser) oder Cloud (Supabase)
let user = null;
let exercises = []; // [{ id, name, type, user_id }]
let charts = [];
let viewCleanup = null; // räumt z. B. Intervalle der aktuellen Ansicht auf

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmt = (n, digits = 1) =>
  Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: digits });

function fmtDate(iso, withWeekday = true) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('de-DE', {
    timeZone: 'UTC',
    weekday: withWeekday ? 'short' : undefined,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtShortDate = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

// Akzeptiert "62,5" und "62.5". Leer -> null.
function parseNum(v) {
  const s = String(v ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

const exerciseById = (id) => exercises.find((e) => e.id === Number(id));
const exerciseMap = () => new Map(exercises.map((e) => [e.id, e]));

function showError(err) {
  console.error(err);
  const msg = err?.message || String(err);
  const box = document.getElementById('toast');
  box.textContent = `Fehler: ${msg}`;
  box.hidden = false;
  clearTimeout(showError.t);
  showError.t = setTimeout(() => (box.hidden = true), 6000);
}

function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Einheitliche Chart.js-Optik: dünne Linien, dezentes Raster, Tooltip beim Hover.
function makeChart(canvas, type, labels, datasets, unit, { integer = false } = {}) {
  const text = cssVar('--text-secondary');
  const grid = cssVar('--grid');
  const surface = cssVar('--surface');
  const chart = new window.Chart(canvas, {
    type,
    data: {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color,
        borderWidth: 2,
        pointRadius: type === 'line' ? 4 : 0,
        pointHoverRadius: 6,
        pointBorderColor: surface,
        pointBorderWidth: 2,
        borderRadius: type === 'bar' ? 4 : 0,
        maxBarThickness: 28,
        tension: 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, labels: { color: text, boxWidth: 12, boxHeight: 12 } },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)} ${unit}` },
        },
      },
      scales: {
        x: { ticks: { color: text, maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false }, border: { color: grid } },
        y: {
          beginAtZero: type === 'bar',
          ticks: { color: text, callback: (v) => fmt(v), ...(integer ? { precision: 0 } : {}) },
          grid: { color: grid },
          border: { display: false },
          title: { display: true, text: unit, color: text },
        },
      },
    },
  });
  charts.push(chart);
  return chart;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const routes = [
  [/^#?\/?$/, renderDashboard],
  [/^#\/neu$/, () => renderEditor('live')],
  [/^#\/workouts$/, renderWorkouts],
  [/^#\/start\/(\d+)$/, (m) => startFromTemplate(Number(m[1]))],
  [/^#\/vorlage\/neu$/, () => renderEditor('template')],
  [/^#\/vorlage\/(\d+)$/, (m) => renderEditor('template', Number(m[1]))],
  [/^#\/training\/(\d+)$/, (m) => renderWorkoutDetail(Number(m[1]))],
  [/^#\/training\/(\d+)\/bearbeiten$/, (m) => renderEditor('edit', Number(m[1]))],
  [/^#\/verlauf$/, renderHistory],
  [/^#\/fortschritt$/, renderProgress],
  [/^#\/koerper$/, renderBody],
  [/^#\/gewicht$/, () => void (location.hash = '#/koerper')],
  [/^#\/backup$/, renderBackup],
];

async function route() {
  destroyCharts();
  viewCleanup?.();
  viewCleanup = null;
  // Ansicht-spezifische Handler zurücksetzen
  view.oninput = view.onclick = view.onchange = view.onsubmit = null;
  document.getElementById('logout').hidden = !user;
  if (!user) return renderAuth();

  const hash = location.hash || '#/';
  nav.hidden = false;
  nav.querySelectorAll('a').forEach((a) => {
    const target = a.getAttribute('href');
    const section = /^#\/(neu|vorlage|start)/.test(hash) ? '#/workouts' : hash;
    a.classList.toggle('active', target === '#/' ? section === '#/' || section === '' : section.startsWith(target));
  });

  for (const [re, handler] of routes) {
    const m = hash.match(re);
    if (m) {
      view.innerHTML = '<p class="muted center">Lädt …</p>';
      try {
        await handler(m);
      } catch (err) {
        view.innerHTML = `<div class="card"><p>Konnte die Daten nicht laden.</p><p class="muted">${esc(err.message)}</p></div>`;
        console.error(err);
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = '#/';
}

// ---------------------------------------------------------------------------
// Einrichtung & Login
// ---------------------------------------------------------------------------
function renderStartError(err) {
  nav.hidden = true;
  view.innerHTML = `
    <div class="card">
      <h2>App konnte nicht starten</h2>
      <p class="muted">${esc(err?.message || err)}</p>
      <p>${api?.mode === 'cloud' || !api
        ? 'Prüfe deine Internetverbindung und die Supabase-Zugangsdaten und lade die Seite neu.'
        : 'Der Browser erlaubt keinen lokalen Speicher (z.&nbsp;B. im privaten Modus). Öffne die Seite in einem normalen Fenster.'}</p>
    </div>`;
}

function renderAuth() {
  nav.hidden = true;
  let mode = 'login';
  const draw = (message = '') => {
    view.innerHTML = `
      <div class="card auth">
        <h2>${mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</h2>
        <form id="auth-form">
          <label>E-Mail<input type="email" name="email" autocomplete="email" required></label>
          <label>Passwort<input type="password" name="password" minlength="6" required
            autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></label>
          <button class="btn primary block" type="submit">${mode === 'login' ? 'Anmelden' : 'Registrieren'}</button>
        </form>
        ${message ? `<p class="notice">${esc(message)}</p>` : ''}
        <p class="center">
          <button class="link" id="toggle-mode" type="button">
            ${mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
          </button>
        </p>
      </div>`;
    view.querySelector('#toggle-mode').onclick = () => {
      mode = mode === 'login' ? 'signup' : 'login';
      draw();
    };
    view.querySelector('#auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        if (mode === 'login') {
          await api.signIn(f.get('email'), f.get('password'));
        } else {
          const data = await api.signUp(f.get('email'), f.get('password'));
          if (!data.session) {
            mode = 'login';
            draw('Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in der Mail und melde dich dann an.');
          }
        }
      } catch (err) {
        btn.disabled = false;
        showError(err);
      }
    };
  };
  draw();
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
async function renderDashboard() {
  const [workouts, sets, weights] = await Promise.all([api.listWorkouts(), api.listSets(), api.listBodyWeights()]);
  const weeks = weeklySummary(workouts, sets, todayISO(), 8);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeight = weights[weights.length - 1];

  view.innerHTML = `
    ${api.mode === 'local'
      ? `<p class="notice small">Lokaler Modus: Deine Daten liegen nur in diesem Browser.
         Sichere sie regelmäßig über <a href="#/backup">Backup</a>.</p>`
      : ''}
    <a class="btn primary block big" href="#/workouts">Workout starten</a>
    <h2>Diese Woche</h2>
    <div class="tiles">
      <div class="tile"><span class="tile-value">${thisWeek.workouts}</span><span class="tile-label">Trainings</span></div>
      <div class="tile"><span class="tile-value">${fmt(thisWeek.volume, 0)}</span><span class="tile-label">kg Volumen</span></div>
      <div class="tile"><span class="tile-value">${fmt(thisWeek.cardioMin, 0)}</span><span class="tile-label">Min. Cardio</span></div>
      <div class="tile"><span class="tile-value">${lastWeight ? fmt(lastWeight.weight_kg) : '–'}</span>
        <span class="tile-label">kg Körpergewicht${lastWeight ? ` (${fmtShortDate(lastWeight.date)})` : ''}</span></div>
    </div>
    <div class="card">
      <h3>Trainings pro Woche</h3>
      <div class="chart"><canvas id="c-count" aria-label="Trainings pro Woche"></canvas></div>
    </div>
    <div class="card">
      <h3>Volumen pro Woche</h3>
      <p class="muted small">Summe aus Wiederholungen × Gewicht aller Kraftsätze</p>
      <div class="chart"><canvas id="c-volume" aria-label="Volumen pro Woche"></canvas></div>
    </div>
    <h2>Letzte Trainings</h2>
    ${workoutList(workouts.slice(0, 3), sets) || '<p class="muted">Noch keine Trainings erfasst.</p>'}
    <p class="muted small center">App-Version ${esc(APP_VERSION)}</p>
  `;
  const labels = weeks.map((w) => fmtShortDate(w.start));
  makeChart(view.querySelector('#c-count'), 'bar', labels, [
    { label: 'Trainings', data: weeks.map((w) => w.workouts), color: cssVar('--series-1') },
  ], 'Trainings', { integer: true });
  makeChart(view.querySelector('#c-volume'), 'bar', labels, [
    { label: 'Volumen', data: weeks.map((w) => Math.round(w.volume)), color: cssVar('--series-1') },
  ], 'kg');
}

function workoutList(workouts, sets) {
  if (!workouts.length) return '';
  const byWorkout = new Map();
  for (const s of sets) {
    if (!byWorkout.has(s.workout_id)) byWorkout.set(s.workout_id, []);
    byWorkout.get(s.workout_id).push(s);
  }
  return `<ul class="list">${workouts
    .map((w) => {
      const ws = byWorkout.get(w.id) || [];
      const names = [...new Set(ws.map((s) => exerciseById(s.exercise_id)?.name).filter(Boolean))];
      const volume = ws.reduce((sum, s) => sum + setVolume(s), 0);
      return `<li><a href="#/training/${w.id}">
        <strong>${fmtDate(w.date)}</strong>
        <span class="muted small">${ws.length} ${ws.length === 1 ? 'Satz' : 'Sätze'}${volume ? ` · ${fmt(volume, 0)} kg Volumen` : ''}</span>
        <span class="small">${esc(names.join(', ')) || '<span class="muted">Keine Übungen</span>'}</span>
      </a></li>`;
    })
    .join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// Verlauf & Detail
// ---------------------------------------------------------------------------
async function renderHistory() {
  const [workouts, sets] = await Promise.all([api.listWorkouts(), api.listSets()]);
  view.innerHTML = `<h2>Verlauf</h2>${workoutList(workouts, sets) || '<p class="muted">Noch keine Trainings erfasst.</p>'}`;
}

async function renderWorkoutDetail(id) {
  const w = await api.getWorkout(id);
  const groups = groupSets(w.sets);
  view.innerHTML = `
    <p><a href="#/verlauf" class="link">← Verlauf</a></p>
    <h2>${fmtDate(w.date)}</h2>
    ${w.notes ? `<div class="card notes">${esc(w.notes)}</div>` : ''}
    ${groups
      .map(({ exercise, sets }) => {
        const ex = exerciseById(exercise);
        const cardio = ex?.type === 'cardio';
        return `<div class="card">
          <h3>${esc(ex?.name ?? 'Unbekannte Übung')}</h3>
          <table class="table">
            <thead><tr><th>#</th>${cardio ? '<th>Dauer</th><th>Distanz</th>' : '<th>Wdh.</th><th>Gewicht</th>'}</tr></thead>
            <tbody>${numberSets(sets)
              .map(
                ([s, label]) => `<tr><td class="${label === 'A' ? 'warmup-label' : ''}">${label}</td>${
                  cardio
                    ? `<td>${s.duration_min != null ? `${fmt(s.duration_min)} min` : '–'}</td><td>${s.distance_km != null ? `${fmt(s.distance_km, 2)} km` : '–'}</td>`
                    : `<td>${s.reps ?? '–'}</td><td>${s.weight_kg != null ? `${fmt(s.weight_kg, 2)} kg` : '–'}</td>`
                }</tr>`
              )
              .join('')}</tbody>
          </table>
        </div>`;
      })
      .join('') || '<p class="muted">Keine Sätze gespeichert.</p>'}
    <div class="row">
      <a class="btn" href="#/training/${id}/bearbeiten">Bearbeiten</a>
      <button class="btn danger" id="delete">Löschen</button>
    </div>`;
  view.querySelector('#delete').onclick = async () => {
    if (!confirm('Dieses Training wirklich löschen?')) return;
    try {
      await api.deleteWorkout(id);
      location.hash = '#/verlauf';
    } catch (err) {
      showError(err);
    }
  };
}

// Satznummern: Aufwärmsätze heißen "A", Arbeitssätze werden durchgezählt.
function numberSets(sets) {
  let n = 0;
  return sets.map((s) => [s, s.is_warmup ? 'A' : String(++n)]);
}

// Aufeinanderfolgende Sätze derselben Übung zu Blöcken zusammenfassen.
function groupSets(sets) {
  const groups = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.exercise === s.exercise_id) last.sets.push(s);
    else groups.push({ exercise: s.exercise_id, sets: [s] });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Editor für Live-Workout, Training bearbeiten und Vorlagen
// ---------------------------------------------------------------------------
const emptySet = (type, warmup = false) =>
  type === 'cardio' ? { duration_min: '', distance_km: '' } : { warmup, reps: '', weight_kg: '' };
const toInput = (v) => (v == null ? '' : String(v).replace('.', ','));

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
    return d && Array.isArray(d.blocks) ? { mode: 'live', started_at: Date.now(), ...d } : null;
  } catch {
    return null;
  }
}
function saveDraft(state) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    /* Entwurf ist nur Komfort */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignorieren */
  }
}

// Letzte Ausführung jeder Übung: Sätze aus dem neuesten Training, das sie enthält.
function lastPerformance(workouts, sets, excludeWorkoutId) {
  const rank = new Map(workouts.map((w, i) => [w.id, i])); // workouts sind neueste zuerst
  const latest = new Map();
  for (const s of sets) {
    const r = rank.get(s.workout_id);
    if (r == null || s.workout_id === excludeWorkoutId) continue;
    const cur = latest.get(s.exercise_id);
    if (!cur || r < cur.rank) latest.set(s.exercise_id, { rank: r, workout_id: s.workout_id });
  }
  const result = new Map();
  for (const [exId, { workout_id }] of latest) {
    result.set(
      exId,
      sets.filter((s) => s.workout_id === workout_id && s.exercise_id === exId).sort((a, b) => a.position - b.position)
    );
  }
  return result;
}

// Passender Vorher-Satz: n-ter Aufwärmsatz ↔ n-ter Aufwärmsatz, n-ter Arbeitssatz ↔ n-ter Arbeitssatz.
function previousFor(prevSets, block, si) {
  if (!prevSets) return null;
  const warm = Boolean(block.sets[si].warmup);
  const idx = block.sets.slice(0, si).filter((r) => Boolean(r.warmup) === warm).length;
  return prevSets.filter((p) => Boolean(p.is_warmup) === warm)[idx] || null;
}

function stateFromTemplate(t) {
  return {
    mode: 'live',
    id: null,
    template_id: t.id,
    name: t.name,
    date: todayISO(),
    notes: '',
    started_at: Date.now(),
    blocks: t.exercises
      .filter((e) => exerciseById(e.exercise_id))
      .map((e) => {
        const type = exerciseById(e.exercise_id).type;
        return {
          exercise_id: e.exercise_id,
          rest_seconds: e.rest_seconds ?? null,
          sets: e.sets.map((s) => ({
            ...emptySet(type, Boolean(s.warmup)),
            target:
              type === 'cardio'
                ? { duration_min: s.duration_min ?? null, distance_km: s.distance_km ?? null }
                : { reps: s.reps ?? null, weight_kg: s.weight_kg ?? null },
            done: false,
          })),
        };
      }),
  };
}

function templateBlocks(t) {
  return t.exercises
    .filter((e) => exerciseById(e.exercise_id))
    .map((e) => {
      const type = exerciseById(e.exercise_id).type;
      return {
        exercise_id: e.exercise_id,
        rest_seconds: e.rest_seconds ?? null,
        sets: e.sets.map((s) =>
          type === 'cardio'
            ? { duration_min: toInput(s.duration_min), distance_km: toInput(s.distance_km) }
            : { warmup: Boolean(s.warmup), reps: toInput(s.reps), weight_kg: toInput(s.weight_kg) }
        ),
      };
    });
}

// Liest einen Satz aus den Eingaben. Liefert null (leer), ein Objekt oder wirft bei ungültigen Werten.
function parseRow(row, cardio) {
  if (cardio) {
    const duration_min = parseNum(row.duration_min);
    const distance_km = parseNum(row.distance_km);
    if (Number.isNaN(duration_min) || Number.isNaN(distance_km)) throw new Error('Bitte nur Zahlen eingeben.');
    if (duration_min == null && distance_km == null) return null;
    return { duration_min, distance_km };
  }
  const reps = parseNum(row.reps);
  const weight_kg = parseNum(row.weight_kg);
  if (Number.isNaN(reps) || Number.isNaN(weight_kg)) throw new Error('Bitte nur Zahlen eingeben.');
  if (reps == null && weight_kg == null) return null;
  if (!reps || !Number.isInteger(reps)) throw new Error('Jeder Kraftsatz braucht eine ganze Zahl an Wiederholungen.');
  return { reps, weight_kg: weight_kg ?? 0, is_warmup: Boolean(row.warmup) };
}

function restOptions(selected) {
  const std = getDefaultRest();
  return `<option value="">Standard (${fmtDuration(std)})</option>${REST_OPTIONS.map(
    (s) => `<option value="${s}" ${s === selected ? 'selected' : ''}>${fmtDuration(s)}</option>`
  ).join('')}`;
}

function muscleChips(name, selected = []) {
  return `<fieldset class="chips"><legend class="small muted">Hauptmuskeln (für den Körpergraphen)</legend>${MUSCLES.map(
    ([id, label]) =>
      `<label class="chip"><input type="checkbox" name="${name}" value="${id}" ${selected.includes(id) ? 'checked' : ''}>${esc(label)}</label>`
  ).join('')}</fieldset>`;
}

// mode: 'live' (Training durchführen), 'edit' (gespeichertes Training ändern), 'template' (Vorlage)
async function renderEditor(mode, id = null) {
  let state;
  let prev = new Map();
  if (mode === 'edit') {
    const w = await api.getWorkout(id);
    state = {
      mode, id, date: w.date, notes: w.notes ?? '',
      blocks: groupSets(w.sets).map((g) => ({
        exercise_id: g.exercise,
        sets: g.sets.map((s) =>
          exerciseById(g.exercise)?.type === 'cardio'
            ? { duration_min: toInput(s.duration_min), distance_km: toInput(s.distance_km) }
            : { warmup: Boolean(s.is_warmup), reps: toInput(s.reps), weight_kg: toInput(s.weight_kg) }
        ),
      })),
    };
  } else if (mode === 'template') {
    const t = id ? await api.getTemplate(id) : { id: null, name: '', exercises: [] };
    state = { mode, id: t.id, name: t.name, blocks: templateBlocks(t) };
  } else {
    const [workouts, sets] = await Promise.all([api.listWorkouts(), api.listSets()]);
    prev = lastPerformance(workouts, sets, null);
    state = loadDraft() || { mode, id: null, template_id: null, name: '', date: todayISO(), notes: '', started_at: Date.now(), blocks: [] };
    state.blocks = state.blocks.filter((b) => exerciseById(b.exercise_id));
  }
  const live = mode === 'live';
  const persist = () => live && saveDraft(state);
  persist();

  const exerciseOptions = () => {
    const opts = (type) =>
      exercises
        .filter((e) => e.type === type)
        .map((e) => `<option value="${e.id}">${esc(e.name)}${e.user_id ? ' ★' : ''}</option>`)
        .join('');
    return `<option value="">Übung wählen …</option>
      <optgroup label="Kraft">${opts('strength')}</optgroup>
      <optgroup label="Cardio">${opts('cardio')}</optgroup>
      <option value="new">+ Eigene Übung anlegen …</option>`;
  };

  const title = { live: state.name || 'Training', edit: 'Training bearbeiten', template: state.id ? 'Vorlage bearbeiten' : 'Neue Vorlage' }[mode];

  const draw = () => {
    view.innerHTML = `
      <div class="editor-head">
        <h2>${esc(title)}</h2>
        ${live ? `<span class="muted" id="elapsed" aria-label="Trainingsdauer"></span>` : ''}
      </div>
      ${mode === 'template' ? `<div class="card"><label>Name der Vorlage<input id="t-name" maxlength="80" value="${esc(state.name)}" placeholder="z. B. Push" required></label></div>` : ''}
      ${mode === 'edit' ? `<div class="card"><label>Datum<input type="date" id="w-date" value="${esc(state.date)}" required></label></div>` : ''}
      ${state.blocks.map(blockHtml).join('')}
      <div class="card">
        <label>Übung hinzufügen<select id="add-exercise">${exerciseOptions()}</select></label>
        <form id="new-exercise" class="inline-form" hidden>
          <input type="text" name="name" placeholder="Name der Übung" maxlength="80" required>
          <select name="type"><option value="strength">Kraft</option><option value="cardio">Cardio</option></select>
          ${muscleChips('muscle')}
          <button class="btn" type="submit">Anlegen</button>
        </form>
      </div>
      ${mode !== 'template' ? `<div class="card">
        ${live ? `<label>Datum<input type="date" id="w-date" value="${esc(state.date)}" required></label>` : ''}
        <label>Notizen<textarea id="w-notes" rows="3" maxlength="2000" placeholder="Wie lief's?">${esc(state.notes)}</textarea></label>
      </div>` : ''}
      <div class="row">
        <button class="btn primary grow" id="save">${live ? 'Training beenden & speichern' : 'Speichern'}</button>
        <button class="btn" id="cancel">${live ? 'Verwerfen' : 'Abbrechen'}</button>
      </div>
      ${mode === 'template' && state.id ? '<p class="center"><button class="btn danger" id="delete-template">Vorlage löschen</button></p>' : ''}`;
    updateElapsed();
  };

  const blockHtml = (b, bi) => {
    const ex = exerciseById(b.exercise_id);
    const cardio = ex.type === 'cardio';
    const cols = live ? 'live' : 'plain';
    let workNo = 0;
    const rows = b.sets
      .map((s, si) => {
        const label = !cardio && s.warmup ? 'A' : String(++workNo);
        const p = live ? previousFor(prev.get(b.exercise_id), b, si) : null;
        const ph = p
          ? cardio ? { duration_min: toInput(p.duration_min), distance_km: toInput(p.distance_km) } : { reps: toInput(p.reps), weight_kg: toInput(p.weight_kg) }
          : s.target
            ? cardio ? { duration_min: toInput(s.target.duration_min), distance_km: toInput(s.target.distance_km) } : { reps: toInput(s.target.reps), weight_kg: toInput(s.target.weight_kg) }
            : {};
        const prevText = p
          ? cardio ? `${fmt(p.duration_min)} min · ${fmt(p.distance_km, 2)} km` : `${fmt(p.weight_kg, 2)} × ${p.reps}`
          : '–';
        const input = (f, mode, aria) =>
          `<input inputmode="${mode}" data-b="${bi}" data-s="${si}" data-f="${f}" value="${esc(s[f])}" placeholder="${esc(ph[f] ?? '')}" aria-label="${aria}">`;
        return `<div class="set-row ${s.done ? 'done' : ''}">
          ${cardio
            ? `<span class="set-no">${label}</span>`
            : `<button class="set-no set-type ${s.warmup ? 'warmup' : ''}" data-action="toggle-warmup" data-b="${bi}" data-s="${si}"
                 aria-label="Satz ${label}: ${s.warmup ? 'Aufwärmsatz' : 'Arbeitssatz'} – tippen zum Umschalten">${label}</button>`}
          ${live ? `<span class="prev small">${prevText}</span>` : ''}
          ${cardio
            ? input('duration_min', 'decimal', 'Dauer in Minuten') + input('distance_km', 'decimal', 'Distanz in km')
            : input('weight_kg', 'decimal', 'Gewicht in kg') + input('reps', 'numeric', 'Wiederholungen')}
          ${live
            ? `<button class="check ${s.done ? 'on' : ''}" data-action="done" data-b="${bi}" data-s="${si}" aria-pressed="${Boolean(s.done)}" aria-label="Satz erledigt">✓</button>`
            : `<button class="icon-btn" data-action="remove-set" data-b="${bi}" data-s="${si}" aria-label="Satz entfernen">−</button>`}
        </div>`;
      })
      .join('');
    return `<div class="card block">
      <div class="block-head">
        <h3>${esc(ex.name)}</h3>
        <button class="icon-btn" data-action="remove-block" data-b="${bi}" aria-label="Übung entfernen">✕</button>
      </div>
      ${mode !== 'edit' ? `<label class="rest-select small">Pause<select data-rest-b="${bi}">${restOptions(b.rest_seconds)}</select></label>` : ''}
      <div class="set-table ${cols}">
        <div class="set-row head">
          <span>Satz</span>${live ? '<span>Vorherig</span>' : ''}
          <span>${cardio ? 'min' : 'kg'}</span><span>${cardio ? 'km' : 'Wdh.'}</span><span></span>
        </div>
        ${rows}
      </div>
      <div class="row">
        <button class="btn small-btn grow" data-action="add-set" data-b="${bi}">+ ${cardio ? 'Eintrag' : 'Satz'}</button>
        ${live ? `<button class="btn small-btn" data-action="remove-last" data-b="${bi}" aria-label="Letzten Satz entfernen">− Satz</button>` : ''}
      </div>
    </div>`;
  };

  function updateElapsed() {
    const el = view.querySelector('#elapsed');
    if (el) el.textContent = fmtDuration((Date.now() - state.started_at) / 1000);
  }
  if (live) {
    const t = setInterval(updateElapsed, 1000);
    viewCleanup = () => clearInterval(t);
  }

  draw();

  view.oninput = (e) => {
    const t = e.target;
    if (t.id === 'w-date') state.date = t.value;
    else if (t.id === 'w-notes') state.notes = t.value;
    else if (t.id === 't-name') state.name = t.value;
    else if (t.dataset.f) state.blocks[t.dataset.b].sets[t.dataset.s][t.dataset.f] = t.value;
    else return;
    t.classList.toggle('invalid', t.dataset.f ? Number.isNaN(parseNum(t.value)) : false);
    persist();
  };

  view.onclick = async (e) => {
    const t = e.target.closest('[data-action], #save, #cancel, #delete-template');
    if (!t) return;
    const b = Number(t.dataset.b);
    const block = state.blocks[b];
    const s = Number(t.dataset.s);
    switch (t.dataset.action || t.id) {
      case 'add-set': {
        const last = block.sets[block.sets.length - 1];
        const type = exerciseById(block.exercise_id).type;
        block.sets.push(last ? { ...last, warmup: false, done: false } : emptySet(type));
        break;
      }
      case 'remove-set':
        block.sets.splice(s, 1);
        if (!block.sets.length) state.blocks.splice(b, 1);
        break;
      case 'remove-last':
        block.sets.pop();
        if (!block.sets.length) state.blocks.splice(b, 1);
        break;
      case 'remove-block':
        if (!confirm('Übung mit allen Sätzen entfernen?')) return;
        state.blocks.splice(b, 1);
        break;
      case 'toggle-warmup':
        block.sets[s].warmup = !block.sets[s].warmup;
        break;
      case 'done': {
        const row = block.sets[s];
        if (row.done) {
          row.done = false;
          break;
        }
        // Leere Felder mit dem Vorschlag (vorherig bzw. Vorlage) füllen
        view.querySelectorAll(`input[data-b="${b}"][data-s="${s}"]`).forEach((inp) => {
          if (!row[inp.dataset.f] && inp.placeholder) row[inp.dataset.f] = inp.placeholder;
        });
        try {
          if (!parseRow(row, exerciseById(block.exercise_id).type === 'cardio')) {
            showError(new Error('Bitte zuerst Werte eintragen.'));
            break;
          }
        } catch (err) {
          showError(err);
          break;
        }
        row.done = true;
        startRest(block.rest_seconds ?? getDefaultRest());
        break;
      }
      case 'cancel':
        if (mode === 'edit') return void (location.hash = `#/training/${state.id}`);
        if (mode === 'template') return void (location.hash = '#/workouts');
        if (state.blocks.length && !confirm('Training verwerfen? Die Eingaben gehen verloren.')) return;
        clearDraft();
        stopRest();
        return void (location.hash = '#/workouts');
      case 'delete-template':
        if (!confirm(`Vorlage „${state.name}“ löschen?`)) return;
        try {
          await api.deleteTemplate(state.id);
          location.hash = '#/workouts';
        } catch (err) {
          showError(err);
        }
        return;
      case 'save':
        return mode === 'template' ? saveTemplate(t) : saveWorkout(t);
    }
    persist();
    draw();
  };

  view.onchange = async (e) => {
    const t = e.target;
    if (t.dataset.restB != null) {
      state.blocks[t.dataset.restB].rest_seconds = t.value ? Number(t.value) : null;
      return persist();
    }
    if (t.id !== 'add-exercise') return;
    const form = view.querySelector('#new-exercise');
    if (t.value === 'new') {
      form.hidden = false;
      form.querySelector('input').focus();
      return;
    }
    if (!t.value) return;
    addBlock(exerciseById(t.value));
  };

  function addBlock(ex) {
    const prevSets = prev.get(ex.id);
    const sets = prevSets?.length
      ? prevSets.map((p) => ({ ...emptySet(ex.type, Boolean(p.is_warmup)), done: false }))
      : [emptySet(ex.type)];
    state.blocks.push({ exercise_id: ex.id, rest_seconds: null, sets });
    persist();
    draw();
  }

  view.onsubmit = async (e) => {
    if (e.target.id !== 'new-exercise') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name')).trim();
    const type = f.get('type');
    const muscles = type === 'cardio' ? [] : f.getAll('muscle');
    if (!name) return;
    const existing = exercises.find((x) => x.name.toLowerCase() === name.toLowerCase());
    try {
      const ex = existing || (await api.createExercise(name, type, muscles));
      if (!existing) exercises = [...exercises, ex].sort((a, b) => a.name.localeCompare(b.name, 'de'));
      addBlock(ex);
    } catch (err) {
      showError(err);
    }
  };

  async function saveTemplate(btn) {
    const name = state.name.trim();
    if (!name) return showError(new Error('Bitte gib der Vorlage einen Namen.'));
    if (!state.blocks.length) return showError(new Error('Füge mindestens eine Übung hinzu.'));
    let templateExercises;
    try {
      templateExercises = state.blocks.map((b) => {
        const cardio = exerciseById(b.exercise_id).type === 'cardio';
        return {
          exercise_id: b.exercise_id,
          rest_seconds: b.rest_seconds ?? null,
          sets: b.sets.map((row) => {
            const v = parseRowLoose(row, cardio);
            return cardio ? v : { warmup: Boolean(row.warmup), reps: v.reps, weight_kg: v.weight_kg };
          }),
        };
      });
    } catch (err) {
      return showError(err);
    }
    btn.disabled = true;
    try {
      await api.saveTemplate({ id: state.id, name, exercises: templateExercises });
      location.hash = '#/workouts';
    } catch (err) {
      btn.disabled = false;
      showError(err);
    }
  }

  async function saveWorkout(btn) {
    const sets = [];
    try {
      for (const block of state.blocks) {
        const cardio = exerciseById(block.exercise_id).type === 'cardio';
        for (const row of block.sets) {
          const v = parseRow(row, cardio);
          if (v) sets.push({ exercise_id: block.exercise_id, ...v });
        }
      }
    } catch (err) {
      return showError(err);
    }
    if (!state.date) return showError(new Error('Bitte ein Datum angeben.'));
    if (!sets.length && !state.notes.trim()) return showError(new Error('Das Training ist noch leer.'));
    if (live && state.blocks.some((b) => b.sets.some((r) => !r.done && !parseRowSafe(r, b)))) {
      if (!confirm('Nicht abgehakte, leere Sätze werden nicht gespeichert. Training beenden?')) return;
    }
    btn.disabled = true;
    try {
      const savedId = await api.saveWorkout({ id: state.id, date: state.date, notes: state.notes.trim() || null, sets });
      if (live) {
        clearDraft();
        stopRest();
        if (state.template_id) await offerTemplateUpdate(state);
      }
      location.hash = `#/training/${savedId}`;
    } catch (err) {
      btn.disabled = false;
      showError(err);
    }
  }
}

// Für Vorlagen: leere Felder sind erlaubt (Zielwerte optional).
function parseRowLoose(row, cardio) {
  const num = (v) => {
    const n = parseNum(v);
    if (Number.isNaN(n)) throw new Error('Bitte nur Zahlen eingeben.');
    return n;
  };
  if (cardio) return { duration_min: num(row.duration_min), distance_km: num(row.distance_km) };
  const reps = num(row.reps);
  if (reps != null && !Number.isInteger(reps)) throw new Error('Wiederholungen müssen ganze Zahlen sein.');
  return { reps, weight_kg: num(row.weight_kg) };
}

function parseRowSafe(row, block) {
  try {
    return parseRow(row, exerciseById(block.exercise_id).type === 'cardio');
  } catch {
    return null;
  }
}

// Nach dem Training: Vorlage mit den heute geschafften Werten als neue Zielwerte aktualisieren?
async function offerTemplateUpdate(state) {
  let template;
  try {
    template = await api.getTemplate(state.template_id);
  } catch {
    return; // Vorlage wurde inzwischen gelöscht
  }
  if (!confirm(`Vorlage „${template.name}“ mit den Werten von heute aktualisieren?`)) return;
  const exercisesOut = state.blocks.map((b) => {
    const cardio = exerciseById(b.exercise_id).type === 'cardio';
    return {
      exercise_id: b.exercise_id,
      rest_seconds: b.rest_seconds ?? null,
      sets: b.sets.map((row) => {
        const v = parseRowSafe(row, b);
        if (cardio) return v || { duration_min: row.target?.duration_min ?? null, distance_km: row.target?.distance_km ?? null };
        return {
          warmup: Boolean(row.warmup),
          reps: v ? v.reps : row.target?.reps ?? null,
          weight_kg: v ? v.weight_kg : row.target?.weight_kg ?? null,
        };
      }),
    };
  });
  await api.saveTemplate({ id: template.id, name: template.name, exercises: exercisesOut });
}

// ---------------------------------------------------------------------------
// Workouts: Vorlagen auswählen und starten
// ---------------------------------------------------------------------------
const hasDraft = () => Boolean(loadDraft()?.blocks.length);

async function renderWorkouts() {
  const templates = await api.listTemplates();
  const draft = loadDraft();
  const names = new Set(templates.map((t) => t.name.toLowerCase()));
  const missingStarters = STARTER_TEMPLATES.filter((t) => !names.has(t.name.toLowerCase()));
  const setCount = (t) => t.exercises.reduce((n, e) => n + e.sets.length, 0);

  view.innerHTML = `
    <h2>Workouts</h2>
    ${draft?.blocks.length
      ? `<div class="card highlight">
          <h3>Laufendes Training${draft.name ? `: ${esc(draft.name)}` : ''}</h3>
          <p class="muted small">Gestartet vor ${fmtDuration((Date.now() - draft.started_at) / 1000)} · ${plural(draft.blocks.length, 'Übung', 'Übungen')}</p>
          <a class="btn primary block" href="#/neu">Fortsetzen</a>
        </div>`
      : ''}
    ${templates
      .map(
        (t) => `<div class="card template">
          <div class="block-head"><h3>${esc(t.name)}</h3><a class="link" href="#/vorlage/${t.id}">Bearbeiten</a></div>
          <p class="muted small">${plural(t.exercises.length, 'Übung', 'Übungen')} · ${plural(setCount(t), 'Satz', 'Sätze')}</p>
          <p class="small">${esc(t.exercises.map((e) => exerciseById(e.exercise_id)?.name).filter(Boolean).join(' · '))}</p>
          <a class="btn primary block" href="#/start/${t.id}">Starten</a>
        </div>`
      )
      .join('') || '<p class="muted">Noch keine Vorlagen. Lege eine an oder übernimm die Startvorlagen.</p>'}
    ${missingStarters.length
      ? `<div class="card">
          <h3>Startvorlagen</h3>
          <p class="muted small">${esc(missingStarters.map((t) => t.name).join(' & '))} mit deinen Übungen und Gewichten
          aus deiner bisherigen App (umgerechnet von Pfund in kg).</p>
          <button class="btn block" id="add-starters">${esc(missingStarters.map((t) => t.name).join(' & '))} hinzufügen</button>
        </div>`
      : ''}
    <div class="row">
      <a class="btn grow" href="#/vorlage/neu">+ Vorlage</a>
      <button class="btn grow" id="empty-workout">Leeres Training</button>
    </div>
    <div class="card">
      <label>Standard-Pause zwischen Sätzen
        <select id="default-rest">${REST_OPTIONS.map((sec) => `<option value="${sec}" ${sec === getDefaultRest() ? 'selected' : ''}>${fmtDuration(sec)} min</option>`).join('')}</select>
      </label>
      <p class="muted small">Gilt für alle Übungen, bei denen du keine eigene Pause eingestellt hast.
      Die Pause pro Übung stellst du in der Vorlage oder direkt im Training ein.</p>
    </div>`;

  view.querySelector('#default-rest').onchange = (e) => setDefaultRest(Number(e.target.value));
  view.querySelector('#empty-workout').onclick = () => {
    if (hasDraft() && !confirm('Es läuft bereits ein Training. Verwerfen und leer neu starten?')) return;
    saveDraft({ mode: 'live', id: null, template_id: null, name: '', date: todayISO(), notes: '', started_at: Date.now(), blocks: [] });
    location.hash = '#/neu';
  };
  const starterBtn = view.querySelector('#add-starters');
  if (starterBtn) {
    starterBtn.onclick = async () => {
      starterBtn.disabled = true;
      try {
        await addStarterTemplates(missingStarters);
        renderWorkouts().catch(showError);
      } catch (err) {
        starterBtn.disabled = false;
        showError(err);
      }
    };
  }
}

async function addStarterTemplates(starters) {
  for (const t of starters) {
    const templateExercises = [];
    for (const e of t.exercises) {
      let ex = exercises.find((x) => x.name.toLowerCase() === e.name.toLowerCase());
      if (!ex) {
        ex = await api.createExercise(e.name, 'strength', e.muscles);
        exercises = [...exercises, ex].sort((a, b) => a.name.localeCompare(b.name, 'de'));
      }
      templateExercises.push({ exercise_id: ex.id, rest_seconds: null, sets: e.sets.map((x) => ({ ...x })) });
    }
    await api.saveTemplate({ id: null, name: t.name, exercises: templateExercises });
  }
}

async function startFromTemplate(id) {
  const t = await api.getTemplate(id);
  if (hasDraft() && !confirm('Es läuft bereits ein Training. Verwerfen und „' + t.name + '“ starten?')) {
    location.hash = '#/neu';
    return;
  }
  saveDraft(stateFromTemplate(t));
  location.replace('#/neu');
}

// ---------------------------------------------------------------------------
// Fortschritt & Rekorde
// ---------------------------------------------------------------------------
async function renderProgress() {
  const [workouts, sets] = await Promise.all([api.listWorkouts(), api.listSets()]);
  const dateOf = new Map(workouts.map((w) => [w.id, w.date]));
  const dated = sets.map((s) => ({ ...s, date: dateOf.get(s.workout_id) })).filter((s) => s.date);
  const used = exercises.filter((e) => dated.some((s) => s.exercise_id === e.id));

  if (!used.length) {
    view.innerHTML = '<h2>Fortschritt</h2><p class="muted">Sobald du Trainings erfasst hast, siehst du hier deinen Fortschritt.</p>';
    return;
  }

  let selected;
  try {
    selected = Number(localStorage.getItem('gym-tracker-progress-exercise'));
  } catch {
    /* ignorieren */
  }
  if (!used.some((e) => e.id === selected)) selected = used[0].id;

  const records = personalRecords(dated, exerciseMap());

  view.innerHTML = `
    <h2>Fortschritt</h2>
    <div class="card">
      <label>Übung<select id="p-exercise">${used
        .map((e) => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)}</option>`)
        .join('')}</select></label>
      <div id="p-body"></div>
    </div>
    <h2>Persönliche Rekorde</h2>
    ${recordsHtml(records)}`;

  const drawExercise = () => {
    destroyCharts();
    const ex = exerciseById(selected);
    const rows = exerciseProgress(dated.filter((s) => s.exercise_id === selected), ex.type);
    const body = view.querySelector('#p-body');
    const labels = rows.map((r) => fmtShortDate(r.date));
    if (ex.type === 'cardio') {
      body.innerHTML = `
        <h3>Dauer pro Training</h3><div class="chart"><canvas id="p-c1"></canvas></div>
        <h3>Distanz pro Training</h3><div class="chart"><canvas id="p-c2"></canvas></div>
        ${progressTable(rows, ['Datum', 'Dauer', 'Distanz'], (r) => [fmtDate(r.date, false), `${fmt(r.duration)} min`, `${fmt(r.distance, 2)} km`])}`;
      makeChart(body.querySelector('#p-c1'), 'line', labels, [{ label: 'Dauer', data: rows.map((r) => r.duration), color: cssVar('--series-1') }], 'min');
      makeChart(body.querySelector('#p-c2'), 'line', labels, [{ label: 'Distanz', data: rows.map((r) => r.distance), color: cssVar('--series-1') }], 'km');
    } else {
      body.innerHTML = `
        <h3>Kraftentwicklung</h3>
        <p class="muted small">Geschätztes 1RM nach Epley-Formel: Gewicht × (1 + Wdh. / 30)</p>
        <div class="chart"><canvas id="p-c1"></canvas></div>
        ${progressTable(rows, ['Datum', 'Schwerster Satz', 'Gesch. 1RM', 'Volumen'], (r) => [
          fmtDate(r.date, false),
          `${fmt(r.maxWeight, 2)} kg`,
          `${fmt(r.e1rm)} kg`,
          `${fmt(r.volume, 0)} kg`,
        ])}`;
      makeChart(body.querySelector('#p-c1'), 'line', labels, [
        { label: 'Gesch. 1RM', data: rows.map((r) => Math.round(r.e1rm * 10) / 10), color: cssVar('--series-1') },
        { label: 'Schwerster Satz', data: rows.map((r) => r.maxWeight), color: cssVar('--series-2') },
      ], 'kg');
    }
  };

  view.querySelector('#p-exercise').onchange = (e) => {
    selected = Number(e.target.value);
    try {
      localStorage.setItem('gym-tracker-progress-exercise', String(selected));
    } catch {
      /* ignorieren */
    }
    drawExercise();
  };
  drawExercise();
}

function progressTable(rows, head, cells) {
  return `<details class="table-toggle"><summary>Als Tabelle anzeigen</summary>
    <table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${[...rows].reverse().map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </details>`;
}

function recordsHtml(records) {
  const strength = records.filter((r) => r.type === 'strength');
  const cardio = records.filter((r) => r.type === 'cardio');
  const cell = (rec, text) => (rec ? `${text}<br><span class="muted small">${fmtShortDate(rec.date)}${rec.date.slice(2, 4)}</span>` : '–');
  return `
    ${strength.length ? `<div class="card scroll-x"><h3>Kraft</h3><table class="table">
      <thead><tr><th>Übung</th><th>Schwerster Satz</th><th>Bestes gesch. 1RM</th><th>Meistes Volumen</th></tr></thead>
      <tbody>${strength
        .map(
          (r) => `<tr><td>${esc(r.exercise)}</td>
          <td>${cell(r.heaviest, r.heaviest && `${fmt(r.heaviest.weight, 2)} kg × ${r.heaviest.reps}`)}</td>
          <td>${cell(r.bestE1RM, r.bestE1RM && `${fmt(r.bestE1RM.value)} kg`)}</td>
          <td>${cell(r.bestVolume, r.bestVolume && `${fmt(r.bestVolume.value, 0)} kg`)}</td></tr>`
        )
        .join('')}</tbody></table></div>` : ''}
    ${cardio.length ? `<div class="card scroll-x"><h3>Cardio</h3><table class="table">
      <thead><tr><th>Übung</th><th>Längste Dauer</th><th>Weiteste Distanz</th></tr></thead>
      <tbody>${cardio
        .map(
          (r) => `<tr><td>${esc(r.exercise)}</td>
          <td>${cell(r.longestDuration, r.longestDuration && `${fmt(r.longestDuration.value)} min`)}</td>
          <td>${cell(r.longestDistance, r.longestDistance && `${fmt(r.longestDistance.value, 2)} km`)}</td></tr>`
        )
        .join('')}</tbody></table></div>` : ''}`;
}

// ---------------------------------------------------------------------------
// Körpergewicht
// ---------------------------------------------------------------------------
async function renderBody() {
  destroyCharts();
  const [weights, workouts, sets] = await Promise.all([api.listBodyWeights(), api.listWorkouts(), api.listSets()]);
  const dateOf = new Map(workouts.map((w) => [w.id, w.date]));
  const dated = sets.map((x) => ({ ...x, date: dateOf.get(x.workout_id) })).filter((x) => x.date);
  const levels = strengthLevels(dated, exerciseMap(), todayISO());
  const trained = [...levels.entries()].filter(([, r]) => r.level > 0);
  const usedIds = new Set(dated.map((x) => x.exercise_id));
  const unassigned = exercises.filter((e) => e.type === 'strength' && e.user_id && !musclesOf(e).length);
  const pct = (g) => `${g >= 0 ? '+' : ''}${fmt(g * 100, 0)} %`;

  view.innerHTML = `
    <h2>Körpergraph</h2>
    <div class="card">
      ${bodySvg(levels, esc)}
      <ul class="legend" aria-label="Legende">
        <li><span class="swatch" style="background:var(--level-0)"></span>nicht trainiert</li>
        ${LEVELS.map((l) => `<li><span class="swatch" style="background:var(--level-${l.level})"></span>Stufe ${l.level}: ${l.label}</li>`).join('')}
      </ul>
      <p class="muted small">Kraft-Stufe = wie stark dein geschätztes 1RM (Epley) seit deinem ersten Training
      gestiegen ist: bester Wert der letzten 30 Tage gegenüber dem ersten Training, gemittelt über alle Übungen
      des Muskels. Aufwärmsätze zählen nicht. Tippe auf einen Muskel für Details.</p>
      ${trained.length
        ? `<details class="table-toggle"><summary>Als Tabelle anzeigen</summary>
          <table class="table"><thead><tr><th>Muskel</th><th>Stufe</th><th>Steigerung</th><th>Übungen</th></tr></thead>
          <tbody>${trained
            .map(([m, r]) => `<tr><td>${esc(MUSCLE_NAMES.get(m))}</td><td>${r.level}</td><td>${pct(r.gain)}</td>
              <td class="small">${r.exercises.map((x) => `${esc(x.name)}: ${fmt(x.first)} → ${fmt(x.current)} kg`).join('<br>')}</td></tr>`)
            .join('')}</tbody></table></details>`
        : '<p class="muted">Sobald du Krafttrainings gespeichert hast, färbt sich der Körper ein.</p>'}
      <p id="muscle-detail" class="notice small" hidden></p>
    </div>
    ${unassigned.length
      ? `<div class="card"><h3>Übungen ohne Muskelzuordnung</h3>
          <p class="muted small">Diese eigenen Übungen erscheinen erst im Körpergraphen, wenn du ihnen Muskeln zuordnest.</p>
          ${unassigned
            .map((e) => `<form class="assign" data-ex="${e.id}"><strong>${esc(e.name)}</strong>${usedIds.has(e.id) ? '' : ' <span class="muted small">(noch nicht trainiert)</span>'}
              ${muscleChips('muscle')}<button class="btn small-btn" type="submit">Speichern</button></form>`)
            .join('')}</div>`
      : ''}
    <h2>Körpergewicht</h2>
    <form class="card" id="bw-form">
      <div class="row">
        <label class="grow">Datum<input type="date" name="date" value="${todayISO()}" required></label>
        <label class="grow">Gewicht (kg)<input name="weight" inputmode="decimal" placeholder="z. B. 80,5" required></label>
      </div>
      <button class="btn primary block" type="submit">Speichern</button>
      <p class="muted small">Pro Tag gibt es einen Eintrag – ein neuer Wert für denselben Tag ersetzt den alten.</p>
    </form>
    ${weights.length
      ? `<div class="card"><h3>Verlauf</h3><div class="chart"><canvas id="bw-chart"></canvas></div></div>
         <ul class="list">${[...weights]
           .reverse()
           .map(
             (w) => `<li class="list-row"><span>${fmtDate(w.date)}</span><strong>${fmt(w.weight_kg)} kg</strong>
               <button class="icon-btn" data-id="${w.id}" aria-label="Eintrag löschen">✕</button></li>`
           )
           .join('')}</ul>`
      : '<p class="muted">Noch keine Einträge.</p>'}`;

  if (weights.length) {
    makeChart(view.querySelector('#bw-chart'), 'line', weights.map((w) => fmtShortDate(w.date)), [
      { label: 'Körpergewicht', data: weights.map((w) => Number(w.weight_kg)), color: cssVar('--series-1') },
    ], 'kg');
  }

  const detail = view.querySelector('#muscle-detail');
  const showMuscle = (g) => {
    const r = levels.get(g.dataset.muscle);
    detail.hidden = false;
    detail.innerHTML = `<strong>${esc(MUSCLE_NAMES.get(g.dataset.muscle))}</strong>: ${
      r.level
        ? `Stufe ${r.level} (${pct(r.gain)})<br>${r.exercises.map((x) => `${esc(x.name)}: ${fmt(x.first)} → ${fmt(x.current)} kg (${pct(x.gain)})`).join('<br>')}`
        : 'noch nicht trainiert'
    }`;
  };
  view.querySelectorAll('.muscle').forEach((g) => {
    g.onclick = () => showMuscle(g);
    g.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && showMuscle(g);
  });
  view.querySelectorAll('form.assign').forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const muscles = new FormData(form).getAll('muscle');
      if (!muscles.length) return showError(new Error('Bitte mindestens einen Muskel auswählen.'));
      try {
        const updated = await api.updateExercise(Number(form.dataset.ex), { muscles });
        exercises = exercises.map((x) => (x.id === updated.id ? updated : x));
        renderBody().catch(showError);
      } catch (err) {
        showError(err);
      }
    };
  });

  view.querySelector('#bw-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const weight = parseNum(f.get('weight'));
    if (!weight || Number.isNaN(weight)) return showError(new Error('Bitte ein gültiges Gewicht eingeben.'));
    try {
      await api.saveBodyWeight(f.get('date'), weight);
      renderBody().catch(showError);
    } catch (err) {
      showError(err);
    }
  };
  view.querySelectorAll('[data-id]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('Eintrag löschen?')) return;
      try {
        await api.deleteBodyWeight(Number(btn.dataset.id));
        renderBody().catch(showError);
      } catch (err) {
        showError(err);
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Backup (nur lokaler Modus)
// ---------------------------------------------------------------------------
async function renderBackup() {
  if (api.mode !== 'local') {
    view.innerHTML = '<h2>Backup</h2><p class="muted">Deine Daten liegen in der Cloud (Supabase) und brauchen kein manuelles Backup.</p>';
    return;
  }
  const data = api.exportData();
  view.innerHTML = `
    <h2>Backup</h2>
    <div class="card">
      <p>Im lokalen Modus liegen deine Daten nur in diesem Browser. Löschst du die Browserdaten,
      sind sie weg. Exportiere deshalb regelmäßig eine Sicherung.</p>
      <p class="muted small">Gespeichert: ${plural(data.workouts.length, 'Training', 'Trainings')},
      ${plural(data.sets.length, 'Satz', 'Sätze')}, ${plural(data.body_weights.length, 'Gewichtseintrag', 'Gewichtseinträge')}.</p>
      <button class="btn primary block" id="export">Backup herunterladen</button>
    </div>
    <div class="card">
      <h3>Backup einspielen</h3>
      <p class="muted small">Ersetzt alle Daten in diesem Browser durch die Daten aus der Datei.
      So kannst du deine Daten auch auf ein anderes Gerät übertragen.</p>
      <label>Backup-Datei (.json)<input type="file" id="import" accept="application/json,.json"></label>
    </div>`;

  view.querySelector('#export').onclick = () => {
    const blob = new Blob([JSON.stringify(api.exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-tracker-backup-${todayISO()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  view.querySelector('#import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const obj = api.validateBackup(JSON.parse(await file.text()));
      if (!confirm('Alle aktuellen Daten in diesem Browser werden ersetzt. Fortfahren?')) return;
      api.importData(obj);
      exercises = await api.listExercises();
      clearDraft();
      location.hash = '#/';
    } catch (err) {
      showError(err instanceof SyntaxError ? new Error('Die Datei ist kein gültiges JSON.') : err);
    } finally {
      e.target.value = '';
    }
  };
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function init() {
  initTimer(document.getElementById('rest-timer'));
  try {
    api = await createBackend();
  } catch (err) {
    console.error(err);
    return renderStartError(err);
  }
  const headerBtn = document.getElementById('logout');
  if (api.mode === 'local') {
    user = await api.getUser();
    exercises = await api.listExercises();
    headerBtn.textContent = 'Backup';
    headerBtn.onclick = () => (location.hash = '#/backup');
  } else {
    user = await api.getUser();
    if (user) exercises = await api.listExercises();
    api.onAuthChange((u) => {
      const changed = u?.id !== user?.id;
      user = u;
      if (!changed) return;
      // Supabase empfiehlt, im Auth-Callback keine weiteren Supabase-Aufrufe abzuwarten.
      setTimeout(async () => {
        exercises = u ? await api.listExercises().catch((err) => (showError(err), [])) : [];
        if (!u) clearDraft();
        route();
      }, 0);
    });
    headerBtn.onclick = () => api.signOut();
  }
  window.addEventListener('hashchange', route);
  route();
}

init().catch(showError);

// Die Einzeldatei-Version (gym-tracker.html) hat keinen Service Worker neben sich.
if ('serviceWorker' in navigator && !window.GYM_STANDALONE) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
