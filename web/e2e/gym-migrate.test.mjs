// Bestehendes Gym (alte Steine): Geräte, Kisten-Deko und Wände bleiben erhalten
import { check, launch, phone, seed, useData, BASE } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
// 9 Steine: Hits = Summe(15 + 8n) für n < 9 → 423 Sätze
await useData(page, seed({ workouts: 47, setsPer: 9 }), {
  'gym-tracker-gym2:local': JSON.stringify({ name: 'Iron', objects: [{ id: 'bench', x: 20, y: 30, level: 0 }, { id: 'pullup', x: 60, y: 30, level: 0 }] }),
  'gym-tracker-gym-seen:local': '9',
});
await page.goto(BASE); await page.click('#gym-mini'); await page.locator('#gym-room').waitFor();
check((await page.locator('.gym-obj').count()) === 2, 'Aufgestellte Geräte bleiben stehen');
check((await page.locator('.gym-wall-back').count()) === 1 && (await page.locator('.gym-window').count()) >= 1, 'Wände und Fenster der alten Ausbaustufe geschenkt');
await page.click('[data-tab="geraete"]');
const placeable = await page.locator('[data-place]').count();
check(placeable >= 7, `Früher gefundene Geräte im Besitz (${placeable} zum Aufstellen)`);
const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('gym-tracker-gym2:local')));
check(saved.v === 2 && saved.legacy.includes('chest_trophy'), 'Im neuen Format gespeichert, Pokal aus der Kiste bleibt');
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
