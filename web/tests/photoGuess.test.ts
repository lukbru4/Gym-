import { describe, expect, test } from 'vitest';
import { describeTarget, foodItemOf, PHOTO_LABELS, softmax, topGuesses } from '../src/lib/photoGuess';

describe('Gratis-Fotoerkennung: Begriffe und Auswertung', () => {
  test('jedes Ziel gibt es als Gericht oder Lebensmittel, keine doppelten Beschreibungen', () => {
    const prompts = new Set<string>();
    for (const [prompt, target] of PHOTO_LABELS) {
      expect(describeTarget(target), target).not.toBeNull();
      expect(prompts.has(prompt), prompt).toBe(false);
      prompts.add(prompt);
    }
    expect(PHOTO_LABELS.length).toBeGreaterThanOrEqual(100);
  });
  test('beste 3 verschiedene Treffer mit Portion und kcal', () => {
    const probs = PHOTO_LABELS.map(() => 0);
    const at = (t: string) => PHOTO_LABELS.findIndex(([, x]) => x === t);
    probs[at('dish:spaghetti-bolognese')] = 0.6;
    probs[at('dish:lasagne-teller')] = 0.25;
    probs[at('food:banane')] = 0.1;
    const top = topGuesses(probs);
    expect(top.map((g) => g.target)).toEqual(['dish:spaghetti-bolognese', 'dish:lasagne-teller', 'food:banane']);
    expect(top[0].name).toBe('Spaghetti Bolognese');
    expect(top[0].kcal).toBeGreaterThan(300);
    expect(top[2].grams).toBeGreaterThan(50);
  });
  test('Lebensmittel als Eintrag mit Portion, Gerichte nicht', () => {
    expect(foodItemOf('food:banane')).toMatchObject({ name: 'Banane' });
    expect(foodItemOf('dish:pad-thai')).toBeNull();
  });
  test('softmax ergibt Wahrscheinlichkeiten', () => {
    const p = softmax([1, 2, 3]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[2]).toBeGreaterThan(p[0]);
  });
});
