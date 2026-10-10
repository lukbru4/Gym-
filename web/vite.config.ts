/// <reference types="vitest/config" />
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Schreibt version.json (für den Update-Hinweis) aus APP_VERSION in src/version.ts */
function versionJson(): Plugin {
  return {
    name: 'version-json',
    generateBundle() {
      const src = readFileSync(new URL('./src/version.ts', import.meta.url), 'utf8');
      const version = src.match(/APP_VERSION = '([^']+)'/)?.[1];
      if (!version) throw new Error('APP_VERSION nicht gefunden');
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ version }, null, 2)}\n` });
      // SQL-Einrichtung für Supabase (Kopier-Seite) mit veröffentlichen
      for (const f of ['schema.sql', 'einrichten.html']) {
        this.emitFile({ type: 'asset', fileName: `supabase/${f}`, source: readFileSync(new URL(`../supabase/${f}`, import.meta.url), 'utf8') });
      }
    },
  };
}

/** Listet die Übungsbilder in public/exercise-media/<slug>/0.jpg|1.jpg als index.json (die App fragt nur vorhandene Bilder an) */
function exerciseMediaIndex(): Plugin {
  return {
    name: 'exercise-media-index',
    generateBundle() {
      const dir = new URL('./public/exercise-media/', import.meta.url);
      const slugs = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/0.jpg`, dir))).map((d) => d.name).sort() : [];
      this.emitFile({ type: 'asset', fileName: 'exercise-media/index.json', source: `${JSON.stringify({ slugs })}\n` });
    },
  };
}

// base './': die App liegt auf GitHub Pages unter /Gym-/ und nutzt Hash-Routing (#/…).
export default defineConfig({
  base: './',
  plugins: [react(), versionJson(), exerciseMediaIndex()],
  build: { outDir: process.env.OUT_DIR || 'dist', sourcemap: true },
  test: { environment: 'node', include: ['tests/**/*.test.{js,ts,tsx}'] },
});
