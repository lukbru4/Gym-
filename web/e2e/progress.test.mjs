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
  return cv.toDataURL('image/jpeg', 0.9).split(',')[1];
}, [color, label])), 'base64');
/** EXIF-Aufnahmedatum in ein JPEG einsetzen (wie bei Handy-Fotos) */
const withExif = (jpg, date) => {
  const t = [0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0, 0x69, 0x87, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 0x03, 0x90, 2, 0, 20, 0, 0, 0, 44, 0, 0, 0, 0, 0, 0, 0, ...[...`${date} 08:30:00`].map((c) => c.charCodeAt(0)), 0];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...t], len = app1.length + 2;
  return Buffer.concat([jpg.subarray(0, 2), Buffer.from([0xff, 0xe1, len >> 8, len & 255, ...app1]), jpg.subarray(2)]);
};
// Einladung auf der Startseite (noch keine Fotos) und Wege zur Seite „Fotos & Maße“
await page.locator('#photo-invite').waitFor({ timeout: 5000 }).catch(() => {});
check(await page.locator('#photo-invite').count() === 1, 'Startseite: Einladung zum ersten Fortschritts-Foto');
await go(page, '#/koerper'); await page.locator('#to-fotos').waitFor();
await page.click('#to-fotos'); await page.locator('#photos').waitFor();
check((await page.evaluate(() => location.hash)) === '#/fotos', 'Körper-Seite → „Fotos & Maße“');
await go(page, '#/profil'); await page.locator('a[href="#/fotos"]').first().waitFor();
check(true, 'Profil-Kachel „Fotos & Maße“');
await page.click('#menu-btn');
await page.click('#menu-fotos'); await page.locator('#photos').waitFor();
check((await page.evaluate(() => location.hash)) === '#/fotos', 'Menüpunkt „📷 Fotos & Maße“ führt zur Seite');
await go(page, '#/fotos'); await page.locator('#measures').waitFor();
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
check((await page.locator('#photo-camera').getAttribute('capture')) === 'user' && (await page.locator('#photo-file').getAttribute('capture')) === null && (await page.locator('#photo-file').getAttribute('multiple')) !== null, 'Kamera-Knopf öffnet die Kamera, Galerie-Knopf die Galerie (mehrere möglich)');
// Zwei Fotos auf einmal aus der Galerie: eins mit Aufnahmedatum 01.09.2026 (EXIF), eins ohne (heute)
await page.setInputFiles('#photo-file', [
  { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: withExif(await img('#c92a2a', 'VORHER'), '2026:09:01') },
  { name: 'IMG_0002.jpg', mimeType: 'image/jpeg', buffer: await img('#1971c2', 'NACHHER') },
]);
await page.locator('#photo-review').waitFor();
check(await page.locator('#photo-review [data-review]').count() === 2, 'Prüf-Fenster zeigt beide Fotos');
check((await page.locator('[data-review-date="0"]').inputValue()) === '2026-09-01', 'Aufnahmedatum aus dem Foto erkannt (01.09.2026)');
await page.locator('#photo-review').screenshot({ path: `${SHOTS}/galerie-pruefen.png` });
await page.selectOption('[data-review-pose="1"]', 'side');
await page.click('[data-review-skip="1"]');
check((await page.locator('#review-save').innerText()).includes('1 speichern'), 'Weglassen: nur noch 1');
await page.click('[data-review-skip="1"]');
await page.click('#review-save');
await page.locator('#photo-review').waitFor({ state: 'detached' });
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb img').length === 2);
check(true, 'Zwei Fotos in der Zeitleiste');
check((await page.locator('.photo-month h3').allTextContents()).some((t) => t.toLowerCase().includes('september 2026')), 'Galerie-Foto steht im September');
check((await page.locator('.photo-thumb .photo-meta').allInnerTexts()).some((t) => t.includes('Seitlich')), 'Pose wird angezeigt');
// Vorher/Nachher nur mit gleicher Pose an verschiedenen Tagen: September „Vorne“ + heute „Seitlich“ reicht nicht
check(await page.locator('#photo-compare').count() === 0 && (await page.locator('#compare-hint').innerText()).includes('derselben Pose'), 'Verschiedene Posen: kein Vergleich, Hinweis');
// heute noch ein „Vorne“-Foto (grün) aus der Galerie
await page.setInputFiles('#photo-file', [{ name: 'IMG_0003.jpg', mimeType: 'image/jpeg', buffer: await img('#2b8a3e', 'HEUTE') }]);
await page.locator('#photo-review').waitFor();
await page.selectOption('[data-review-pose="0"]', 'front');
await page.click('#review-save'); await page.locator('#photo-review').waitFor({ state: 'detached' });
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb img').length === 3);
await page.click('#photo-compare');
await page.locator('#photo-compare-view img').first().waitFor();
check(await page.locator('#photo-compare-view img').count() === 2, 'Vorher / Nachher übereinander');
check((await page.locator('#photo-compare-view').innerText()).includes('Pose: Vorne'), 'Verglichen wird die Pose „Vorne“');
const afterOpts = await page.locator('[data-compare="1"] option').count(), beforeOpts = await page.locator('[data-compare="0"] option').count();
check(afterOpts === 1 && beforeOpts === 1, 'Auswahl nur Fotos derselben Pose, „Nachher“ später als „Vorher“');
await page.fill('#compare-slider', '30');
check((await page.locator('.compare-before').getAttribute('style')).includes('70%'), 'Schieberegler blendet über');
const colorAt = (x) => page.locator('.compare-stage').evaluate(async (el, xx) => {
  const imgs = el.querySelectorAll('img'); const after = imgs[0], before = imgs[1];
  const pick = (im) => { const c = document.createElement('canvas'); c.width = 4; c.height = 4; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 4, 4); const d = g.getImageData(1, 1, 1, 1).data; return d[0] > 150 ? 'rot' : d[1] > 100 ? 'grün' : 'blau'; };
  return xx < 50 ? pick(before) : pick(after);
}, x);
check((await colorAt(10)) === 'rot' && (await colorAt(90)) === 'grün', 'Vorher = September „Vorne“ (rot), Nachher = heute „Vorne“ (grün), das seitliche Foto nicht');
check((await page.locator('#compare-diff').innerText()).match(/\d+ Tage dazwischen/), 'Tage dazwischen');
await page.locator('#photo-compare-view').screenshot({ path: `${SHOTS}/vergleich.png` });
// Großansicht + Löschen mit Abfrage
await page.locator('.photo-thumb').first().click();
await page.click('#photo-delete');
await page.click('#dialog-cancel');
check(await page.locator('.photo-thumb').count() === 3, 'Abbrechen: Foto bleibt');
await page.click('#photo-delete'); await page.click('#dialog-ok');
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb').length === 2);
check(await page.locator('#photo-compare-view').count() === 0 && await page.locator('#photo-compare').count() === 0, 'Foto gelöscht – Vergleich nicht mehr möglich');
// bleibt nach Neuladen (IndexedDB)
await page.reload(); await page.locator('#recap').waitFor();
// Aktivitäten
await page.waitForTimeout(500);
const acts = (await page.locator('#recap-acts').count()) ? await page.locator('#recap-acts').innerText() : '';
check(!acts.includes('Fortschritts-Foto'), 'Aktivitäten zeigen keine Fotos (nur Training & Supplements)');
check(await page.locator('#photo-invite').count() === 0, 'Einladung verschwindet nach dem ersten Foto');
await go(page, '#/fotos'); await page.locator('#photos').waitFor();
await page.waitForFunction(() => document.querySelectorAll('.photo-thumb img').length === 2);
check(true, 'Fotos bleiben nach Neuladen');
// Kalender
await go(page, '#/profil'); await page.locator('#calendar').waitFor();
// übrig ist das Galerie-Foto vom 01.09. → im Kalender zum September blättern
for (let i = 0; i < 2; i++) await page.click('[data-cal="-1"]');
await page.locator('.cal-photo').first().waitFor({ timeout: 4000 }).catch(() => {});
check(await page.locator('.cal-day.photo .cal-photo').count() >= 1, 'Kalender zeigt 📷');
// Fehlendes Datenbank-Update: klarer Hinweis, Knöpfe gesperrt
await page.evaluate(() => localStorage.setItem('gym-tracker-test-noschema', '1'));
await go(page, '#/'); await go(page, '#/fotos'); await page.locator('#schema-missing').first().waitFor();
check((await page.locator('#schema-missing').first().innerText()).includes('Datenbank-Update 68') && await page.locator('#photo-gallery').isDisabled() && await page.locator('#photo-add').isDisabled(), 'Ohne Update 68: Hinweis mit Anleitung, Knöpfe gesperrt');
check(await page.locator('#measures #schema-missing').count() === 1, 'Auch bei den Maßen erscheint der Hinweis');
await page.locator('#photos').screenshot({ path: `${SHOTS}/update-noetig.png` });
await page.evaluate(() => localStorage.removeItem('gym-tracker-test-noschema'));
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
