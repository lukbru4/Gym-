// Neues Gym: leerer Boden → Wände, Fenster → Gerät kaufen, drehen, gerade, Größe → Figur läuft herum → Fläche + 2. Etage; keine hängende Deko
import { check, launch, phone, seed, useData, BASE, SHOTS } from './lib.mjs';
const b = await launch();
const { page } = await phone(b);
await useData(page, seed({ workouts: 60, setsPer: 6 })); // genug Credits
await page.goto(BASE); await page.locator('#gym-mini').waitFor();
check((await page.locator('#gym-mini').innerText()).includes('Rückwand'), 'Startseite: nächster Bau-Schritt „Rückwand“');
await page.click('#gym-mini'); await page.locator('#gym-room').waitFor();
const room = page.locator('#gym-room');
check((await room.getAttribute('data-built')) === '' && (await page.locator('.gym-wall-back').count()) === 0 && (await page.locator('.gym-sign').count()) === 1, 'Start: nur Boden unter freiem Himmel, Name auf Aufsteller');
check((await page.locator('.gym-obj').count()) === 0, 'Noch keine Geräte');
await page.screenshot({ path: `${SHOTS}/gym-0-boden.png` });
const bal = async () => Number((await page.locator('#gym-balance').innerText()).replace(/\D/g, ''));
const credits0 = await bal();
check(credits0 > 1000, `Genug Credits zum Bauen (${credits0})`);
const buy = async (sel) => { await page.click(sel); await page.locator('#dialog-ok').click(); await page.waitForTimeout(250); };
// Bauen
check(await page.locator('[data-build="b_wall_sides"]').evaluate((el) => el.classList.contains('locked')), 'Seitenwände erst nach der Rückwand');
await buy('[data-buy="b_wall_back"]');
check((await page.locator('.gym-wall-back').count()) === 1 && (await bal()) === credits0 - 250, 'Rückwand gebaut, 250 Credits abgezogen');
await buy('[data-buy="b_wall_sides"]');
await buy('[data-buy="b_window_1"]'); await buy('[data-buy="b_window_2"]');
check((await page.locator('.gym-window').count()) === 2, 'Zwei Fenster in der Wand');
await buy('[data-buy="b_style_brick"]');
check((await room.getAttribute('data-built')).includes('b_style_brick'), 'Backstein-Wände');
await page.screenshot({ path: `${SHOTS}/gym-1-waende.png` });
// Gerät kaufen → steht im Raum
await page.click('[data-tab="geraete"]');
await buy('[data-buy="m_bench"]');
check((await page.locator('.gym-obj[data-obj="bench"]').count()) === 1, 'Hantelbank gekauft und aufgestellt');
await buy('[data-buy="m_pullup"]');
// Gerät einrichten: gerade / 3D, größer, drehen
await page.click('#gym-edit');
await page.locator('.gym-obj[data-obj="bench"] canvas').click({ force: true });
await page.locator('#gym-selbar').waitFor();
await page.click('#gym-straight');
check((await page.locator('.gym-obj[data-obj="bench"]').getAttribute('data-straight')) === '1', 'Gerät gerade hingestellt (von vorne, flach)');
const w0 = await page.locator('.gym-obj[data-obj="bench"] canvas').evaluate((c) => c.clientWidth);
await page.click('#gym-bigger'); await page.click('#gym-bigger'); await page.click('#gym-bigger');
check((await page.locator('.gym-obj[data-obj="bench"]').getAttribute('data-size')) === '1.3', 'Größer gezogen: 130 %');
const w1 = await page.locator('.gym-obj[data-obj="bench"] canvas').evaluate((c) => c.clientWidth);
check(w1 > w0, `Gerät wirklich größer (${w0} → ${w1} px)`);
await page.fill('#gym-size', '60');
check((await page.locator('.gym-obj[data-obj="bench"]').getAttribute('data-size')) === '0.6', 'Regler: 60 %');
await page.fill('#gym-size', '120');
await page.click('#gym-rotate');
check((await page.locator('.gym-obj[data-obj="bench"]').getAttribute('data-rot')) === '1', 'Gedreht');
await page.click('#gym-done');
// Leute: keine gekauften Figuren mehr, nur du (und Freunde)
await page.click('[data-tab="leute"]');
check(await page.locator('[data-buy^="p_"]').count() === 0 && await page.locator('[data-person-row^="npc:"]').count() === 0, 'Keine Anna, Max & Co. mehr');
await page.click('[data-assign="me:me"]');
const me = page.locator('.gym-walker[data-walker="me:me"]');
await me.waitFor();
check((await me.locator('.gym-walker-name').innerText()) === 'Du' && (await me.locator('.block-fig').count()) === 1, 'Du läufst als Klötzchen-Figur durchs Gym');
await page.locator('#gym-room').scrollIntoViewIfNeeded();
const modes = new Set(), spots = new Set();
for (let i = 0; i < 24; i++) { modes.add(await me.getAttribute('data-mode')); spots.add(await me.evaluate((el) => el.style.left)); await page.waitForTimeout(500); }
check(spots.size > 1, `Figur läuft herum (${spots.size} Positionen)`);
check(modes.has('walk') && (modes.has('reps') || modes.has('talk') || modes.has('stand')), 'Läuft und macht zwischendurch Sätze / redet: ' + [...modes].join(','));
await page.locator('#gym-zoom').screenshot({ path: `${SHOTS}/gym-figur.png` });
// Fläche + 2. Etage (eigener Raum)
await page.click('[data-tab="bauen"]');
await buy('[data-buy="b_size_m"]');
check((await page.locator('#gym-count').innerText()).includes('16'), 'Größere Fläche: 16 Plätze');
await buy('[data-buy="b_floor2"]');
await page.click('#gym-floor-1');
check((await room.getAttribute('data-floor')) === '1' && (await page.locator('.gym-stairs').count()) === 1, '2. Etage: eigener Raum mit Treppe');
check((await page.locator('.gym-obj').count()) === 0, '2. Etage ist zuerst leer');
// Klimmzugstange vom Erdgeschoss nach oben bringen
await page.click('#gym-floor-0'); await page.click('#gym-edit');
await page.locator('.gym-obj[data-obj="pullup"] canvas').click({ force: true });
await page.click('#gym-move-floor'); await page.click('#gym-done');
await page.click('#gym-floor-1');
check((await page.locator('.gym-obj[data-obj="pullup"]').count()) === 1, 'Klimmzugstange steht jetzt in der 2. Etage');
await page.click('[data-tab="leute"]');
await page.selectOption('[data-assign="me:me"]', '1');
await page.locator('.gym-walker[data-walker="me:me"]').waitFor();
check(true, 'Du gehst hoch in die 2. Etage');
await page.locator('#gym-zoom').screenshot({ path: `${SHOTS}/gym-etage2.png` });
await page.click('#gym-floor-0');
check((await page.locator('.gym-obj[data-obj="bench"]').count()) === 1 && (await page.locator('.gym-obj[data-obj="pullup"]').count()) === 0 && (await page.locator('.gym-walker').count()) === 0, 'Erdgeschoss: Hantelbank, ohne Klimmzugstange und Figur');
// Deko: keine hängenden Sachen
await page.click('[data-tab="deko"]');
check(!(await page.locator('[data-deco="gym_bag"], [data-deco="gym_rings"], [data-deco="gym_lamp"]').count()), 'Kein Boxsack, keine Ringe, keine Hängelampe im Laden');
await page.locator('#gym-zoom').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
await page.locator('#gym-zoom').screenshot({ path: `${SHOTS}/gym-2-fertig.png` });
// bleibt nach Neuladen
await page.reload(); await page.click('#gym-mini'); await page.locator('#gym-room').waitFor();
check((await page.locator('#gym-room').getAttribute('data-built')).includes('b_floor2') && (await page.locator('.gym-obj[data-obj="bench"]').getAttribute('data-size')) === '1.2', 'Alles bleibt nach Neuladen');
await page.click('#gym-floor-1');
await page.locator('.gym-walker').first().waitFor({ timeout: 5000 }).catch(() => {});
check((await page.locator('.gym-walker').count()) === 1, 'Figur ist nach Neuladen noch oben');
check(credits0 - (await bal()) === 250 + 300 + 80 + 80 + 200 + 150 + 150 + 500 + 1500, 'Credits korrekt abgezogen');
const credits1 = await bal();
// Aus dem Lager direkt in die 2. Etage (früher landete es immer unten)
await page.click('#gym-floor-0'); await page.click('#gym-edit');
await page.locator('.gym-obj[data-obj="bench"] canvas').click({ force: true }); await page.click('#gym-store');
await page.click('#gym-floor-1'); await page.click('[data-put="bench"]');
check((await room.getAttribute('data-floor')) === '1' && (await page.locator('.gym-obj[data-obj="bench"]').count()) === 1, 'Aus dem Lager in die 2. Etage gestellt');
await page.click('#gym-done');
// Reiter Geräte: Nach oben / unten ohne Einrichten
await page.click('[data-tab="geraete"]');
check((await page.locator('[data-machine="bench"] .gym-placed').innerText()).includes('2. Etage'), 'Geräte-Reiter zeigt: steht in der 2. Etage');
await page.click('[data-move-floor="bench"]');
check((await page.locator('[data-move-floor="bench"]').innerText()).includes('Nach oben') && (await page.locator('.gym-obj[data-obj="bench"]').count()) === 0, '⬇️ Nach unten: Hantelbank wieder im Erdgeschoss');
// eigener Look oben
await page.click('[data-tab="bauen"]');
await page.click('[data-use="b_style_brick"]');
check((await room.getAttribute('data-wall')) === 'brick', 'Oben: Backstein angewendet');
await page.click('#gym-floor-0');
await page.click('[data-reset-style]');
check((await room.getAttribute('data-wall')) === 'beton', 'Unten: Standard-Beton');
await page.click('#gym-floor-1');
check((await room.getAttribute('data-wall')) === 'brick', 'Oben bleibt Backstein (eigener Look je Etage)');
await page.locator('#gym-zoom').screenshot({ path: `${SHOTS}/gym-etage2-look.png` });
// Abbauen mit Sicherheitsfrage, gratis wieder aufbauen
await page.click('[data-unbuild="b_wall_sides"]');
check((await page.locator('#dialog-msg').innerText()).includes('wieder aufbauen kostet nichts'), 'Sicherheitsfrage vor dem Abbauen');
await page.click('#dialog-cancel');
check((await room.getAttribute('data-built')).includes('b_wall_sides'), 'Abbrechen: Seitenwände bleiben');
await page.click('[data-unbuild="b_wall_sides"]'); await page.click('#dialog-ok'); await page.waitForTimeout(200);
check(!(await room.getAttribute('data-built')).includes('b_wall_sides'), 'Seitenwände abgebaut');
check((await page.locator('[data-buy="b_wall_sides"]').innerText()) === 'Bauen (gratis)', 'Wieder bauen: gratis');
await page.click('[data-buy="b_wall_sides"]'); await page.waitForTimeout(200);
check((await room.getAttribute('data-built')).includes('b_wall_sides') && (await bal()) === credits1, 'Seitenwände wieder da, keine Credits abgezogen');
// Alles zurücksetzen: nur mit „ABBAUEN“
await page.click('#gym-reset');
check(await page.locator('#dialog-ok').isDisabled(), 'Zurücksetzen erst nach Eintippen von ABBAUEN');
await page.fill('#dialog-input', 'abbauen'); await page.click('#dialog-ok'); await page.waitForTimeout(250);
check((await room.getAttribute('data-built')) === '' && (await page.locator('.gym-obj').count()) === 0 && (await page.locator('#gym-floor-1').count()) === 0, 'Zurückgesetzt: leerer Boden, keine 2. Etage');
check((await bal()) === credits1 && (await page.locator('[data-buy="b_wall_back"]').innerText()) === 'Bauen (gratis)', 'Credits unverändert, Gekauftes bleibt (gratis neu bauen)');
await page.click('[data-tab="geraete"]');
check((await page.locator('[data-place="bench"]').count()) === 1, 'Hantelbank liegt im Lager');
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
