// Fragerunden: Runde 1 „Über dich“ komplett durchklicken (mit Hilfen, Körperfett-Rechner), Zusammenfassung,
// Runde 2 „Dein Training“ → berechneter Plan, Hinweis vor dem Training, Bezahlseite #/abo.
import { check, go, launch, phone, useData, seed, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
await useData(page, seed({ workouts: 0 }));
await page.goto(BASE); await page.locator('#view').waitFor();
// Vor dem Training: Hinweis auf Runde 2
await go(page, '#/workouts'); await page.locator('#r2-prompt').waitFor();
check(true, 'Workouts: Hinweis „Plan erstellen lassen“');
await page.locator('#r2-later').click();
check(await page.locator('#r2-prompt').count() === 0, '„Später“ blendet den Hinweis aus');

await go(page, '#/ueber-dich'); await page.locator('#round-1').waitFor();
const step = () => page.locator('.ob').getAttribute('data-step');
const shot = async (n) => page.screenshot({ path: `${SHOTS}/ob-${n}.png` });
const seen = [];
for (let n = 0; n < 40; n++) {
  if (await page.locator('#round-1-done').count()) break;
  const id = await step();
  seen.push(id);
  if (id === 'name') { await page.fill('#ob-text', 'Lukas'); await shot('1-name'); await page.click('#ob-next'); continue; }
  if (id === 'sex') { await shot('2-sex'); await page.click('[data-v="m"]'); await page.waitForTimeout(300); continue; }
  if (id === 'height') {
    await page.click('#ob-help'); check(await page.locator('#ob-help-text li').count() >= 3, 'Größe: Mess-Hilfe');
    await page.locator('#ob-slider').fill('182'); await shot('3-height'); await page.click('#ob-next'); continue;
  }
  if (id === 'weight') { await page.locator('#ob-slider').fill('84'); await page.click('#ob-next'); continue; }
  if (id === 'bodyfat') {
    await page.locator('#ob-slider').fill('24'); await shot('4-bodyfat-24');
    await page.click('#ob-navy-open'); await page.locator('#ob-navy').waitFor();
    await page.locator('#navy-neck').fill('39'); await page.locator('#navy-waist').fill('88');
    await page.screenshot({ path: `${SHOTS}/ob-5-navy.png`, fullPage: true });
    const t = await page.locator('#navy-take').innerText();
    check(/\d+ %/.test(t), `Maßband-Rechner: ${t}`);
    await page.click('#navy-take');
    const v = await page.locator('#ob-slider-value').innerText();
    check(t.includes(`${v} %`), 'Ergebnis übernommen');
    await page.locator('#ob-slider').fill('12'); await shot('6-bodyfat-12');
    await page.click('#ob-next'); continue;
  }
  if (id === 'goal') { await shot('7-goal'); await page.click('[data-v="rekomp"]'); await page.waitForTimeout(300); continue; }
  if (id === 'level') { await shot('8-level'); await page.click('[data-v="neuling"]'); await page.waitForTimeout(300); continue; }
  if (id === 'everyday') { await shot('9-everyday'); }
  if (id === 'sports') { await page.click('[data-v="fussball"]'); await page.click('#ob-next'); continue; }
  if (id === 'motivation') { await page.click('[data-v="freunde"]'); await page.click('#ob-next'); continue; }
  // Rest: erste Karte wählen / Weiter
  if (await page.locator('.ob-card').count()) { await page.locator('.ob-card').first().click(); await page.waitForTimeout(300); }
  else await page.click('#ob-next');
}
check(seen.length >= 19, `Runde 1: ${seen.length} Bildschirme (${seen.join(', ')})`);
await page.locator('#round-1-done').waitFor();
check((await page.locator('#ob-kcal').innerText()).includes('kcal'), 'Zusammenfassung mit Kalorien');
await page.screenshot({ path: `${SHOTS}/ob-10-summary.png`, fullPage: true });
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gym-tracker-quiz')).answers);
check(saved.r1 && saved.exp === 'neu' && saved.goal === 'rekomp' && saved.bodyfat === '12', 'Antworten gespeichert (Erfahrung abgeleitet)');

// Runde 2
await page.click('#ob-to-r2'); await page.locator('#round-2').waitFor();
const seen2 = [];
for (let n = 0; n < 30; n++) {
  if (await page.locator('#plan-week').count()) break;
  const id = await step();
  seen2.push(id);
  if (id === 'expMonths') { await page.locator('#ob-slider').fill('2'); await page.click('#ob-steady'); await shot('11-months'); await page.click('#ob-next'); continue; }
  if (id === 'weekdays') {
    for (const d of ['Mo', 'Mi', 'Fr']) await page.click(`[data-day="${d}"]`);
    await page.locator('#ob-dur').fill('45'); await shot('12-week');
    check((await page.locator('#ob-days-count').innerText()).startsWith('3×'), 'Wochenplanung: 3 Tage');
    await page.click('#ob-next'); continue;
  }
  if (id === 'focus') {
    for (const v of ['brust', 'arme', 'beine']) await page.click(`.ob-chip[data-v="${v}"]`);
    check((await page.locator('#ob-limit').innerText()).startsWith('2 von 2'), 'Fokus: höchstens 2');
    await shot('13-focus'); await page.click('#ob-next'); continue;
  }
  if (id === 'split') {
    check(await page.locator('.split-card').count() === 5, '5 Pläne zur Auswahl');
    check(await page.locator('.split-card[data-split="ppl"] .split-day').count() === 3, 'PPL: 3 Tage mit Körpergraph');
    check(await page.locator('.split-day[data-kind="push"] [data-part="chest"]').count() > 0, 'Push-Tag: Brust markiert');
    check(await page.locator('.split-day[data-kind="push"] [data-part="upper-back"]').count() === 0, 'Push-Tag: Latissimus nicht markiert');
    await page.screenshot({ path: `${SHOTS}/ob-12b-split.png`, fullPage: true });
    await page.click('.split-card[data-split="arnold"]'); await page.waitForTimeout(300); continue;
  }
  if (id === 'pain' || id === 'equip') { await page.locator('.ob-chip').first().click(); await page.click('#ob-next'); continue; }
  if (id === 'place') { await page.click('[data-v="gym"]'); await page.waitForTimeout(300); continue; }
  if (id === 'style') { await page.click('#ob-next'); continue; } // schon „Maschinen“ (Anfänger)
  if (await page.locator('.ob-card').count()) { await page.locator('.ob-card').first().click(); await page.waitForTimeout(300); }
  else await page.click('#ob-next');
}
await page.locator('#plan-week').waitFor();
check(seen2.length >= 10 && seen2.length <= 15, `Runde 2: ${seen2.length} Fragen`);
check((await page.locator('#view h2').first().innerText()).toLowerCase().includes('berechnet'), 'Plan ist berechnet');
const a2 = await page.evaluate(() => JSON.parse(localStorage.getItem('gym-tracker-quiz')).answers);
check(a2.split === 'arnold' && (await page.locator('[data-plan-template="Plan · Brust & Rücken"]').count()) === 1, 'Arnold-Split im Plan');
check(a2.r2 && a2.days === '3' && a2.duration === '45' && a2.style === 'maschinen' && a2.focus.length === 2, 'Runde 2 gespeichert, Plan-Antworten passen');
await page.screenshot({ path: `${SHOTS}/ob-14-plan.png`, fullPage: true });
await go(page, '#/workouts'); await page.locator('h2').first().waitFor();
check(await page.locator('#r2-prompt').count() === 0, 'Nach Runde 2 kein Hinweis mehr');

// Bezahlseite
await go(page, '#/abo'); await page.locator('#pro-gate').waitFor();
check((await page.locator('#pro-gate').innerText()).includes('45,00 €') && (await page.locator('#pro-gate').innerText()).includes('8,00 €'), 'Bezahlseite: 45 € / 8 €');
check((await page.locator('#pro-gate').innerText()).includes('spare 53 %'), 'Ersparnis 53 %');
await page.screenshot({ path: `${SHOTS}/ob-15-abo.png`, fullPage: true });
await b.close();
