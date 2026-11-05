// Rückblick oben: ruhig (eine Zeile + drei Kennzahlen, Rest unter „Mehr anzeigen“); Aktivitäten nur Training & Supplements der letzten 3 Tage
import { check, go, launch, phone, seed, useData, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
const today = new Date().toISOString().slice(0, 10);
await useData(page, seed({ workouts: 3, every: 1, start: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) }), {
  [`gym-tracker-water-local-${today}`]: '1250',
  'gym-tracker-gymlog:local': JSON.stringify([{ date: today, text: 'Rückwand gebaut' }]),
});
await page.goto(BASE); await page.locator('#recap-acts').waitFor();
const kinds = await page.locator('#recap-acts li').evaluateAll((els) => els.map((e) => e.getAttribute('data-act')));
check(kinds.includes('workout'), 'Training als Aktivität');
check(!kinds.includes('gym') && !kinds.includes('water'), 'Kein Gym-Ausbau und kein Wasser in den Aktivitäten');
check(await page.locator('#recap-acts li [data-icon="dumbbell"]').count() >= 1, 'Flaches Hantel-Icon statt Emoji');
const days = await page.locator('#recap-acts .act-day').allInnerTexts();
check(days.every((d) => d === 'Heute' || d === 'Gestern' || /^\w\w \d\d\.\d\d\.$/.test(d)), 'Nur letzte 3 Tage: ' + [...new Set(days)].join(','));
check(await page.locator('#recap-stats > div').count() === 3, 'Drei Kennzahlen: Trainings, Volumen, Serie');
check(await page.locator('#recap-facts').count() === 0, 'Weitere Fakten erst einmal zugeklappt');
await page.click('#recap-more');
check(await page.locator('#recap-facts li').count() >= 2, '„Mehr anzeigen“ klappt die Fakten auf');
await page.click('#recap-more');
await page.locator('#recap').screenshot({ path: `${SHOTS}/rueckblick.png` });
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
