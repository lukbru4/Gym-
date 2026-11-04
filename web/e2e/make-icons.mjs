// Erzeugt alle App-Symbole (Web, iOS, Android) aus public/icon-master.png (Umriss des Handtuchs aus dem Foto, weiß auf Schwarz). Aufruf: node make-icons.mjs
import { readFileSync } from 'node:fs';
import { launch } from './lib.mjs';
const src = `data:image/png;base64,${readFileSync('../public/icon-master.png').toString('base64')}`;
const sized = (s) => `<img src="${src}" width="${s}" height="${s}" style="display:block">`;
const b = await launch();
const page = await b.newPage({ deviceScaleFactor: 1 });
const shot = async (file, s, html, transparent = false) => {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#000'}">${html}</body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: s, height: s } });
};
for (const [file, s] of [['../public/icon-512.png', 512], ['../public/icon-192.png', 192], ['../public/apple-touch-icon.png', 180], ['../public/favicon-64.png', 64],
  ['../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024]]) await shot(file, s, sized(s));
for (const [d, s, f] of [['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]]) {
  const dir = `../android/app/src/main/res/mipmap-${d}`;
  await shot(`${dir}/ic_launcher.png`, s, sized(s));
  await shot(`${dir}/ic_launcher_round.png`, s, `<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden">${sized(s)}</div>`, true);
  await shot(`${dir}/ic_launcher_foreground.png`, f, sized(f));
  await shot(`${dir}/ic_launcher_background.png`, f, '');
}
await b.close();
console.log('Symbole erzeugt');
