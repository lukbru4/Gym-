// Studio smarter: Scheibenrechner, Aufwärmsätze per Knopf, Supersätze (Pause erst nach der Runde), Rechner-Seite
import { check, go, launch, phone, seed, useData, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
const exercises = [
  { id: 1, name: 'Bankdrücken', type: 'strength', user_id: null, muscles: ['brust'] },
  { id: 2, name: 'Langhantelrudern', type: 'strength', user_id: null, muscles: ['oberer_ruecken'] },
];
const data = seed({ workouts: 2, setsPer: 3, exercises, weightFrom: 97.5, weightStep: 2.5 });
const sets = (w) => [0, 1, 2].map(() => ({ warmup: false, reps: 8, weight_kg: w }));
data.templates = [{ id: 1, name: 'Push & Pull', exercises: [{ exercise_id: 1, rest_seconds: 90, sets: sets(100) }, { exercise_id: 2, rest_seconds: 60, sets: sets(60) }] }];
await useData(page, data);
await page.goto(BASE); await page.locator('#recap').waitFor();
await go(page, '#/start/1'); await page.locator('.card.block').first().waitFor();
await page.click('#recovery-skip').catch(() => {});
const bench = page.locator('.card.block').nth(0), row = page.locator('.card.block').nth(1);
// Scheibenrechner
await bench.locator('[data-action="plates"]').click();
await page.locator('#plate-dialog').waitFor();
const res = await page.locator('#plate-dialog-calc-result').innerText();
check(res.includes('Je Seite: 25 + 15'), `Scheibenrechner: 100 kg → je Seite 25 + 15 (${res})`);
check(await page.locator('#plate-dialog [data-plate="25"]').count() === 2, 'Stange gezeichnet (je Seite eine 25er)');
await page.fill('#plate-dialog [data-plate-weight]', '61');
check((await page.locator('#plate-dialog-calc-inexact').innerText()).includes('60 kg oder 62,5 kg'), 'Nicht machbar → 60 oder 62,5 kg');
await page.fill('#plate-dialog [data-plate-weight]', '100');
await page.locator('#plate-dialog').screenshot({ path: `${SHOTS}/scheiben.png` });
await page.click('#plate-close');
// Aufwärmsätze
const before = await bench.locator('.set-row:not(.head)').count();
await bench.locator('[data-action="add-warmups"]').click();
check((await bench.locator('.set-row:not(.head)').count()) === before + 4 && (await bench.locator('.set-type.warmup').count()) === 4, '4 Aufwärmsätze vorne eingefügt');
const w0 = await bench.locator('[data-f="weight_kg"]').first().inputValue();
check(w0 === '20', `erster Aufwärmsatz mit leerer Stange (${w0} kg)`);
check(await bench.locator('[data-action="add-warmups"]').count() === 0, 'Knopf verschwindet danach');
// Supersatz
await bench.locator('[data-action="superset"]').click();
check((await bench.getAttribute('data-superset')) === 'A1' && (await row.getAttribute('data-superset')) === 'A2', 'Supersatz: A1 Bankdrücken, A2 Rudern');
// ersten Arbeitssatz Bankdrücken abhaken (nach 4 Aufwärmsätzen = Zeile 5)
await bench.locator('.set-row:not(.head)').nth(4).locator('[data-action="done"]').click();
await page.locator('#next-up').waitFor();
check((await page.locator('#next-up').innerText()).includes('Langhantelrudern') && await page.locator('#rest-timer').count() === 0, 'A1 abgehakt: keine Pause, „weiter mit Langhantelrudern“');
await page.screenshot({ path: `${SHOTS}/supersatz.png` });
await row.locator('.set-row:not(.head)').first().locator('[data-action="done"]').click();
await page.locator('#rest-timer').waitFor({ timeout: 3000 });
check((await page.locator('#next-up').innerText()).includes('Bankdrücken'), 'A2 abgehakt: Pause läuft, danach wieder Bankdrücken');
// Rechner-Seite
await go(page, '#/raenge/rechner'); await page.locator('#plate-card').waitFor();
await page.fill('#plate-page [data-plate-weight]', '140');
check((await page.locator('#plate-page-result').innerText()).includes('25 + 25 + 10'), 'Rechner-Seite: 140 kg → 25 + 25 + 10');
await page.click('#plate-page [data-plate-settings]'); await page.click('#plate-page [data-bar="15"]');
check((await page.locator('#plate-page-result').innerText()).includes('25 + 25 + 10 + 2,5'), 'Stange 15 kg einstellbar');
await page.click('#plate-page [data-bar="20"]');
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
