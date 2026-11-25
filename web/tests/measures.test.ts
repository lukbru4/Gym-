import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { cleanMeasure, hasValues, latestValues, measureSummary, measureTrend, type Measure } from '../src/lib/measures';
import { create } from '../src/data/local';
import { activities } from '../src/lib/activity';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage; };

describe('Körpermaße', () => {
  test('Werte prüfen: Komma, Grenzen, unbekannte Felder', () => {
    expect(cleanMeasure({ waist: '82,5', arm: 37, bodyfat: 90, chest: 'x', evil: 5, hips: '' })).toEqual({ waist: 82.5, arm: 37 });
    expect(hasValues({})).toBe(false);
    expect(hasValues({ waist: 80 })).toBe(true);
  });
  test('Verlauf: weniger Taille ist gut, mehr Arm ist gut', () => {
    const list: Measure[] = [
      { id: 1, date: '2026-09-01', waist: 86, arm: 36 },
      { id: 2, date: '2026-10-01', waist: 84 },
      { id: 3, date: '2026-11-01', waist: 82.5, arm: 37.5 },
    ];
    expect(measureTrend(list, 'waist')).toMatchObject({ change: -3.5, good: true, first: { date: '2026-09-01' } });
    expect(measureTrend(list, 'arm')).toMatchObject({ change: 1.5, good: true });
    expect(measureTrend(list, 'calf')).toBeNull();
    expect(latestValues(list)).toEqual({ waist: 82.5, arm: 37.5 });
    expect(measureSummary({ waist: 82.5, arm: 37.5 })).toBe('Taille 82,5 cm, Oberarm 37,5 cm');
  });
  test('Lokal gespeichert, pro Tag ein Eintrag, im Backup enthalten', async () => {
    const s = mem();
    const api = create(s);
    await api.progress.saveMeasure('2026-11-01', { waist: 84 });
    await api.progress.saveMeasure('2026-11-01', { waist: 83, arm: 37 });
    const list = await api.progress.listMeasures();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ date: '2026-11-01', waist: 83, arm: 37 });
    expect(api.exportData!().body_measures).toHaveLength(1);
    expect(JSON.parse(s.getItem('gym-tracker-data')!).body_measures[0].waist).toBe(83);
    await api.progress.deleteMeasure(list[0].id);
    expect(await api.progress.listMeasures()).toEqual([]);
    expect(api.progress.canShare).toBe(false);
  });
  test('Aktivitäten: eigenes Symbol für Fotos und Maße', () => {
    const a = activities({ from: '2026-11-01', to: '2026-11-03', workouts: [], sets: [], exercises: new Map(), gymLog: [{ date: '2026-11-02', text: '📷 Fortschritts-Foto (Vorne)' }, { date: '2026-11-02', text: 'Rückwand gebaut' }] });
    expect(a.map((x) => [x.icon, x.text])).toEqual([['camera', 'Fortschritts-Foto (Vorne)'], ['brick', 'Rückwand gebaut']]);
  });
  test('Datenbank 68: Tabellen, privater Speicher, nur eigene Zeilen, Freunde nur geteilte Fotos', () => {
    const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
    expect(sql).toMatch(/create table if not exists public\.body_measures/);
    expect(sql).toMatch(/create policy "body_measures: nur eigene" on public\.body_measures for all to authenticated\s+using \(user_id = auth\.uid\(\)\)/);
    expect(sql).toMatch(/values \('progress-photos', 'progress-photos', false, 1048576/);
    expect(sql).toMatch(/where p\.user_id = p_user and p\.shared and p_user <> auth\.uid\(\) and public\.can_see\(auth\.uid\(\), p_user\)/);
    expect(sql).toMatch(/revoke insert, update, delete on public\.progress_photos from authenticated/);
  });
});

import { isMissingSchema } from '../src/data/progress';
test('Fehlendes Datenbank-Update wird erkannt', () => {
  expect(isMissingSchema({ code: 'PGRST205', message: "Could not find the table 'public.progress_photos' in the schema cache" })).toBe(true);
  expect(isMissingSchema({ code: 'PGRST202', message: 'Could not find the function public.add_progress_photo' })).toBe(true);
  expect(isMissingSchema({ code: '42P01', message: 'relation "public.body_measures" does not exist' })).toBe(true);
  expect(isMissingSchema(new Error('Bucket not found'))).toBe(true);
  expect(isMissingSchema(new Error('Failed to fetch'))).toBe(false);
  expect(isMissingSchema(null)).toBe(false);
});

import { comparablePoses, defaultPair } from '../src/lib/measures';
test('Vorher/Nachher nur mit gleicher Pose und an verschiedenen Tagen', () => {
  const ph = (id: string, date: string, pose: 'front' | 'side') => ({ id, date, pose, shared: false });
  expect(comparablePoses([ph('a', '2026-11-01', 'front'), ph('b', '2026-11-01', 'front')])).toEqual([]);
  expect(comparablePoses([ph('a', '2026-10-01', 'front'), ph('b', '2026-11-01', 'side')])).toEqual([]);
  const list = [ph('a', '2026-09-01', 'front'), ph('b', '2026-10-01', 'side'), ph('c', '2026-10-02', 'front'), ph('d', '2026-11-03', 'side'), ph('e', '2026-11-03', 'side')];
  expect(comparablePoses(list)).toEqual(['side', 'front']);
  expect(defaultPair(list, 'front')).toEqual(['a', 'c']);
  expect(defaultPair(list, 'side')).toEqual(['b', 'e']);
  expect(defaultPair([ph('x', '2026-11-03', 'front'), ph('y', '2026-11-03', 'front')], 'front')).toBeNull();
});
