/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './': die App liegt auf GitHub Pages unter /Gym-/ und nutzt Hash-Routing (#/…).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true },
  test: { environment: 'node', include: ['tests/**/*.test.{js,ts,tsx}'] },
});
