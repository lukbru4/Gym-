// Alle Tests nacheinander; Ende mit Fehlercode, wenn einer fehlschlägt
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const files = fs.readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.test.mjs')).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [new URL(f, import.meta.url).pathname], { stdio: 'inherit' });
  console.log(`${r.status === 0 ? '✅' : '❌'} ${f}`);
  if (r.status !== 0) failed++;
}
console.log(`${files.length - failed}/${files.length} Tests bestanden`);
process.exit(failed ? 1 : 0);
