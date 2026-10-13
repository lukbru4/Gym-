import { describe, expect, test } from 'vitest';
import { CATALOG } from '../src/lib/exerciseCatalog';
import { hasRegionTerm, matchesSearch } from '../src/lib/searchTerms';

const hits = (q: string) => CATALOG.filter((c) => c.type === 'strength' && matchesSearch(q, c.name, c.muscles)).map((c) => c.name);

describe('Suche nach Stichwörtern', () => {
  test('„hintere Schulter“ findet Face Pulls, Reverse Butterfly, vorgebeugtes Seitheben – nicht Bankdrücken oder Rudern', () => {
    const h = hits('hintere schulter');
    expect(h).toContain('Face Pulls');
    expect(h).toContain('Reverse Butterfly (Maschine)');
    expect(h).toContain('Seitheben (Kurzhantel, vorgebeugt)');
    expect(h).not.toContain('Bankdrücken');
    expect(h).not.toContain('Langhantelrudern');
    expect(h.some((n) => /Curl/i.test(n) && !/Reverse/.test(n))).toBe(false);
  });
  test('Umgangssprache und Umlaute: „po“, „gesass“, „breiter rücken“', () => {
    expect(hits('po')).toContain('Hip Thrust (Langhantel)');
    expect(hits('gesass').length).toBeGreaterThan(5);
    expect(hits('breiter rücken')).toContain('Latziehen');
  });
  test('Muskel-Synonyme: „hamstrings“ und „hintere oberschenkel“', () => {
    expect(hits('hamstrings')).toContain('Beinbeuger');
    expect(hits('hintere oberschenkel')).toContain('Rumänisches Kreuzheben');
    expect(hits('hintere oberschenkel')).not.toContain('Bizepscurls');
  });
  test('Beinbeuger (Leg Curl) ist keine Bizeps-Übung', () => {
    expect(hits('bizeps')).not.toContain('Beinbeuger');
  });
  test('Abdeckung: fast alle Kraftübungen bekommen einen Regionsbegriff', () => {
    const strength = CATALOG.filter((c) => c.type === 'strength');
    const missing = strength.filter((c) => !hasRegionTerm(c.name));
    expect(missing.length / strength.length).toBeLessThan(0.05);
  });
});

describe('Gerät + Muskel in einer Suche („Maschine Brust“)', () => {
  test('„Maschine Brust“ und „Brustmaschine“: Brustpresse, Butterfly, Plattengerät – nicht Kabel/Landmine oder Rudern mit Brustpolster', () => {
    for (const q of ['maschine brust', 'Brust Maschine', 'Brustmaschine']) {
      const h = hits(q);
      expect(h, q).toEqual(expect.arrayContaining(['Brustpresse (Maschine)', 'Butterfly', 'Bankdrücken (Plattengerät)', 'Brustpresse (Maschine, Schrägbank)', 'Butterfly (Maschine, Schrägbank)']));
      expect(h, q).not.toContain('Rudern (Maschine, Brustpolster)');
      expect(h.some((n) => /kabel|landmine|widerstandsband/i.test(n)), q).toBe(false);
    }
  });
  test('weitere Kombinationen finden nur Passendes', () => {
    expect(hits('kabel rücken')).toEqual(expect.arrayContaining(['Latziehen', 'Kabelrudern']));
    expect(hits('kabel rücken')).not.toContain('Aufrechtes Rudern (Kabel)');
    expect(hits('beine maschine')).toEqual(expect.arrayContaining(['Beinpresse', 'Beinstrecker', 'Beinbeuger', 'Wadenheben']));
    expect(hits('bizeps kabel').every((n) => /kabel|seil/i.test(n))).toBe(true);
    expect(hits('schulter maschine')).toContain('Schulterdrücken (Maschine)');
    expect(hits('schulter maschine').some((n) => /Brustpresse|\(Kabel/.test(n))).toBe(false);
    expect(hits('po maschine')).toEqual(expect.arrayContaining(['Hip Thrust (Maschine)', 'Abduktoren (Maschine)']));
    expect(hits('po maschine').some((n) => /Viking|Thruster|Widerstandsband/.test(n))).toBe(false);
    const bauch = hits('bauch ohne geräte');
    expect(bauch).toEqual(expect.arrayContaining(['Crunches', 'Plank']));
    expect(bauch.some((n) => /kabel|maschine/i.test(n))).toBe(false);
    expect(hits('nacken kurzhantel')).toEqual(expect.arrayContaining(['Schulterheben (Kurzhantel)', 'Kelso Shrugs (Kurzhantel)']));
    expect(hits('nacken kurzhantel').some((n) => /trizeps/i.test(n))).toBe(false);
  });
  test('jede Muskelgruppe mit Maschine, Kabel und Kurzhantel liefert Treffer', () => {
    for (const m of ['brust', 'rücken', 'schulter', 'bizeps', 'trizeps', 'bauch', 'po', 'beine', 'waden'])
      for (const g of ['maschine', 'kabel', 'kurzhantel']) if (!(m === 'waden' && g === 'kabel')) expect(hits(`${m} ${g}`).length, `${m} ${g}`).toBeGreaterThan(0);
  });
});

describe('Arme: Suche', () => {
  test('Griffkraft, Brachialis, langer Trizepskopf ohne Fehltreffer', () => {
    expect(hits('griffkraft')).toEqual(expect.arrayContaining(['Farmers Walk', 'Unterarmroller']));
    expect(hits('griffkraft').some((n) => /Bankdrücken|Plank|Latziehen/.test(n))).toBe(false);
    expect(hits('brachialis').some((n) => /Plattengerät|Bankdrücken/.test(n))).toBe(false);
    expect(hits('langer trizepskopf')).toEqual(expect.arrayContaining(['French Press', 'Überkopf-Trizepsstrecken (Kabel)']));
    expect(hits('langer trizepskopf').some((n) => /Tragen/.test(n))).toBe(false);
    expect(hits('bizeps kurzhantel').some((n) => /\(Kabel/.test(n))).toBe(false);
  });
});
