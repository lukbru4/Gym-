// Körpergraph: weißer Körper, Muskeln farbig nach Stufe (Beginner … Ultra), Legende, Titel im Profil
import { check, go, launch, phone, seed, useData, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
// Bankdrücken stark gesteigert (40 → 70 kg = Ultra), Kniebeuge kaum (Beginner)
const exercises = [
  { id: 1, name: 'Bankdrücken', type: 'strength', user_id: null, muscles: ['brust'] },
  { id: 2, name: 'Kniebeuge', type: 'strength', user_id: null, muscles: ['quadrizeps'] },
];
const data = seed({ workouts: 12, setsPer: 3, exercises, weightFrom: 40, weightStep: 2.5, start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) });
for (const s of data.sets) if (s.exercise_id === 2) s.weight_kg = 100; // gleich geblieben
await useData(page, data);
await page.goto(BASE); await page.locator('#recap').waitFor();
await go(page, '#/koerper'); await page.locator('#level-legend').waitFor();
const legend = await page.locator('#level-legend li').allInnerTexts();
check(legend.length === 6 && legend[0].startsWith('Untrainiert') && legend[1].startsWith('Beginner') && legend[5].startsWith('Ultra'), 'Legende: Untrainiert, Beginner … Ultra');
// tatsächlich sichtbare Farben der Legende (nicht nur der Code): Farbton aus der dunklen Verlaufsfarbe
const hueOf = (bg) => { const m = [...bg.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map((x) => x.slice(1).map(Number)); return m; };
const swatches = await page.locator('#level-legend .swatch').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage + ' ' + getComputedStyle(e).backgroundColor));
const kind = (rgbs) => { const [r, g, bl] = rgbs[rgbs.length - 1] ?? [0, 0, 0]; if (r > 230 && g > 220 && bl > 210) return 'weiß'; if (bl > r && bl > g) return r > 80 ? 'lila' : 'blau'; if (r > 200 && g > 150) return 'gelb'; if (r > 200 && g > 90) return 'orange'; if (r > 150) return 'rot'; return '?'; };
const kinds = swatches.map((sw) => kind(hueOf(sw)));
check(kinds.join(',') === 'weiß,gelb,orange,rot,blau,lila', 'Legende zeigt wirklich Weiß, Gelb, Orange, Rot, Blau, Lila: ' + kinds.join(','));
const lvl = (m) => page.locator(`.bodygraph [data-muscle="${m}"]`).first().getAttribute('data-level');
check((await lvl('brust')) === '5' && (await lvl('quadrizeps')) === '1' && (await lvl('lat')) === '0', 'Brust Ultra, Beine Beginner, Rücken untrainiert');
const fill = await page.locator('.bodygraph [data-muscle="brust"]').first().evaluate((el) => el.style.fill);
check(fill.startsWith('url(') && /rgb|#/.test(fill), 'Muskel: Verlauf mit fester Ersatzfarbe ' + fill);
const pathFill = await page.locator('.bodygraph [data-muscle="brust"] path').first().evaluate((el) => getComputedStyle(el).fill);
check(pathFill.includes('url(') , 'Pfad erbt die Stufenfarbe ' + pathFill);
const gid = fill.match(/#([^"')\s]+)/)[1];
check(await page.locator(`.bodygraph defs linearGradient[id="${gid}"]`).count() === 1, 'Verlauf liegt im obersten defs, eindeutig');
await page.locator('.bodygraph [data-muscle="brust"]').first().dispatchEvent('click');
check((await page.locator('#muscle-name').innerText()).includes('Ultra'), 'Antippen: „Brust · Ultra“');
await page.locator('.bodygraph-panel').first().screenshot({ path: `${SHOTS}/koerper.png` });
await page.locator('#preview-toggle').click();
check(await page.locator('#preview-note').count() === 1, 'Vorschau ist beschriftet');
const lvls = new Set(await page.locator('.bodygraph [data-level]').evaluateAll((els) => els.map((e) => e.getAttribute('data-level'))));
check(['1', '2', '3', '4', '5'].every((l) => lvls.has(l)), 'Vorschau zeigt alle Stufen Gelb bis Lila');
await page.locator('.bodygraph-panel').first().screenshot({ path: `${SHOTS}/koerper-vorschau.png` });
await page.locator('#preview-toggle').click();
check((await lvl('lat')) === '0', 'Zurück zu eigenen Werten');
await go(page, '#/'); await page.locator('#home-scale').waitFor();
check((await page.locator('#home-scale li').allInnerTexts()).join(',') === 'Beginner,Fortgeschritten,Profi,Elite,Ultra', 'Startseite: Farbskala Beginner … Ultra');
const homeKinds = (await page.locator('#home-scale li span').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage))).map((sw) => kind(hueOf(sw)));
check(homeKinds.join(',') === 'gelb,orange,rot,blau,lila', 'Startseiten-Skala sichtbar Gelb … Lila: ' + homeKinds.join(','));
await page.locator('.bodygraph-link').screenshot({ path: `${SHOTS}/home-koerper.png` });
await go(page, '#/profil'); await page.locator('#title-card').waitFor();
check((await page.locator('#title-badge').innerText()).length > 0 && (await page.locator('#title-next').innerText()).length > 0, 'Profil: Titel und nächster Schritt');
await page.locator('#title-card').screenshot({ path: `${SHOTS}/titel.png` });
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
