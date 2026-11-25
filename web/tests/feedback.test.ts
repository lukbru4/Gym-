import { beforeEach, describe, expect, test } from 'vitest';
import { getFeedback, previousFeedback, setFeedback } from '../src/lib/feedback';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 } as Storage;
});

describe('Rückmeldung', () => {
  test('speichern und lesen je Übung und Konto', () => {
    setFeedback('u1', 5, '2026-10-01', 'easy');
    expect(getFeedback('u1', 5)).toEqual({ value: 'easy', date: '2026-10-01' });
    expect(getFeedback('u1', 6)).toBeNull();
    expect(getFeedback('u2', 5)).toBeNull();
  });
  test('für den Vorschlag zählt nur eine Rückmeldung von einem früheren Tag', () => {
    setFeedback('u1', 5, '2026-10-01', 'hard');
    expect(previousFeedback('u1', 5, '2026-10-01')).toBeNull();
    expect(previousFeedback('u1', 5, '2026-10-03')).toBe('hard');
  });
  test('neuere Rückmeldung überschreibt die alte', () => {
    setFeedback('u1', 5, '2026-10-01', 'hard');
    setFeedback('u1', 5, '2026-10-08', 'ok');
    expect(getFeedback('u1', 5)?.value).toBe('ok');
  });
});
