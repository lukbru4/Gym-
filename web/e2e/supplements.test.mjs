// Supplements: hinzufügen, Uhrzeit/Tage einstellen, heute abhaken (Startseite + Seite), Serie, Löschen
import { check, go, launch, phone, seed, useData, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
await useData(page, seed({ workouts: 3 }));
await page.goto(BASE); await page.locator('#recap').waitFor();
check(await page.locator('#supp-home').count() === 0, 'Startseite: ohne Supplements keine Karte');
await go(page, '#/supplements'); await page.locator('#supp-presets').waitFor();
await page.locator('[data-preset="Kreatin"]').click();
await page.locator('[data-preset="Vitamin D"]').click();
await page.fill('#supp-custom', 'Ashwagandha'); await page.locator('.supp-custom button').click();
check(await page.locator('#supp-items .supp-item').count() === 3, '3 Supplements hinzugefügt');
check(await page.locator('[data-preset="Kreatin"]').count() === 0, 'Kreatin nicht doppelt anbietbar');
// Ashwagandha ist offen zum Bearbeiten: Uhrzeit 21:30
const ash = page.locator('.supp-item', { hasText: 'Ashwagandha' });
await ash.locator('input[type="time"]').fill('21:30');
check((await ash.locator('.supp-main small').innerText()).includes('21:30'), 'Uhrzeit geändert');
check((await page.locator('#supp-progress').innerText()) === '0 / 3', 'Heute: 0 / 3');
await page.locator('#supp-today [data-take]').first().click();
check((await page.locator('#supp-progress').innerText()) === '1 / 3', 'Abgehakt: 1 / 3');
check(await page.locator('.supp-week span.on').count() === 1, 'Wochenleiste zeigt heute');
// Vitamin D ausschalten → nicht mehr heute fällig
const vit = page.locator('.supp-item', { hasText: 'Vitamin D' });
await vit.locator('input[type="checkbox"]').uncheck();
check((await page.locator('#supp-progress').innerText()) === '1 / 2', 'Inaktiv zählt nicht');
await page.screenshot({ path: `${SHOTS}/supplements.png`, fullPage: true });
// Startseite: Karte mit Abhaken
await go(page, '#/'); await page.locator('#supp-home').waitFor();
await page.locator('#supp-home [data-take]:not([aria-pressed="true"])').first().click();
check(await page.locator('#supp-all').count() === 1, 'Startseite: alles genommen');
await page.locator('#supp-home').screenshot({ path: `${SHOTS}/supp-home.png` });
// bleibt nach Neuladen
await page.reload(); await page.locator('#supp-home').waitFor();
check((await page.locator('#supp-home #supp-progress').innerText()) === '2 / 2', 'Gespeichert nach Neuladen');
// Löschen
await go(page, '#/supplements'); await page.locator('#supp-items').waitFor();
await ash.locator('[data-supp-edit]').click();
await ash.locator('[data-supp-delete]').click(); await page.locator('#dialog-ok').click();
check(await page.locator('#supp-items .supp-item').count() === 2, 'Gelöscht');
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
