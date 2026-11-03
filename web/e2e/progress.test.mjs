// Körpermaße + Fortschritts-Fotos (lokal): eintragen, Verlauf, Fotos hinzufügen, Vergleich, löschen, Kalender, Aktivitäten
import { check, go, launch, phone, seed, useData, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
await useData(page, seed({ workouts: 3 }));
await page.goto(BASE); await page.locator('#recap').waitFor();
// Testbilder (zwei Farben) im Browser erzeugen
const img = async (color, label) => Buffer.from((await page.evaluate(([c, l]) => {
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 800;
  const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 600, 800); x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.fillText(l, 120, 420);
  return cv.toDataURL('image/png').split(',')[1];
}, [color, label])), 'base64');
await go(page, '#/koerper'); await page.locator('#measures').waitFor();
// Maße: zwei Messungen
const enter = async (date, vals) => {
  await page.click('#measure-open');
  await page.fill('#measure-form input[type="date"]', date);
  for (const [k, v] of Object.entries(vals)) await page.fill(`[data-measure-input="${k}"]`, v);
  await page.click('#measure-save'); await page.waitForTimeout(300);
};
await enter('2026-09-01', { waist: '86', arm: '36' });
await enter('2026-11-01', { waist: '82,5', arm: '37,5' });
const waist = page.locator('[data-measure="waist"]');
check((await waist.innerText()).includes('82,5') && (await waist.locator('.measure-change.good').innerText()).includes('−3,5'), 'Taille 82,5 cm, −3,5 cm grün');
check((await page.locator('[data-measure="arm"] .measure-change.good').innerText()).includes('+1,5'), 'Oberarm +1,5 cm grün');
await waist.click();
check(await page.locator('#measure-chart').count() === 1, 'Verlauf der Taille als Diagramm');
await page.locator('#measures').screenshot({ path: `${SHOTS}/masse.png` });
// Fotos
check(await page.locator('#photo-friends').count() === 0, 'Ohne Konto: nur „Nur ich“');
await page.setInputFiles('#photo-file', { name: 'a.png', mimeType: 'image/png', buffer: await img('#c92a2a', 'VORHER') });
await page.locator('.photo-thumb').first().waitFor();
await page.click('[data-pose="side"]');
await page.setInputFiles('#photo-file', { name: 'b.png', mimeType: 'image/png', buffer: await img('#1971c2', 'NACHHER') });
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb img').length === 2);
check(true, 'Zwei Fotos in der Zeitleiste');
check((await page.locator('.photo-thumb .photo-meta').allInnerTexts()).some((t) => t.includes('Seitlich')), 'Pose wird angezeigt');
await page.click('#photo-compare');
await page.locator('#photo-compare-view img').first().waitFor();
check(await page.locator('#photo-compare-view img').count() === 2, 'Vorher / Nachher übereinander');
await page.fill('#compare-slider', '30');
check((await page.locator('.compare-before').getAttribute('style')).includes('70%'), 'Schieberegler blendet über');
const colorAt = (x) => page.locator('.compare-stage').evaluate(async (el, xx) => {
  const imgs = el.querySelectorAll('img'); const after = imgs[0], before = imgs[1];
  const pick = (im) => { const c = document.createElement('canvas'); c.width = 4; c.height = 4; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 4, 4); return g.getImageData(1, 1, 1, 1).data[2] > 120 ? 'blau' : 'rot'; };
  return xx < 50 ? pick(before) : pick(after);
}, x);
check((await colorAt(10)) === 'rot' && (await colorAt(90)) === 'blau', 'Vorher = erstes Foto (rot), Nachher = zweites (blau)');
await page.locator('#photo-compare-view').screenshot({ path: `${SHOTS}/vergleich.png` });
// Großansicht + Löschen mit Abfrage
await page.locator('.photo-thumb').first().click();
await page.click('#photo-delete');
await page.click('#dialog-cancel');
check(await page.locator('.photo-thumb').count() === 2, 'Abbrechen: Foto bleibt');
await page.click('#photo-delete'); await page.click('#dialog-ok');
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb').length === 1);
check(true, 'Foto gelöscht');
// bleibt nach Neuladen (IndexedDB)
await page.reload(); await page.locator('#recap').waitFor();
// Aktivitäten
await page.locator('#recap-acts').waitFor();
if (await page.locator('#recap-acts-more').count()) await page.click('#recap-acts-more');
const acts = await page.locator('#recap-acts').innerText();
check(acts.includes('📷') && acts.includes('Fortschritts-Foto (Vorne)') && acts.includes('Seitlich'), 'Aktivitäten: Fortschritts-Fotos');
await go(page, '#/koerper'); await page.locator('#photos').waitFor();
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb img').length === 1);
check(true, 'Foto bleibt nach Neuladen');
// Kalender
await go(page, '#/profil'); await page.locator('#calendar').waitFor();
await page.locator('.cal-photo').first().waitFor({ timeout: 4000 }).catch(() => {});
check(await page.locator('.cal-day.photo .cal-photo').count() >= 1, 'Kalender zeigt 📷');
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
