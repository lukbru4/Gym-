import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { canonicalName, CATALOG, keywordsOf, RENAMED } from '../src/lib/exerciseCatalog';
import { filterExercises, matchesEquipment, MUSCLES } from '../src/lib/muscles';
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
    expect(m.version).toBe(5);
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

describe('Brust aufgeräumt (umbenannt, zusammengeführt, ausgebaut)', () => {
  const names = new Set(CATALOG.map((c) => c.name));
  test('alte Namen sind weg, Ziele gibt es im Katalog', () => {
    for (const [oldName, newName] of Object.entries(RENAMED)) {
      expect(names.has(oldName), oldName).toBe(false);
      expect(names.has(newName), newName).toBe(true);
    }
    expect(canonicalName('Negativ-Schrägbankdrücken')).toBe('Negativbankdrücken (Langhantel)');
    expect(canonicalName('Bankdrücken')).toBe('Bankdrücken');
  });
  test('schema.sql führt dieselben Umbenennungen durch', () => {
    for (const [oldName, newName] of Object.entries(RENAMED)) expect(sql).toContain(`('${oldName}', '${newName}')`);
  });
  test('alter Name bleibt als Suchwort erhalten, neue Brust-Übungen sind da', () => {
    expect(keywordsOf('Brustpresse (Kabel, stehend)')).toContain('Kabelzug-Brustdrücken (stehend)');
    for (const n of ['Squeeze Press (Kurzhantel)', 'Larsen Press (Langhantel)', 'Liegestütze (Hände erhöht)', 'Bankdrücken (Plattengerät)', 'Fliegende (Kabel, Schrägbank)']) expect(names.has(n), n).toBe(true);
    const brust = CATALOG.filter((c) => c.muscles[0] === 'brust');
    expect(brust.length).toBeGreaterThanOrEqual(90);
    expect(brust.some((c) => /burpee|calisthenics \((front|l-sit|v-sit|dragon)/i.test(c.name))).toBe(false);
  });
  test('Geräte-Erkennung mit Umlauten (Bankdrücken = Langhantel, Liegestütze = Körpergewicht)', () => {
    const ex = (name: string) => ({ id: 1, name, type: 'strength' as const, user_id: null, muscles: [] });
    expect(matchesEquipment(ex('Bankdrücken'), 'langhantel')).toBe(true);
    expect(matchesEquipment(ex('Schrägbankdrücken (Pause)'), 'langhantel')).toBe(true);
    expect(matchesEquipment(ex('Bankdrücken (Kurzhantel, Pause)'), 'langhantel')).toBe(false);
    expect(matchesEquipment(ex('Bankdrücken (Plattengerät)'), 'maschine')).toBe(true);
    expect(matchesEquipment(ex('Liegestütze (Klatsch)'), 'koerpergewicht')).toBe(true);
  });
  test('lokale Daten: Sätze und Vorlagen ziehen zur zusammengeführten Übung um, Umbenennung behält die ID', () => {
    const ex = CATALOG.map((c, i) => ({ id: i + 1, name: c.name, type: c.type, user_id: null, muscles: c.muscles }));
    const keep = ex.find((e) => e.name === 'Negativbankdrücken (Langhantel)')!;
    ex.push({ id: 5000, name: 'Negativ-Schrägbankdrücken', type: 'strength', user_id: null, muscles: ['brust'] });
    ex.push({ id: 5001, name: 'Fliegende (Schrägbank)', type: 'strength', user_id: null, muscles: ['brust'] });
    const withoutNew = ex.filter((e) => e.name !== 'Fliegende (Kurzhantel, Schrägbank)');
    const data = { version: 5, nextId: 6000, exercises: withoutNew, workouts: [], body_weights: [],
      sets: [{ id: 1, workout_id: 1, exercise_id: 5000, position: 0, reps: 8, weight_kg: 80, is_warmup: false }, { id: 2, workout_id: 1, exercise_id: 5001, position: 1, reps: 10, weight_kg: 12, is_warmup: false }],
      templates: [{ id: 1, name: 'T', exercises: [{ exercise_id: 5000, sets: [] }] }] };
    const m = migrate(data as never);
    expect(m.sets[0].exercise_id).toBe(keep.id);
    expect(m.templates[0].exercises[0].exercise_id).toBe(keep.id);
    expect(m.exercises.find((e) => e.id === 5001)!.name).toBe('Fliegende (Kurzhantel, Schrägbank)');
    expect(m.exercises.some((e) => e.name === 'Negativ-Schrägbankdrücken')).toBe(false);
    expect(m.exercises.filter((e) => !e.user_id).length).toBe(CATALOG.length);
  });
});
