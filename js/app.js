import * as api from './api.js';
import { todayISO, weeklySummary, exerciseProgress, personalRecords, setVolume } from './stats.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const DRAFT_KEY = 'gym-tracker-draft';

let user = null;
let exercises = []; // [{ id, name, type, user_id }]
let charts = [];

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
  [/^#\/neu$/, () => renderWorkoutForm(null)],
  [/^#\/training\/(\d+)$/, (m) => renderWorkoutDetail(Number(m[1]))],
  [/^#\/training\/(\d+)\/bearbeiten$/, (m) => renderWorkoutForm(Number(m[1]))],
  [/^#\/verlauf$/, renderHistory],
  [/^#\/fortschritt$/, renderProgress],
  [/^#\/gewicht$/, renderBody],
];

async function route() {
  destroyCharts();
  // Ansicht-spezifische Handler zurücksetzen
  view.oninput = view.onclick = view.onchange = view.onsubmit = null;
  document.getElementById('logout').hidden = !user;
  if (!api.isConfigured) return renderSetupHint();
  if (!user) return renderAuth();

  const hash = location.hash || '#/';
  nav.hidden = false;
  nav.querySelectorAll('a').forEach((a) => {
    const target = a.getAttribute('href');
    a.classList.toggle('active', target === '#/' ? hash === '#/' || hash === '' : hash.startsWith(target));
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
function renderSetupHint() {
  nav.hidden = true;
  view.innerHTML = `
    <div class="card">
      <h2>Einrichtung fehlt</h2>
      <p>Die App ist noch nicht mit Supabase verbunden. Trage <code>SUPABASE_URL</code> und
      <code>SUPABASE_ANON_KEY</code> in <code>js/config.js</code> ein.</p>
      <p>Die Schritte stehen in der <code>README.md</code>.</p>
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
    <a class="btn primary block big" href="#/neu">+ Training erfassen</a>
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
            <tbody>${sets
              .map(
                (s, i) => `<tr><td>${i + 1}</td>${
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
// Training erfassen / bearbeiten
// ---------------------------------------------------------------------------
const emptySet = (type) => (type === 'cardio' ? { duration_min: '', distance_km: '' } : { reps: '', weight_kg: '' });
const toInput = (v) => (v == null ? '' : String(v).replace('.', ','));

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY));
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

async function renderWorkoutForm(id) {
  let state;
  if (id) {
    const w = await api.getWorkout(id);
    state = {
      id,
      date: w.date,
      notes: w.notes ?? '',
      blocks: groupSets(w.sets).map((g) => ({
        exercise_id: g.exercise,
        sets: g.sets.map((s) =>
          exerciseById(g.exercise)?.type === 'cardio'
            ? { duration_min: toInput(s.duration_min), distance_km: toInput(s.distance_km) }
            : { reps: toInput(s.reps), weight_kg: toInput(s.weight_kg) }
        ),
      })),
    };
  } else {
    state = loadDraft() || { id: null, date: todayISO(), notes: '', blocks: [] };
    state.blocks = state.blocks.filter((b) => exerciseById(b.exercise_id));
  }
  const persist = () => !state.id && saveDraft(state);

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

  const draw = () => {
    view.innerHTML = `
      <h2>${state.id ? 'Training bearbeiten' : 'Neues Training'}</h2>
      <div class="card">
        <label>Datum<input type="date" id="w-date" value="${esc(state.date)}" required></label>
      </div>
      ${state.blocks.map(blockHtml).join('')}
      <div class="card">
        <label>Übung hinzufügen<select id="add-exercise">${exerciseOptions()}</select></label>
        <form id="new-exercise" class="inline-form" hidden>
          <input type="text" name="name" placeholder="Name der Übung" maxlength="80" required>
          <select name="type"><option value="strength">Kraft</option><option value="cardio">Cardio</option></select>
          <button class="btn" type="submit">Anlegen</button>
        </form>
      </div>
      <div class="card">
        <label>Notizen<textarea id="w-notes" rows="3" maxlength="2000" placeholder="Wie lief's?">${esc(state.notes)}</textarea></label>
      </div>
      <div class="row">
        <button class="btn primary grow" id="save">Speichern</button>
        <button class="btn" id="cancel">${state.id ? 'Abbrechen' : 'Verwerfen'}</button>
      </div>`;
  };

  const blockHtml = (b, bi) => {
    const ex = exerciseById(b.exercise_id);
    const cardio = ex.type === 'cardio';
    return `<div class="card block">
      <div class="block-head">
        <h3>${esc(ex.name)}</h3>
        <button class="icon-btn" data-action="remove-block" data-b="${bi}" aria-label="Übung entfernen">✕</button>
      </div>
      <div class="set-grid ${cardio ? 'cardio' : ''}">
        <span class="muted small">#</span>
        <span class="muted small">${cardio ? 'Dauer (min)' : 'Wdh.'}</span>
        <span class="muted small">${cardio ? 'Distanz (km)' : 'Gewicht (kg)'}</span>
        <span></span>
        ${b.sets
          .map(
            (s, si) => `
          <span class="set-no">${si + 1}</span>
          ${cardio
            ? `<input inputmode="decimal" data-b="${bi}" data-s="${si}" data-f="duration_min" value="${esc(s.duration_min)}" aria-label="Dauer in Minuten">
               <input inputmode="decimal" data-b="${bi}" data-s="${si}" data-f="distance_km" value="${esc(s.distance_km)}" aria-label="Distanz in km">`
            : `<input inputmode="numeric" data-b="${bi}" data-s="${si}" data-f="reps" value="${esc(s.reps)}" aria-label="Wiederholungen">
               <input inputmode="decimal" data-b="${bi}" data-s="${si}" data-f="weight_kg" value="${esc(s.weight_kg)}" aria-label="Gewicht in kg">`}
          <button class="icon-btn" data-action="remove-set" data-b="${bi}" data-s="${si}" aria-label="Satz entfernen">−</button>`
          )
          .join('')}
      </div>
      <button class="btn small-btn" data-action="add-set" data-b="${bi}">+ ${cardio ? 'Eintrag' : 'Satz'}</button>
    </div>`;
  };

  draw();

  view.oninput = (e) => {
    const t = e.target;
    if (t.id === 'w-date') state.date = t.value;
    else if (t.id === 'w-notes') state.notes = t.value;
    else if (t.dataset.f) state.blocks[t.dataset.b].sets[t.dataset.s][t.dataset.f] = t.value;
    else return;
    t.classList.toggle('invalid', t.dataset.f ? Number.isNaN(parseNum(t.value)) : false);
    persist();
  };

  view.onclick = async (e) => {
    const t = e.target.closest('[data-action], #save, #cancel');
    if (!t) return;
    const b = Number(t.dataset.b);
    if (t.dataset.action === 'add-set') {
      const block = state.blocks[b];
      const last = block.sets[block.sets.length - 1];
      block.sets.push(last ? { ...last } : emptySet(exerciseById(block.exercise_id).type));
    } else if (t.dataset.action === 'remove-set') {
      state.blocks[b].sets.splice(Number(t.dataset.s), 1);
      if (!state.blocks[b].sets.length) state.blocks.splice(b, 1);
    } else if (t.dataset.action === 'remove-block') {
      if (!confirm('Übung mit allen Sätzen entfernen?')) return;
      state.blocks.splice(b, 1);
    } else if (t.id === 'cancel') {
      if (state.id) return void (location.hash = `#/training/${state.id}`);
      if (state.blocks.length && !confirm('Training verwerfen?')) return;
      clearDraft();
      return void (location.hash = '#/');
    } else if (t.id === 'save') {
      return save(t);
    }
    persist();
    draw();
  };

  view.onchange = async (e) => {
    if (e.target.id !== 'add-exercise') return;
    const value = e.target.value;
    const form = view.querySelector('#new-exercise');
    if (value === 'new') {
      form.hidden = false;
      form.querySelector('input').focus();
      return;
    }
    if (!value) return;
    const ex = exerciseById(value);
    state.blocks.push({ exercise_id: ex.id, sets: [emptySet(ex.type)] });
    persist();
    draw();
  };

  view.onsubmit = async (e) => {
    if (e.target.id !== 'new-exercise') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name')).trim();
    const type = f.get('type');
    if (!name) return;
    const existing = exercises.find((x) => x.name.toLowerCase() === name.toLowerCase());
    try {
      const ex = existing || (await api.createExercise(name, type));
      if (!existing) exercises = [...exercises, ex].sort((a, b) => a.name.localeCompare(b.name, 'de'));
      state.blocks.push({ exercise_id: ex.id, sets: [emptySet(ex.type)] });
      persist();
      draw();
    } catch (err) {
      showError(err);
    }
  };

  async function save(btn) {
    const sets = [];
    for (const block of state.blocks) {
      const cardio = exerciseById(block.exercise_id).type === 'cardio';
      for (const s of block.sets) {
        if (cardio) {
          const duration_min = parseNum(s.duration_min);
          const distance_km = parseNum(s.distance_km);
          if (Number.isNaN(duration_min) || Number.isNaN(distance_km)) return showError(new Error('Bitte nur Zahlen eingeben.'));
          if (duration_min == null && distance_km == null) continue;
          sets.push({ exercise_id: block.exercise_id, duration_min, distance_km });
        } else {
          const reps = parseNum(s.reps);
          const weight_kg = parseNum(s.weight_kg);
          if (Number.isNaN(reps) || Number.isNaN(weight_kg)) return showError(new Error('Bitte nur Zahlen eingeben.'));
          if (reps == null && weight_kg == null) continue;
          if (!reps || !Number.isInteger(reps)) return showError(new Error('Jeder Kraftsatz braucht eine ganze Zahl an Wiederholungen.'));
          sets.push({ exercise_id: block.exercise_id, reps, weight_kg: weight_kg ?? 0 });
        }
      }
    }
    if (!state.date) return showError(new Error('Bitte ein Datum angeben.'));
    if (!sets.length && !state.notes.trim()) return showError(new Error('Das Training ist noch leer.'));
    btn.disabled = true;
    try {
      const savedId = await api.saveWorkout({ id: state.id, date: state.date, notes: state.notes.trim() || null, sets });
      if (!state.id) clearDraft();
      location.hash = `#/training/${savedId}`;
    } catch (err) {
      btn.disabled = false;
      showError(err);
    }
  }
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
  const weights = await api.listBodyWeights();
  view.innerHTML = `
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
// Start
// ---------------------------------------------------------------------------
async function init() {
  if (api.isConfigured) {
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
    document.getElementById('logout').onclick = () => api.signOut();
  }
  window.addEventListener('hashchange', route);
  route();
}

init().catch(showError);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
