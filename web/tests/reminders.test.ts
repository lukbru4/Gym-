import { describe, expect, test } from 'vitest';
import { buildSchedule, dueHint, DEFAULTS, type ReminderSettings } from '../src/lib/reminders';
import { ago, describe as describeNotif } from '../src/lib/notifications';

// Mittwoch, 14.10.2026, 10:00
const now = new Date(2026, 9, 14, 10, 0);
const week = [{ day: 'Mo', template: 'Push' }, { day: 'Mi', template: 'Pull' }, { day: 'Fr', template: 'Beine' }];
const ctx = { now, week, trainedToday: false, weekDone: 1, weekGoal: 3, pro: true };
const on = (patch: Partial<ReminderSettings>): ReminderSettings => ({ ...DEFAULTS, ...patch });

describe('Erinnerungen planen', () => {
  test('alles aus → nichts geplant', () => {
    expect(buildSchedule(DEFAULTS, ctx)).toEqual([]);
  });
  test('Training an den Plantagen der nächsten 14 Tage, mit Namen des Trainings', () => {
    const list = buildSchedule(on({ training: { on: true, time: '17:30', days: null } }), ctx);
    expect(list).toHaveLength(6); // Mi, Fr, Mo, Mi, Fr, Mo
    expect(list[0].at).toEqual(new Date(2026, 9, 14, 17, 30));
    expect(list[0].body).toContain('Pull');
    expect(list.map((p) => p.at!.getDay())).toEqual([3, 5, 1, 3, 5, 1]);
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });
  test('heute schon trainiert → heute keine Erinnerung; vergangene Uhrzeit wird übersprungen', () => {
    const s = on({ training: { on: true, time: '17:30', days: null } });
    expect(buildSchedule(s, { ...ctx, trainedToday: true })[0].at!.getDay()).toBe(5);
    expect(buildSchedule(on({ training: { on: true, time: '08:00', days: null } }), ctx)[0].at!.getDay()).toBe(5);
  });
  test('eigene Tage statt Plan', () => {
    const list = buildSchedule(on({ training: { on: true, time: '18:00', days: ['Sa'] } }), ctx);
    expect(list.map((p) => p.at!.getDay())).toEqual([6, 6]);
  });
  test('Essen nur mit Pro, 3 tägliche Termine', () => {
    const s = on({ food: { on: true, times: ['08:30', '12:30', '19:00'] } });
    expect(buildSchedule(s, ctx).map((p) => p.daily)).toEqual([{ hour: 8, minute: 30 }, { hour: 12, minute: 30 }, { hour: 19, minute: 0 }]);
    expect(buildSchedule(s, { ...ctx, pro: false })).toEqual([]);
  });
  test('Wasser alle 2 Stunden von 9 bis 21 Uhr', () => {
    const list = buildSchedule(on({ water: { on: true, every: 2, from: '09:00', to: '21:00' } }), ctx);
    expect(list.map((p) => p.daily!.hour)).toEqual([9, 11, 13, 15, 17, 19, 21]);
  });
  test('Serie: Sonntag, nur wenn Wochenziel offen', () => {
    const s = on({ streak: { on: true, time: '18:00' } });
    expect(buildSchedule(s, ctx)[0].at).toEqual(new Date(2026, 9, 18, 18, 0));
    expect(buildSchedule(s, { ...ctx, weekDone: 3 })).toEqual([]);
  });
  test('Hinweis auf der Startseite ab 1 Stunde vor der Uhrzeit an Trainingstagen', () => {
    const s = on({ training: { on: true, time: '11:00', days: null } });
    expect(dueHint(s, ctx)?.text).toContain('Pull');
    expect(dueHint(s, { ...ctx, trainedToday: true })).toBeNull();
    expect(dueHint(on({ training: { on: true, time: '18:00', days: null } }), ctx)).toBeNull();
  });
});

describe('Mitteilungen', () => {
  test('Texte und Ziele', () => {
    const base = { at: '2026-10-14T09:55:00Z', actor: 'u1', actor_name: 'Anna', workout_id: 7, challenge_id: null, body: null, unread: true };
    expect(describeNotif({ ...base, kind: 'like' })).toMatchObject({ text: 'Anna hat dein Training angefeuert', href: '#/training/7' });
    expect(describeNotif({ ...base, kind: 'friend_accepted' }).href).toBe('#/freunde/profil/u1');
    expect(describeNotif({ ...base, kind: 'challenge_invite', body: 'sets' }).text).toContain('Sätze');
  });
  test('Zeitangabe', () => {
    const t = Date.parse('2026-10-14T10:00:00Z');
    expect(ago('2026-10-14T09:55:00Z', t)).toBe('vor 5 Min.');
    expect(ago('2026-10-14T07:00:00Z', t)).toBe('vor 3 Std.');
    expect(ago('2026-10-13T09:00:00Z', t)).toBe('gestern');
  });
});
