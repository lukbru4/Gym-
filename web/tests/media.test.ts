import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { mediaSlug } from '../src/lib/exerciseMedia';
import { CATALOG } from '../src/lib/exerciseCatalog';

test('Ordnername einer Übung', () => {
  expect(mediaSlug('Latziehen')).toBe('latziehen');
  expect(mediaSlug('Rudern (T-Stange)')).toBe('rudern-t-stange');
  expect(mediaSlug('Trizepsdrücken am Kabel')).toBe('trizepsdruecken-am-kabel');
  expect(mediaSlug('Kniebeuge (Körpergewicht)')).toBe('kniebeuge-koerpergewicht');
});
test('Ordnernamen aller Katalog-Übungen sind eindeutig', () => {
  const seen = new Map<string, string>();
  for (const c of CATALOG) {
    const s = mediaSlug(c.name);
    expect(s.length, c.name).toBeGreaterThan(1);
    expect(seen.get(s), `${c.name} und ${seen.get(s)} haben denselben Ordner`).toBeUndefined();
    seen.set(s, c.name);
  }
});
test('Bild-Aufträge nennen nur Ordner, die es im Katalog gibt', () => {
  const md = readFileSync(new URL('../../docs/bild-auftraege.md', import.meta.url), 'utf8');
  const slugs = new Set(CATALOG.map((c) => mediaSlug(c.name)));
  const used = [...md.matchAll(/\| `([a-z0-9-]+)` \|/g)].map((m) => m[1]);
  expect(used.length).toBeGreaterThanOrEqual(90);
  for (const s of used) expect(slugs.has(s), s).toBe(true);
});
