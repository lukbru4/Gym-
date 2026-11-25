// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { cleanSnapshot, cloudKey, mergeSnapshots, startCloudSettings, trimSnapshot, type Snapshot } from '../src/lib/cloudSettings';

describe('Welche Einstellungen ins Konto kommen', () => {
  test('feste und kontobezogene Schlüssel, Ausschlüsse', () => {
    expect(cloudKey('gym-tracker-reminders', 'u1', '2026-11-04')).toBe('gym-tracker-reminders');
    expect(cloudKey('gym-tracker-supps:u1', 'u1', '2026-11-04')).toBe('gym-tracker-supps:{uid}');
    expect(cloudKey('gym-tracker-supps:u2', 'u1', '2026-11-04')).toBeNull();
    expect(cloudKey('gym-tracker-nutrition-plan-u1', 'u1', '2026-11-04')).toBe('gym-tracker-nutrition-plan-{uid}');
    for (const k of ['gym-tracker-draft', 'gym-tracker-data', 'gym-tracker-rest', 'gym-tracker-test-noschema', 'gym-tracker-was-admin', 'sb-xyz-auth-token'])
      expect(cloudKey(k, 'u1', '2026-11-04')).toBeNull();
  });
  test('Wasser nur die letzten 60 Tage', () => {
    expect(cloudKey('gym-tracker-water-u1-2026-11-01', 'u1', '2026-11-04')).toBe('gym-tracker-water-{uid}-2026-11-01');
    expect(cloudKey('gym-tracker-water-u1-2026-08-01', 'u1', '2026-11-04')).toBeNull();
  });
});

describe('Zusammenführen', () => {
  test('neuerer Stand gewinnt, bei Gleichstand das Konto', () => {
    const device: Snapshot = { a: { v: 'alt', t: 1 }, b: { v: 'neu', t: 50 }, c: { v: 'nur Gerät', t: 5 } };
    const cloud: Snapshot = { a: { v: 'Konto', t: 1 }, b: { v: 'alt', t: 10 }, d: { v: 'nur Konto', t: 3 } };
    const r = mergeSnapshots(device, cloud);
    expect(r.toDevice).toEqual({ a: { v: 'Konto', t: 1 }, d: { v: 'nur Konto', t: 3 } });
    expect(r.merged.b.v).toBe('neu');
    expect(r.merged.c.v).toBe('nur Gerät');
    expect(r.changedCloud).toBe(true);
  });
  test('Größenbegrenzung lässt alte Wasserwerte zuerst weg', () => {
    const s: Snapshot = { 'gym-tracker-reminders': { v: 'x', t: 1 } };
    for (let i = 0; i < 250; i++) s[`gym-tracker-water-{uid}-d${i}`] = { v: '500', t: i };
    const t = trimSnapshot(s);
    expect(Object.keys(t).length).toBe(200);
    expect(t['gym-tracker-reminders']).toBeTruthy();
    expect(t['gym-tracker-water-{uid}-d0']).toBeUndefined();
  });
  test('Daten aus dem Konto werden geprüft', () => {
    expect(cleanSnapshot({ 'gym-tracker-a': { v: 'x', t: 2 }, evil: { v: 'x', t: 1 }, 'gym-tracker-b': { v: 5, t: 1 } })).toEqual({ 'gym-tracker-a': { v: 'x', t: 2 } });
    expect(cleanSnapshot([1])).toEqual({});
  });
});

describe('Neuinstallation: Einstellungen kommen aus dem Konto zurück', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  test('leeres Gerät bekommt Supplements und Erinnerungen, Gerät-Änderungen gehen ins Konto', async () => {
    let stored: Snapshot = {
      'gym-tracker-supps:{uid}': { v: '[{"name":"Kreatin"}]', t: 100 },
      'gym-tracker-reminders': { v: '{"training":{"on":true}}', t: 100 },
    };
    const api = { mySettings: async () => stored, setMySettings: async (s: Snapshot) => { stored = s; } };
    const reload = { called: 0 };
    const orig = window.location;
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: () => { reload.called++; } }, writable: true });
    await startCloudSettings(api, 'u1');
    expect(localStorage.getItem('gym-tracker-supps:u1')).toBe('[{"name":"Kreatin"}]');
    expect(localStorage.getItem('gym-tracker-reminders')).toBe('{"training":{"on":true}}');
    expect(reload.called).toBe(1);
    // neue Änderung auf dem Gerät → ins Konto
    localStorage.setItem('gym-tracker-week-goal', '4');
    const { pushNow } = await import('../src/lib/cloudSettings');
    await pushNow();
    expect(stored['gym-tracker-week-goal'].v).toBe('4');
    expect(stored['gym-tracker-supps:{uid}'].v).toBe('[{"name":"Kreatin"}]');
    Object.defineProperty(window, 'location', { value: orig, writable: true });
  });
});

