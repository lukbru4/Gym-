// Kontaktbogen aus Bildschirmfotos: node sheet.mjs out.png spalten a.png b.png …
import fs from 'node:fs';
import { launch } from './lib.mjs';
const [out, cols, ...files] = process.argv.slice(2);
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${f.split('/').pop()}</figcaption></figure>`).join('');
const b = await launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
await p.setContent(`<style>body{margin:0;background:#222;color:#ddd;font:11px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px}img{width:100%}figure{margin:0}</style>${imgs}`);
await p.screenshot({ path: out, fullPage: true }); await b.close();
