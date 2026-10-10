import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CATALOG, keywordsOf } from '../src/lib/exerciseCatalog';
import { filterExercises, MUSCLES } from '../src/lib/muscles';
import { create, migrate } from '../src/data/local';
import type { Exercise } from '../src/lib/types';

const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');

describe('Übungskatalog', () => {
  test('Namen eindeutig, Muskeln gültig, Stichwörter vorhanden', () => {
    const seen = new Set<string>();
    const ids = new Set(MUSCLES.map(([id]) => id));
    for (const c of CATALOG) {
      expect(seen.has(c.name.toLowerCase()), c.name).toBe(false);
      seen.add(c.name.toLowerCase());
      expect(c.keywords.length, c.name).toBeGreaterThan(3);
      if (c.type === 'strength') expect(c.muscles.length, c.name).toBeGreaterThan(0);
      for (const m of c.muscles) expect(ids.has(m), `${c.name}: ${m}`).toBe(true);
    }
    expect(CATALOG.length).toBeGreaterThanOrEqual(1000);
  });
  test('schema.sql enthält genau die Übungen des Katalogs (mit gleichen Muskeln)', () => {
    const block = sql.slice(sql.indexOf('insert into public.exercises (user_id, name, type, muscles) values'));
    const rows = [...block.slice(0, block.indexOf('on conflict')).matchAll(/\(null, '([^']*)', '(\w+)', '\{([^}]*)\}'\)/g)];
    expect(rows.length).toBe(CATALOG.length);
    rows.forEach((r, i) => {
      expect(r[1]).toBe(CATALOG[i].name);
      expect(r[2]).toBe(CATALOG[i].type);
      expect(r[3].split(',').filter(Boolean)).toEqual(CATALOG[i].muscles);
    });
  });
  test('die bisherigen 32 Standardübungen stehen unverändert am Anfang', () => {
    expect(CATALOG.slice(0, 5).map((c) => c.name)).toEqual(['Bankdrücken', 'Schrägbankdrücken', 'Kurzhantel-Bankdrücken', 'Butterfly', 'Dips']);
    expect(CATALOG[31].name).toBe('Laufen (draußen)');
  });
  test('Suche über Stichwörter: Preacher Curl Maschine findet die Scott-Curl-Maschine', () => {
    const ex: Exercise[] = CATALOG.map((c, i) => ({ id: i + 1, name: c.name, type: c.type, user_id: null, muscles: c.muscles }));
    const names = (q: string) => filterExercises(ex, { query: q }).map((e) => e.name);
    expect(names('preacher curl maschine')).toContain('Scott-Curls (Maschine)');
    expect(names('Bizepsmaschine')).toContain('Scott-Curls (Maschine)');
    expect(names('schulterdrücken maschine')).toEqual(expect.arrayContaining(['Schulterdrücken (Maschine)']));
    expect(names('schulterdrücken maschine')).not.toContain('Schulterdrücken (Kurzhantel)');
    expect(keywordsOf('SCOTT-CURLS (MASCHINE)')).toContain('Preacher');
  });
  test('Lokale Daten aus Version 2 bekommen die neuen Übungen, eigene bleiben, nichts doppelt', () => {
    const old = { version: 2, nextId: 40, exercises: [{ id: 1, name: 'Bankdrücken', type: 'strength' as const, user_id: null, muscles: ['brust' as const] }, { id: 39, name: 'Arnold Press', type: 'strength' as const, user_id: 'local', muscles: [] }], workouts: [], sets: [], body_weights: [], templates: [] };
    const m = migrate(old as never);
    expect(m.version).toBe(4);
    expect(m.exercises.filter((e) => e.name.toLowerCase() === 'arnold press').length).toBe(1);
    expect(m.exercises.filter((e) => e.name === 'Bankdrücken').length).toBe(1);
    expect(m.exercises.length).toBe(CATALOG.length + 1 - 1 + 0); // alle Katalog-Übungen + (eigene Arnold Press ersetzt den Katalogeintrag)
    expect(new Set(m.exercises.map((e) => e.id)).size).toBe(m.exercises.length);
    expect(m.nextId).toBeGreaterThan(Math.max(...m.exercises.map((e) => e.id)));
    expect(create).toBeTypeOf('function');
  });
  test('Filter: Art (Kraft/Cardio) und mehrere Muskelgruppen', () => {
    const ex: Exercise[] = CATALOG.map((c, i) => ({ id: i + 1, name: c.name, type: c.type, user_id: null, muscles: c.muscles }));
    const cardio = filterExercises(ex, { type: 'cardio' });
    expect(cardio.length).toBeGreaterThanOrEqual(10);
    expect(cardio.every((e) => e.type === 'cardio')).toBe(true);
    const kraft = filterExercises(ex, { type: 'strength' });
    expect(kraft.every((e) => e.type === 'strength')).toBe(true);
    expect(kraft.length + cardio.length).toBe(ex.length);
    const bizeps = filterExercises(ex, { muscles: ['bizeps'] });
    expect(bizeps.map((e) => e.name)).toContain('Scott-Curls (Maschine)');
    const both = filterExercises(ex, { muscles: ['bizeps', 'waden'] }).map((e) => e.name);
    expect(both).toEqual(expect.arrayContaining(['Scott-Curls (Maschine)', 'Wadenheben (sitzend)']));
    expect(both).not.toContain('Bankdrücken');
    // Kombination mit Suche und Kategorie
    expect(filterExercises(ex, { muscles: ['bizeps'], query: 'maschine' }).every((e) => e.name.toLowerCase().includes('maschine') || keywordsOf(e.name).toLowerCase().includes('maschine'))).toBe(true);
    expect(filterExercises(ex, { muscles: ['bizeps'], type: 'cardio' })).toEqual([]);
  });
});
