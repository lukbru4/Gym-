# Browser-Tests

Laufen gegen den **lokalen Build** (ohne Konto, Daten im Browser):

```sh
cd web && OUT_DIR=dist-local VITE_BACKEND=local npx vite build
(cd dist-local && python3 -m http.server 8770 &)
cd e2e && npm install && npm test          # alle Tests
node gym.mjs                               # einzelner Test
```

Umgebungsvariablen: `CHROMIUM` (Pfad zu einem vorhandenen Chromium), `SHOTS` (Ordner für Bildschirmfotos, Standard `./shots`).
