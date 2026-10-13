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
