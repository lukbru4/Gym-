// Rückblick oben auf der Startseite: „Deine Aktivitäten“ (Trainings, Wasser, Gym-Ausbau)
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
check(kinds.includes('gym') && (await page.locator('#recap-acts [data-act="gym"]').innerText()).includes('Rückwand gebaut'), 'Gym-Ausbau als Aktivität');
check((await page.locator('#recap-acts [data-act="water"]').innerText()).includes('1,25 l'), 'Wasser als Aktivität');
check((await page.locator('#recap-acts li').first().innerText()).length > 0, 'Liste gefüllt');
if (await page.locator('#recap-acts-more').count()) { await page.locator('#recap-acts-more').click(); check(true, 'Alle anzeigen'); }
await page.locator('#recap').screenshot({ path: `${SHOTS}/rueckblick.png` });
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
