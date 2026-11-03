// Neues Gym: leerer Boden → Rückwand, Seitenwände, Fenster bauen → Gerät kaufen → Person trainiert → Fläche + 2. Stock; keine hängende Deko
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
// Person an ein Gerät
await page.click('[data-tab="leute"]');
await page.selectOption('[data-assign="me:me"]', 'bench');
await page.locator('.gym-person-name[data-person="me:me"]').waitFor();
check((await page.locator('.gym-obj[data-obj="bench"] .gym-person-name').innerText()) === 'Du', 'Du trainierst an der Hantelbank (mit Namensschild)');
await buy('[data-buy="p_anna"]');
await page.selectOption('[data-assign="npc:p_anna"]', 'pullup');
check((await page.locator('.gym-obj[data-obj="pullup"] .gym-person-name').innerText()) === 'Anna', 'Anna gekauft, trainiert an der Klimmzugstange');
await page.locator('#gym-room').scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
const frame1 = await page.locator('.gym-obj[data-obj="bench"] canvas').evaluate((c) => c.toDataURL());
await page.waitForTimeout(700);
check((await page.locator('.gym-obj[data-obj="bench"] canvas').evaluate((c) => c.toDataURL())) !== frame1, 'Die Person bewegt sich (Animation)');
// Fläche + 2. Stock
await page.click('[data-tab="bauen"]');
await buy('[data-buy="b_size_m"]');
check((await page.locator('#gym-count').innerText()).includes('16'), 'Größere Fläche: 16 Plätze');
await buy('[data-buy="b_floor2"]');
check((await page.locator('.gym-railing').count()) === 1, '2. Stock mit Geländer');
// Deko: keine hängenden Sachen
await page.click('[data-tab="deko"]');
check(!(await page.locator('[data-deco="gym_bag"], [data-deco="gym_rings"], [data-deco="gym_lamp"]').count()), 'Kein Boxsack, keine Ringe, keine Hängelampe im Laden');
await page.locator('#gym-zoom').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
await page.locator('#gym-zoom').screenshot({ path: `${SHOTS}/gym-2-fertig.png` });
// bleibt nach Neuladen
await page.reload(); await page.click('#gym-mini'); await page.locator('#gym-room').waitFor();
check((await page.locator('#gym-room').getAttribute('data-built')).includes('b_floor2') && (await page.locator('.gym-person-name').count()) === 2, 'Alles bleibt nach Neuladen');
check(credits0 - (await bal()) === 250 + 300 + 80 + 80 + 200 + 150 + 150 + 200 + 500 + 1500, 'Credits korrekt abgezogen');
check(page.errors.length === 0, 'Keine Seitenfehler ' + page.errors.join(' | '));
await b.close();
