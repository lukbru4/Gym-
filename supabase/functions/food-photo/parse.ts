// Antwort der KI für ein Essensfoto prüfen und in saubere Zahlen bringen (ohne Abhängigkeiten, damit testbar).
export interface PhotoItem { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
export interface PhotoResult { items: PhotoItem[]; confidence: 'low' | 'medium' | 'high'; note: string }

const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
};

/** Nimmt den Text der KI (ggf. mit Drumherum oder Codeblock) und liefert geprüfte Werte – oder null, wenn nichts Brauchbares drin ist */
export function parseFoodJson(text: string): PhotoResult | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { items?: unknown }).items)) return null;
  const items: PhotoItem[] = [];
  for (const it of (raw as { items: unknown[] }).items.slice(0, 12)) {
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 80) : '';
    const grams = num(o.grams, 1, 3000);
    const kcal = num(o.kcal, 0, 5000);
    if (!name || grams === null || kcal === null) continue;
    items.push({ name, grams, kcal, protein: num(o.protein, 0, 500) ?? 0, carbs: num(o.carbs, 0, 1000) ?? 0, fat: num(o.fat, 0, 500) ?? 0 });
  }
  const c = (raw as { confidence?: unknown }).confidence;
  const note = (raw as { note?: unknown }).note;
  return { items, confidence: c === 'high' || c === 'medium' ? c : 'low', note: typeof note === 'string' ? note.trim().slice(0, 300) : '' };
}

export interface ChatTurn { reply: string; ready: boolean; items: PhotoItem[]; suggestions: string[] }

/** Antwort der KI im Essens-Chat: Text für den Nutzer, ggf. fertiger Eintragsvorschlag und Schnellantworten. Kein JSON → ganzer Text ist die Antwort. */
export function parseChatJson(text: string): ChatTurn | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  let raw: unknown = null;
  if (start >= 0 && end > start) {
    try {
      raw = JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      raw = null;
    }
  }
  if (!raw || typeof raw !== 'object' || typeof (raw as { reply?: unknown }).reply !== 'string') return { reply: trimmed.slice(0, 600), ready: false, items: [], suggestions: [] };
  const o = raw as { reply: string; ready?: unknown; items?: unknown; suggestions?: unknown };
  const items = o.ready === true ? (parseFoodJson(JSON.stringify({ items: o.items ?? [] }))?.items ?? []) : [];
  const suggestions = Array.isArray(o.suggestions) ? o.suggestions.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim().slice(0, 40)).slice(0, 4) : [];
  return { reply: o.reply.trim().slice(0, 600), ready: o.ready === true && items.length > 0, items, suggestions };
}
