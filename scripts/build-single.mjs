// Baut gym-tracker.html: die komplette App (HTML, CSS, JS, Icon) in einer einzigen Datei.
// Aufruf: npm run build
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

const { outputFiles } = await build({
  entryPoints: [new URL('js/app.js', root).pathname],
  bundle: true,
  format: 'esm',
  write: false,
  charset: 'utf8',
  legalComments: 'none',
});
const js = outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await read('css/style.css');
const icon = `data:image/svg+xml,${encodeURIComponent((await read('icon.svg')).trim())}`;

let html = await read('index.html');
const replaceOnce = (search, replacement) => {
  if (!html.includes(search)) throw new Error(`Nicht gefunden in index.html: ${search}`);
  html = html.replace(search, () => replacement);
};
replaceOnce('<link rel="manifest" href="manifest.webmanifest">\n', '');
replaceOnce('<link rel="icon" href="icon.svg" type="image/svg+xml">', `<link rel="icon" href="${icon}" type="image/svg+xml">`);
replaceOnce('<link rel="apple-touch-icon" href="icon.svg">\n', '');
replaceOnce('<link rel="stylesheet" href="css/style.css">', `<style>\n${css}</style>`);
replaceOnce(
  '<script type="module" src="js/app.js"></script>',
  `<script>window.GYM_STANDALONE = true;</script>
  <script type="module">
// Gym Tracker – Einzeldatei-Version (erzeugt mit "npm run build", nicht von Hand bearbeiten).
// Ohne weitere Einstellungen werden die Daten lokal in diesem Browser gespeichert.
// Für Cloud-Speicher mit Login: SUPABASE_URL und SUPABASE_ANON_KEY unten eintragen (siehe README).
${js}</script>`
);

await writeFile(new URL('gym-tracker.html', root), html);
console.log(`gym-tracker.html geschrieben (${(html.length / 1024).toFixed(0)} KB)`);
