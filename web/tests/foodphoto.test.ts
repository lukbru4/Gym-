import { describe, expect, test } from 'vitest';
import { parseFoodJson } from '../../supabase/functions/food-photo/parse';

describe('KI-Antwort für Essensfotos prüfen', () => {
  test('saubere Antwort', () => {
    const r = parseFoodJson('{"items":[{"name":"Spaghetti Bolognese","grams":350,"kcal":620,"protein":28,"carbs":78,"fat":20}],"confidence":"medium","note":"Soße nicht ganz sichtbar"}')!;
    expect(r.items).toEqual([{ name: 'Spaghetti Bolognese', grams: 350, kcal: 620, protein: 28, carbs: 78, fat: 20 }]);
    expect(r.confidence).toBe('medium');
    expect(r.note).toBe('Soße nicht ganz sichtbar');
  });
  test('Text drumherum und Codeblock werden toleriert', () => {
    const r = parseFoodJson('Hier ist die Schätzung:\n```json\n{"items":[{"name":"Apfel","grams":"180","kcal":"94,5","protein":0.5,"carbs":25,"fat":0.3}],"confidence":"high"}\n```')!;
    expect(r.items[0]).toMatchObject({ name: 'Apfel', grams: 180, kcal: 94.5 });
    expect(r.confidence).toBe('high');
    expect(r.note).toBe('');
  });
  test('unbrauchbare Einträge und unmögliche Werte werden aussortiert bzw. begrenzt', () => {
    const r = parseFoodJson('{"items":[{"name":"","grams":100,"kcal":50},{"name":"Zahlenfehler","grams":"viel","kcal":50},{"name":"Riesig","grams":99999,"kcal":999999,"protein":-5},null,"x"],"confidence":"sicher"}')!;
    expect(r.items).toEqual([{ name: 'Riesig', grams: 3000, kcal: 5000, protein: 0, carbs: 0, fat: 0 }]);
    expect(r.confidence).toBe('low');
  });
  test('kein Essen / kaputte Antwort', () => {
    expect(parseFoodJson('{"items":[],"confidence":"high"}')!.items).toEqual([]);
    expect(parseFoodJson('Das sieht lecker aus!')).toBeNull();
    expect(parseFoodJson('{"items": [')).toBeNull();
    expect(parseFoodJson('{"foo":1}')).toBeNull();
  });
  test('höchstens 12 Einträge, Namen gekürzt', () => {
    const many = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ name: 'x'.repeat(200) + i, grams: 10, kcal: 10 })) });
    const r = parseFoodJson(many)!;
    expect(r.items.length).toBe(12);
    expect(r.items[0].name.length).toBe(80);
  });
});

describe('Edge Functions', () => {
  test('beide index.ts enthalten den getesteten Parser unverändert', async () => {
    const { readFileSync } = await import('node:fs');
    const parse = readFileSync(new URL('../../supabase/functions/food-photo/parse.ts', import.meta.url), 'utf8').split('\n').slice(1).join('\n').replace(/export (interface|function)/g, '$1').trim();
    for (const fn of ['food-photo', 'food-chat']) {
      const index = readFileSync(new URL(`../../supabase/functions/${fn}/index.ts`, import.meta.url), 'utf8');
      expect(index, fn).toContain(parse);
      expect(index, fn).not.toMatch(/claude-[a-z0-9-]+/); // Modellname kommt aus dem Secret FOOD_MODEL
      expect(index, fn).not.toMatch(/sk-ant-/);
    }
  });
});

import { parseChatJson } from '../../supabase/functions/food-photo/parse';
describe('Essens-Chat: Antwort der KI prüfen', () => {
  test('Rückfrage mit Schnellantworten', () => {
    const r = parseChatJson('{"reply":"Wie groß war die Pizza?","ready":false,"items":[],"suggestions":["Klein","Normal","Groß","Familie","zu viele"]}')!;
    expect(r).toEqual({ reply: 'Wie groß war die Pizza?', ready: false, items: [], suggestions: ['Klein', 'Normal', 'Groß', 'Familie'] });
  });
  test('fertiger Vorschlag mit geprüften Zahlen', () => {
    const r = parseChatJson('{"reply":"Passt das so?","ready":true,"items":[{"name":"Pizza Margherita","grams":"350","kcal":950,"protein":38,"carbs":110,"fat":36},{"name":"","grams":1,"kcal":1}],"suggestions":["Ja","Ändern"]}')!;
    expect(r.ready).toBe(true);
    expect(r.items).toEqual([{ name: 'Pizza Margherita', grams: 350, kcal: 950, protein: 38, carbs: 110, fat: 36 }]);
  });
  test('„fertig“ ohne brauchbare Einträge gilt nicht als fertig', () => {
    expect(parseChatJson('{"reply":"ok","ready":true,"items":[]}')!.ready).toBe(false);
    expect(parseChatJson('{"reply":"ok","ready":false,"items":[{"name":"Apfel","grams":100,"kcal":52}]}')!.items).toEqual([]);
  });
  test('Text ohne JSON wird als normale Antwort genommen; leer = null', () => {
    expect(parseChatJson('Erzähl mir mehr!')).toEqual({ reply: 'Erzähl mir mehr!', ready: false, items: [], suggestions: [] });
    expect(parseChatJson('   ')).toBeNull();
    expect(parseChatJson('{"reply": ')!.reply).toBe('{"reply":');
  });
});
