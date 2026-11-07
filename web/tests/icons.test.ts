import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { iconFor, ICON_NAMES } from '../src/components/Icon';
import { activities } from '../src/lib/activity';

const SRC = new URL('../src/', import.meta.url).pathname;
const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : /\.(ts|tsx)$/.test(f) ? [join(d, f)] : []));
// bunte Emojis (Bildzeichen); typografische Zeichen wie ✓ ✕ ★ ☰ bleiben erlaubt
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{23F0}-\u{23FF}]/gu;
const ALLOWED = new Set(['✓', '✕', '★', '☆', '♥', '♡', '☰', '❚']);

test('Keine bunten Emojis mehr in der Oberfläche (statt dessen flache Icons)', () => {
  const found: string[] = [];
  for (const f of files(SRC)) {
    if (f.endsWith('components/Icon.tsx')) continue; // Zuordnung alter Emoji-Symbole
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const hits = (l.match(EMOJI) ?? []).filter((c) => !ALLOWED.has(c));
      if (hits.length) found.push(`${f.replace(SRC, '')}:${i + 1} ${hits.join('')}`);
    });
  }
  expect(found).toEqual([]);
});

test('Alte Supplement-Emojis werden auf Icons abgebildet', () => {
  expect(iconFor('⚡')).toBe('bolt');
  expect(iconFor('☀️')).toBe('sun');
  expect(iconFor('bolt')).toBe('bolt');
  expect(iconFor('🦄')).toBe('pill');
  expect(ICON_NAMES).toContain('coin');
});

test('Aktivitäten im Rückblick: nur Training und Supplements', () => {
  const a = activities({
    from: '2026-11-03', to: '2026-11-05', kinds: ['workout', 'supp'],
    workouts: [{ id: 1, date: '2026-11-05' }, { id: 2, date: '2026-11-01' }], sets: [], exercises: new Map(),
    taken: { '2026-11-04': ['k'] }, suppNames: new Map([['k', 'Kreatin']]),
    water: { '2026-11-05': 1000 }, weights: [{ id: 1, date: '2026-11-05', weight_kg: 80 }], gymLog: [{ date: '2026-11-05', text: 'Rückwand gebaut' }],
    prs: [{ exercise: 'Bank', e1rm: 80 }],
  });
  expect(a.map((x) => [x.date, x.kind, x.icon])).toEqual([['2026-11-05', 'workout', 'dumbbell'], ['2026-11-04', 'supp', 'pill']]);
});
