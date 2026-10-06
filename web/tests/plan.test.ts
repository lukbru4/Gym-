import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { activeQuestions, answerLabel, generatePlan, QUESTIONS, type Answers } from '../src/lib/plan';

const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
const catalog = new Set([...sql.matchAll(/\(null, '([^']+)', '(?:strength|cardio)'/g)].map((m) => m[1]));
const base: Answers = { goal: 'muskel', exp: 'mittel', days: '3', duration: '60', place: 'gym', focus: ['brust'], fav: [], pain: ['keine'], cardio: '0', intensity: 'mittel' };
const names = (p: ReturnType<typeof generatePlan>, t: number) => p.templates[t].exercises.map((e) => e.name);

describe('Trainingsplan aus dem Fragebogen', () => {
  test('alle Übungen gibt es im Standard-Katalog', () => {
    for (const days of ['1', '2', '3', '4', '5', '6'])
      for (const place of ['gym', 'homeDb', 'homeBw'])
        for (const cardio of ['0', '20']) {
          const p = generatePlan({ ...base, days, place, cardio, equip: ['kh'] });
          for (const t of p.templates) for (const e of t.exercises) expect(catalog.has(e.name), `${e.name} fehlt im Katalog`).toBe(true);
        }
  });
  test('3 Tage → Push, Pull, Beine; 60 Min. → 6 Übungen ohne Doppelte', () => {
    const p = generatePlan(base);
    expect(p.templates.map((t) => t.name)).toEqual(['Plan · Push', 'Plan · Pull', 'Plan · Beine']);
    for (let i = 0; i < 3; i++) {
      expect(names(p, i).length).toBe(6);
      expect(new Set(names(p, i)).size).toBe(6);
    }
    expect(p.weekGoal).toBe(3);
    expect(p.week.map((w) => w.day)).toEqual(['Mo', 'Mi', 'Fr']);
  });
  test('Beschwerden: Knie → keine Kniebeuge, Ausfallschritte, Beinpresse, Beinstrecker', () => {
    const p = generatePlan({ ...base, pain: ['knie'] });
    const all = p.templates.flatMap((t) => t.exercises.map((e) => e.name));
    for (const n of ['Kniebeuge', 'Ausfallschritte', 'Beinpresse', 'Beinstrecker']) expect(all).not.toContain(n);
    expect(p.notes.join(' ')).toMatch(/Beschwerden/);
  });
  test('ohne Geräte keine Hantelübungen', () => {
    const all = generatePlan({ ...base, place: 'homeBw' }).templates.flatMap((t) => t.exercises.map((e) => e.name));
    for (const n of ['Bankdrücken', 'Kniebeuge', 'Latziehen', 'Beinpresse']) expect(all).not.toContain(n);
    expect(all.length).toBeGreaterThan(3);
  });
  test('Lieblingsübung und Fokus kommen in den Plan', () => {
    expect(names(generatePlan({ ...base, fav: ['bank'] }), 0)).toContain('Bankdrücken');
    expect(names(generatePlan({ ...base, days: '2', duration: '30', focus: ['arme'] }), 0).some((n) => /curl|Trizeps|French|Dips/i.test(n))).toBe(true);
  });
  test('4 Tage → Oberkörper/Unterkörper A und B, gewählte Tage werden genutzt', () => {
    const p = generatePlan({ ...base, days: '4', weekdays: ['Di', 'Mi', 'Sa', 'So'] });
    expect(p.templates.map((t) => t.name)).toEqual(['Plan · Oberkörper A', 'Plan · Unterkörper A', 'Plan · Oberkörper B', 'Plan · Unterkörper B']);
    expect(p.week.map((w) => w.day)).toEqual(['Di', 'Mi', 'Sa', 'So']);
    expect(names(p, 0)).not.toEqual(names(p, 2));
  });
  test('Cardio wird angehängt; Aufwärmsatz nur bei der ersten Kraftübung', () => {
    const p = generatePlan({ ...base, cardio: '20' });
    const last = p.templates[0].exercises.at(-1)!;
    expect(last.cardio && last.sets[0].duration_min).toBe(20);
    expect(p.templates[0].exercises[0].sets[0].warmup).toBe(true);
    expect(p.templates[0].exercises[1].sets.some((s) => s.warmup)).toBe(false);
  });
  test('Fragen: Geräte-Frage nur bei „Zuhause mit Gewichten“, Antworten lesbar', () => {
    expect(activeQuestions({ place: 'gym' }).some((q) => q.id === 'equip')).toBe(false);
    expect(activeQuestions({ place: 'homeDb' }).some((q) => q.id === 'equip')).toBe(true);
    const q = QUESTIONS.find((x) => x.id === 'goal')!;
    expect(answerLabel(q, { goal: 'kraft' })).toBe('Stärker werden');
  });
});
