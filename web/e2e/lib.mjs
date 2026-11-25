// Gemeinsame Helfer für die Browser-Tests
import { chromium } from 'playwright';
import fs from 'node:fs';

export const BASE = process.env.BASE ?? 'http://localhost:8770/';
export const SHOTS = process.env.SHOTS ?? new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

export function check(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log('✓', msg);
}

/** Browser starten (vorhandenes Chromium, falls angegeben) */
export async function launch() {
  const guess = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find((p) => fs.existsSync(p));
  return chromium.launch({ executablePath: process.env.CHROMIUM ?? guess });
}

/** Neue Seite in iPhone-Größe; sammelt Seitenfehler */
export async function phone(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return { ctx, page };
}

/** Lokale Testdaten: n Trainings mit je k Sätzen (Übung, Gewicht steigend) */
export function seed({ workouts = 0, setsPer = 5, exercises, weightFrom = 40, weightStep = 2.5, start = '2026-08-01', every = 2 } = {}) {
  const ex = exercises ?? [{ id: 1, name: 'Bankdrücken', type: 'strength', user_id: null, muscles: ['brust', 'trizeps', 'schultern'] }];
  const w = [], s = [];
  let id = 9000;
  for (let i = 0; i < workouts; i++) {
    const wid = id++;
    const date = new Date(Date.parse(start) + i * every * 86400000).toISOString().slice(0, 10);
    w.push({ id: wid, user_id: 'local', date, notes: null, created_at: `${date}T10:00:00Z` });
    ex.forEach((e) => {
      for (let k = 0; k < setsPer; k++) s.push({ id: id++, workout_id: wid, exercise_id: e.id, position: k, reps: 8, weight_kg: weightFrom + i * weightStep, is_warmup: false, user_id: 'local' });
    });
  }
  return { version: 5, nextId: id, exercises: ex, workouts: w, sets: s, body_weights: [], templates: [] };
}

/** Daten vor dem Laden einspielen (nur beim ersten Laden) */
export async function useData(page, data, extra = {}) {
  await page.addInitScript(([d, x]) => {
    if (d && !localStorage.getItem('gym-tracker-data')) localStorage.setItem('gym-tracker-data', JSON.stringify(d));
    localStorage.setItem('gym-tracker-plan-offered:local', '1');
    for (const [k, v] of Object.entries(x)) if (!localStorage.getItem(k)) localStorage.setItem(k, v);
  }, [data, extra]);
}

/** Zu einer Seite wechseln (die App setzt beim Start auf #/ zurück) */
export async function go(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(500);
}
