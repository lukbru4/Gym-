import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { activeQuestions, addableFor, alternativesFor, answerLabel, generatePlan, isAnswered, isCustomized, QUESTIONS, withTemplateExercises, type Answers } from '../src/lib/plan';

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
  test('Aufteilung: Ganzkörper, Push/Pull/Beine und Oberkörper/Unterkörper', () => {
    const g = generatePlan({ ...base, days: '3', split: 'ganz' });
    expect(g.templates.map((t) => t.name)).toEqual(['Plan · Ganzkörper A', 'Plan · Ganzkörper B', 'Plan · Ganzkörper C']);
    const p = generatePlan({ ...base, days: '6', split: 'ppl' });
    expect(p.templates.map((t) => t.name)).toEqual(['Plan · Push A', 'Plan · Pull A', 'Plan · Beine A', 'Plan · Push B', 'Plan · Pull B', 'Plan · Beine B']);
    expect(p.week.length).toBe(6);
    const o = generatePlan({ ...base, days: '2', split: 'ob' });
    expect(o.templates.map((t) => t.name)).toEqual(['Plan · Oberkörper', 'Plan · Unterkörper']);
    expect(generatePlan({ ...base, days: '2', split: 'ppl' }).notes.join(' ')).toMatch(/mindestens 3/);
  });
  test('ausgewählte Übungen kommen in den Plan, alle Auswahl-Übungen gibt es im Katalog', () => {
    const opts = QUESTIONS.find((q) => q.id === 'fav')!.options!.map((o) => o[0]).filter((x) => x !== 'sonstiges');
    expect(opts.length).toBeGreaterThan(20);
    for (const n of opts) expect(catalog.has(n), n).toBe(true);
    const all = generatePlan({ ...base, days: '3', split: 'ppl', duration: '90', fav: ['Face Pulls', 'Hammercurls', 'Wadenheben'] }).templates.flatMap((t) => t.exercises.map((e) => e.name));
    for (const n of ['Face Pulls', 'Hammercurls', 'Wadenheben']) expect(all).toContain(n);
  });
  test('Fragen: Geräte-Frage nur bei „Zuhause mit Gewichten“, Antworten lesbar', () => {
    expect(activeQuestions({ place: 'gym' }).some((q) => q.id === 'equip')).toBe(false);
    expect(activeQuestions({ place: 'homeDb' }).some((q) => q.id === 'equip')).toBe(true);
    const q = QUESTIONS.find((x) => x.id === 'goal')!;
    expect(answerLabel(q, { goal: 'kraft' })).toBe('Stärker werden');
  });

  test('Einsteiger mit 3 Tagen → Ganzkörper, Fortgeschrittene → Push/Pull/Beine', () => {
    expect(generatePlan({ ...base, exp: 'neu' }).templates.map((t) => t.name)).toEqual(['Plan · Ganzkörper A', 'Plan · Ganzkörper B', 'Plan · Ganzkörper C']);
    expect(generatePlan({ ...base, exp: 'profi' }).templates.map((t) => t.name)).toEqual(['Plan · Push', 'Plan · Pull', 'Plan · Beine']);
  });
  test('Sätze, Wiederholungsbereiche und Pausen passen zum Ziel und zur Übungsart', () => {
    const kraft = generatePlan({ ...base, goal: 'kraft', exp: 'mittel' }).templates[0].exercises[0];
    expect(kraft.range).toEqual([3, 6]);
    expect(kraft.rest).toBe(180);
    expect(kraft.sets.filter((s) => s.warmup).length).toBe(2); // zwei Aufwärmsätze
    expect(kraft.sets.filter((s) => !s.warmup).length).toBe(4);
    const muskel = generatePlan({ ...base, goal: 'muskel' }).templates[0].exercises;
    expect(muskel[0].range).toEqual([6, 10]);
    const iso = muskel.find((e) => /Seitheben|Curl|Trizeps|French|Fliegende|Butterfly/.test(e.name))!;
    expect(iso.range![0]).toBeGreaterThanOrEqual(10);
    expect(iso.rest!).toBeLessThan(muskel[0].rest!);
    // Anfänger: weniger Sätze, mindestens 8 Wiederholungen
    const neu = generatePlan({ ...base, exp: 'neu' }).templates[0].exercises[0];
    expect(neu.sets.filter((s) => !s.warmup).length).toBe(2);
    expect(neu.range![0]).toBeGreaterThanOrEqual(8);
  });
  test('Ganzkörper mit Fokus Arme enthält trotzdem Beine, Brust und Rücken', () => {
    const p = generatePlan({ ...base, exp: 'basis', days: '2', duration: '45', focus: ['arme'] });
    for (const t of p.templates) {
      const muscles = t.exercises.flatMap((e) => e.muscles);
      expect(muscles, t.name).toEqual(expect.arrayContaining(['beine', 'brust', 'ruecken']));
      expect(muscles, t.name).toContain('arme');
    }
  });
  test('geschätzte Dauer überschreitet die gewünschte Zeit nicht', () => {
    for (const duration of ['30', '45', '60', '90'])
      for (const goal of ['kraft', 'muskel', 'fit'])
        for (const t of generatePlan({ ...base, goal, duration, exp: 'mittel', intensity: 'hart' }).templates) {
          expect(t.minutes, `${t.name} ${goal} ${duration}`).toBeLessThanOrEqual(Number(duration) + 8);
          expect(t.exercises.length).toBeGreaterThanOrEqual(3);
        }
  });
  test('Wochenvolumen und Hinweise', () => {
    const p = generatePlan({ ...base, days: '4' });
    expect(p.volume.map((v) => v.group)).toEqual(expect.arrayContaining(['Brust', 'Rücken', 'Beine & Gesäß']));
    expect(p.volume.every((v) => v.sets > 0)).toBe(true);
    expect(p.notes.join(' ')).toMatch(/Doppelte Progression/);
    expect(p.notes.join(' ')).toMatch(/Entlastungswoche/);
    const sport = generatePlan({ ...base, sports: ['hockey'], sportDays: '3', sportMin: '90' });
    expect(sport.notes.join(' ')).toMatch(/Sports außerhalb/);
  });
  test('neue Maschinen-Übungen kommen im Studio vor, zuhause ohne Geräte nicht', () => {
    const all = (a: Answers) => generatePlan(a).templates.flatMap((t) => t.exercises.map((e) => e.name));
    expect(all({ ...base, exp: 'neu', days: '6', duration: '90' }).some((n) => /Maschine|Kabel/.test(n))).toBe(true);
    expect(all({ ...base, place: 'homeBw', days: '6', duration: '90' }).some((n) => /Maschine|Kabel/.test(n))).toBe(false);
  });

  describe('Ausschließen und Geräte-Vorlieben', () => {
    const all = (a: Answers) => generatePlan(a).templates.flatMap((t) => t.exercises.filter((e) => !e.cardio).map((e) => e.name));
    const free = /^(Bankdrücken|Schrägbankdrücken|Kurzhantel-Bankdrücken|Kniebeuge|Kreuzheben|Rumänisches Kreuzheben|Langhantelrudern|Klimmzüge|Dips|Liegestütze|Ausfallschritte|Hammercurls|French Press|Crunches|Plank|Glute Bridge|Hyperextensions|Step-ups|Bulgarische Kniebeuge|Hip Thrust \(Langhantel\)|Schulterdrücken|Schulterdrücken \(Kurzhantel\)|Fliegende \(Kurzhantel\)|Kurzhantelrudern \(einarmig\))$/;
    test('kein Bankdrücken: die ganze Gruppe fehlt in jeder Vorlage', () => {
      for (const exp of ['neu', 'mittel', 'profi']) for (const days of ['2', '3', '4', '5']) {
        const n = all({ ...base, exp, days, duration: '90', avoid: ['grp:bank'] });
        expect(n.filter((x) => /Bankdrücken/.test(x))).toEqual([]);
      }
      expect(all({ ...base, days: '3', duration: '90' }).some((x) => /Bankdrücken/.test(x))).toBe(true);
    });
    test('einzelne Übung ausschließen, auch wenn sie als Wunsch gewählt ist', () => {
      const n = all({ ...base, fav: ['Kniebeuge'], avoid: ['Kniebeuge'], days: '3', duration: '90' });
      expect(n).not.toContain('Kniebeuge');
    });
    test('nur Maschinen und Kabelzüge: keine freien Gewichte, Plan bleibt gefüllt', () => {
      for (const days of ['2', '3', '4', '5']) {
        const p = generatePlan({ ...base, days, duration: '60', style: 'maschinen' });
        const n = p.templates.flatMap((t) => t.exercises.filter((e) => !e.cardio).map((e) => e.name));
        expect(n.filter((x) => free.test(x))).toEqual([]);
        for (const t of p.templates) expect(t.exercises.filter((e) => !e.cardio).length).toBeGreaterThanOrEqual(3);
      }
    });
    test('keine Maschinen: nichts mit Maschine oder Kabel', () => {
      const n = all({ ...base, days: '5', duration: '90', style: 'frei' });
      expect(n.filter((x) => /Maschine|Kabel|Butterfly|Latziehen|Beinpresse|Beinstrecker|Beinbeuger|Bauchmaschine/.test(x))).toEqual([]);
      expect(n.length).toBeGreaterThan(5);
    });
    test('ohne Langhantel', () => {
      const n = all({ ...base, days: '5', duration: '90', style: 'ohnelh' });
      expect(n).not.toContain('Bankdrücken');
      expect(n).not.toContain('Kniebeuge');
      expect(n).not.toContain('Kreuzheben');
      expect(n).not.toContain('Langhantelrudern');
    });
    test('Maschinen-Wunsch zuhause wird mit Hinweis ignoriert', () => {
      const p = generatePlan({ ...base, place: 'homeDb', equip: ['kh'], style: 'maschinen' });
      expect(p.notes.some((x) => /Maschinen gibt es nur im Fitnessstudio/.test(x))).toBe(true);
      expect(p.templates[0].exercises.length).toBeGreaterThan(0);
    });
    test('Standard ohne die neuen Angaben bleibt gleich', () => {
      expect(generatePlan({ ...base })).toEqual(generatePlan({ ...base, style: 'alles', avoid: [] }));
    });
    test('Fragen: Optionen und Beschriftung', () => {
      const avoid = QUESTIONS.find((q) => q.id === 'avoid')!;
      expect(avoid.options!.length).toBeGreaterThan(40);
      expect(avoid.options![0][0]).toBe('grp:bank');
      expect(answerLabel(avoid, { avoid: ['grp:bank'] })).toBe('Alle Bankdrück-Varianten');
      expect(answerLabel(avoid, { avoid: ['a', 'b', 'c', 'd'] })).toBe('4 Übungen ausgeschlossen');
    });
  });

  describe('Sonstiges', () => {
    const all = (a: Answers) => generatePlan(a).templates.flatMap((t) => t.exercises.filter((e) => !e.cardio).map((e) => e.name));
    test('jede Auswahlfrage hat „Sonstiges“, Bereichsfragen nicht', () => {
      for (const q of QUESTIONS) {
        if (q.type === 'range') expect(q.options).toBeUndefined();
        else expect(q.options!.at(-1)).toEqual(['sonstiges', 'Sonstiges …']);
      }
    });
    test('Sonstiges braucht einen Text', () => {
      const q = QUESTIONS.find((x) => x.id === 'pain')!;
      expect(isAnswered(q, { pain: ['sonstiges'] })).toBe(false);
      expect(isAnswered(q, { pain: ['sonstiges'], pain_other: ' Hüfte ' })).toBe(true);
      expect(isAnswered(q, { pain: ['knie'] })).toBe(true);
    });
    test('Beschriftung zeigt den eigenen Text', () => {
      const q = QUESTIONS.find((x) => x.id === 'pain')!;
      expect(answerLabel(q, { pain: ['knie', 'sonstiges'], pain_other: 'Hüfte' })).toBe('Knie, Sonstiges: Hüfte');
    });
    test('Sonstiges bei einer festen Frage ändert den Plan nicht, erzeugt aber einen Hinweis', () => {
      const plain = generatePlan({ ...base });
      const p = generatePlan({ ...base, goal: 'sonstiges', goal_other: 'Hyrox-Vorbereitung' });
      expect(p.templates.length).toBe(plain.templates.length);
      expect(p.notes.some((n) => n.includes('Hyrox-Vorbereitung') && n.includes('nicht automatisch'))).toBe(true);
    });
    test('Freitext bei „nicht machen“ schließt passende Übungen wirklich aus', () => {
      const p = generatePlan({ ...base, days: '3', duration: '90', avoid: ['sonstiges'], avoid_other: 'bankdrücken' });
      expect(all({ ...base, days: '3', duration: '90', avoid: ['sonstiges'], avoid_other: 'bankdrücken' }).filter((n) => /Bankdrücken/.test(n))).toEqual([]);
      expect(p.notes.some((n) => /als Ausschluss übernommen/.test(n))).toBe(true);
    });
    test('Freitext ohne passende Übung wird gemeldet', () => {
      const p = generatePlan({ ...base, fav: ['sonstiges'], fav_other: 'Zumba' });
      expect(p.notes.some((n) => n.includes('Zumba') && n.includes('nicht gefunden'))).toBe(true);
    });
  });

  describe('Trainings selbst zusammenstellen', () => {
    const ppl: Answers = { ...base, days: '3', split: 'ppl', duration: '60' };
    const push = 'Plan · Push';
    const namesOf = (a: Answers, t: string) => generatePlan(a).templates.find((x) => x.name === t)!.exercises.filter((e) => !e.cardio).map((e) => e.name);
    test('eigene Auswahl wird genau so übernommen (Reihenfolge, keine Kürzung)', () => {
      const pick = ['Butterfly', 'Dips', 'Seitheben', 'Trizepsdrücken am Kabel', 'Face Pulls', 'Cable Crossover (Kabelzug)', 'Schulterdrücken (Maschine)'];
      expect(namesOf(withTemplateExercises(ppl, push, pick), push)).toEqual(pick);
    });
    test('gespeicherte Auswahl mit alten Übungsnamen wird auf die neuen Namen umgeschrieben', () => {
      const a = withTemplateExercises(ppl, push, ['Bankdrücken', 'Schrägbank-Brustpresse (Maschine)', 'Fliegende (Kabel, stehend)']);
      expect(namesOf(a, push)).toEqual(['Bankdrücken', 'Brustpresse (Maschine, Schrägbank)', 'Cable Crossover (Kabelzug)']);
    });
    test('nachträglich ausgeschlossene Übung fällt aus der eigenen Auswahl', () => {
      const a = withTemplateExercises({ ...ppl, avoid: ['grp:bank'] }, push, ['Bankdrücken', 'Dips', 'Seitheben']);
      expect(namesOf(a, push)).toEqual(['Dips', 'Seitheben']);
    });
    test('Zurücksetzen stellt die Automatik wieder her', () => {
      const a = withTemplateExercises(ppl, push, ['Dips']);
      expect(isCustomized(a, push)).toBe(true);
      const back = withTemplateExercises(a, push, null);
      expect(isCustomized(back, push)).toBe(false);
      expect(namesOf(back, push)).toEqual(namesOf(ppl, push));
    });
    test('Alternativen: keine ausgeschlossenen und keine schon gewählten, empfohlene zuerst', () => {
      const a = { ...ppl, avoid: ['grp:bank'] };
      const first = namesOf(a, push)[0];
      const alt = alternativesFor(a, push, first);
      const all = [...alt.recommended, ...alt.more].map((c) => c.name);
      expect(all.length).toBeGreaterThan(2);
      expect(all.filter((n) => /Bankdrücken/.test(n))).toEqual([]);
      for (const n of namesOf(a, push)) expect(all).not.toContain(n);
      expect(alt.recommended.every((c) => c.recommended)).toBe(true);
      expect(alt.more.every((c) => !c.recommended)).toBe(true);
    });
    test('Hinzufügen: nach Muskelgruppe gruppiert, nur erlaubte Übungen', () => {
      const groups = addableFor({ ...ppl, style: 'maschinen', avoid: ['grp:bank'] }, push);
      expect(groups.length).toBeGreaterThan(3);
      const names = groups.flatMap((g) => g.items.map((c) => c.name));
      expect(names).not.toContain('Kniebeuge');
      expect(names.filter((n) => /Bankdrücken/.test(n))).toEqual([]);
      expect(names).toContain('Beinpresse');
    });
    test('Sonstiges bleibt die letzte Option', () => {
      for (const q of QUESTIONS) if (q.options) expect(q.options.at(-1)![0]).toBe('sonstiges');
    });
  });

  test('Hinzufügen nutzt den ganzen Katalog: „hintere Schulter“ liefert viele Übungen', async () => {
    const { matchesSearch } = await import('../src/lib/searchTerms');
    const { CATALOG_MUSCLES } = await import('../src/lib/exerciseCatalog');
    const all = addableFor({ ...base, days: '3', split: 'ppl' }, 'Plan · Push').flatMap((g) => g.items);
    const rear = all.filter((c) => matchesSearch('hintere schulter', c.name, CATALOG_MUSCLES[c.name] ?? []));
    expect(rear.length).toBeGreaterThanOrEqual(15);
    expect(all.length).toBeGreaterThan(400);
  });
  test('„kein Bankdrücken“ sperrt alle Bankdrück-Varianten im Katalog', () => {
    const all = addableFor({ ...base, avoid: ['grp:bank'] }, 'Plan · Ganzkörper A').flatMap((g) => g.items.map((c) => c.name));
    expect(all.filter((n) => /bankdrücken/i.test(n))).toEqual([]);
  });
});
