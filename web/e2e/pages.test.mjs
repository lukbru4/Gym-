// Alle Hauptseiten öffnen – keine Seitenfehler; Abenteuer gibt es nicht mehr
import { check, go, launch, phone, seed, useData, BASE } from './lib.mjs';
const b = await launch();
const { page } = await phone(b, { hasTouch: true, isMobile: true });
await useData(page, seed({ workouts: 6 }));
await page.goto(BASE); await page.locator('#recap').waitFor();
check(!(await page.locator('#adv-mini, #fun-choice').count()), 'Startseite ohne Abenteuer und ohne „Gym, Ei oder beides“');
await page.click('#menu-btn');
check(!(await page.locator('#menu-adventure').count()) && (await page.locator('#menu-gym').count()) === 1, 'Menü: „Mein Gym“ ja, „Abenteuer“ nein');
await page.click('#menu-btn');
await go(page, '#/abenteuer');
check(!(await page.locator('#adv-pet, #adv-eggs').count()), '#/abenteuer gibt es nicht mehr');
const routes = ['#/', '#/workouts', '#/koerper', '#/profil', '#/gym', '#/konto', '#/konto/alles', '#/trainingsplan', '#/aufgaben', '#/raenge', '#/backup', '#/animationen', '#/essen', '#/freunde'];
for (const r of routes) await go(page, r);
check(page.errors.length === 0, `${routes.length} Seiten ohne Seitenfehler ${page.errors.join(' | ')}`);
await b.close();
