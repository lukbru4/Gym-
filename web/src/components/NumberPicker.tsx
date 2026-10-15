// Zahl auswählen per Wisch-Leiste (Gewicht, Wiederholungen, Minuten, km): Kasten in der Mitte,
// große Zahl (antippen zum Eintippen), darunter eine Skala zum Hin- und Herwischen, −/+ und Übernehmen.
// Aufruf: const v = await pickNumber({...}); null = abgebrochen.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Haptics } from '@capacitor/haptics';
import { isNative } from '../lib/platform';

export interface PickSpec {
  title: string;
  unit: string;
  value: string;
  min: number;
  max: number;
  step: number;
  /** Schritt der −/+ Knöpfe */
  bigStep: number;
  /** Breite eines Skalenstrichs in px */
  itemW: number;
  /** Beschriftung alle n Striche */
  labelEvery: number;
  integer?: boolean;
}

interface Req extends PickSpec {
  id: number;
  resolve: (v: string | null) => void;
}
let current: Req | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function pickNumber(spec: PickSpec): Promise<string | null> {
  return new Promise((resolve) => {
    current?.resolve(null);
    current = { ...spec, id: ++counter, resolve };
    emit();
  });
}
function finish(v: string | null) {
  const c = current;
  current = null;
  emit();
  c?.resolve(v);
}

/** Vorgaben für die Felder im Training */
export const PICK_SPECS: Record<'weight_kg' | 'reps' | 'duration_min' | 'distance_km', Omit<PickSpec, 'title' | 'value'>> = {
  weight_kg: { unit: 'kg', min: 0, max: 300, step: 0.5, bigStep: 2.5, itemW: 12, labelEvery: 10 },
  reps: { unit: 'Wdh.', min: 0, max: 100, step: 1, bigStep: 1, itemW: 44, labelEvery: 1, integer: true },
  duration_min: { unit: 'min', min: 0, max: 300, step: 1, bigStep: 5, itemW: 14, labelEvery: 5 },
  distance_km: { unit: 'km', min: 0, max: 100, step: 0.1, bigStep: 0.5, itemW: 10, labelEvery: 10 },
};

const toText = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');
const parse = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

export function NumberPickerHost() {
  const req = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => current,
  );
  return req ? <Picker key={req.id} req={req} /> : null;
}

function Picker({ req }: { req: Req }) {
  const count = Math.round((req.max - req.min) / req.step) + 1;
  const clamp = (v: number) => Math.min(req.max, Math.max(req.min, v));
  const start = clamp(parse(req.value) ?? req.min);
  const [text, setText] = useState(toText(start));
  const ruler = useRef<HTMLDivElement>(null);
  const lastIdx = useRef(-1);
  const fromScroll = useRef(true);
  const idxOf = (v: number) => Math.round((clamp(v) - req.min) / req.step);

  const scrollTo = (v: number, smooth: boolean) => {
    const el = ruler.current;
    if (!el) return;
    fromScroll.current = false;
    el.scrollTo({ left: idxOf(v) * req.itemW, behavior: smooth ? 'smooth' : 'auto' });
    setTimeout(() => (fromScroll.current = true), smooth ? 350 : 30);
  };
  useEffect(() => {
    scrollTo(start, false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = ruler.current;
    if (!el || !fromScroll.current) return;
    const idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / req.itemW)));
    if (idx === lastIdx.current) return;
    lastIdx.current = idx;
    setText(toText(req.min + idx * req.step));
    if (isNative) Haptics.selectionChanged().catch(() => {});
  };
  const nudge = (dir: 1 | -1) => {
    const v = clamp((parse(text) ?? start) + dir * req.bigStep);
    setText(toText(v));
    scrollTo(v, true);
  };
  const value = parse(text);
  const valid = value !== null && value >= req.min && value <= req.max && (!req.integer || Number.isInteger(value));

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && finish(null)}>
      <div className="dialog num-picker" id="number-picker" role="dialog" aria-modal="true" aria-label={req.title}>
        <div className="picker-title">{req.title}</div>
        <div className="picker-value">
          <input
            id="picker-input"
            style={{ width: `${Math.max(2, text.length) + 0.6}ch` }}
            inputMode={req.integer ? 'numeric' : 'decimal'}
            value={text}
            aria-label={`${req.title} eintippen`}
            onChange={(e) => {
              setText(e.target.value);
              const v = parse(e.target.value);
              if (v !== null) scrollTo(v, true);
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === 'Enter' && valid && finish(text.trim())}
          />
          <span className="picker-unit">{req.unit}</span>
        </div>
        <div className="picker-ruler-wrap">
          <div className="picker-center" aria-hidden="true" />
          <div className="picker-ruler" ref={ruler} onScroll={onScroll} data-step={req.step} style={{ ['--item-w' as string]: `${req.itemW}px` }}>
            {Array.from({ length: count }, (_, i) => {
              const major = i % req.labelEvery === 0;
              const half = !major && req.labelEvery % 2 === 0 && i % (req.labelEvery / 2) === 0;
              return (
                <span key={i} className={`tick${major ? ' major' : half ? ' half' : ''}`}>
                  {major && <b>{toText(req.min + i * req.step)}</b>}
                </span>
              );
            })}
          </div>
        </div>
        <div className="picker-actions">
          <button type="button" className="btn" id="picker-minus" aria-label={`${toText(req.bigStep)} weniger`} onClick={() => nudge(-1)}>
            −{toText(req.bigStep)}
          </button>
          <button type="button" className="btn" id="picker-plus" aria-label={`${toText(req.bigStep)} mehr`} onClick={() => nudge(1)}>
            +{toText(req.bigStep)}
          </button>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" id="picker-cancel" onClick={() => finish(null)}>
            Abbrechen
          </button>
          <button type="button" className="btn primary" id="picker-ok" disabled={!valid} onClick={() => finish(toText(value!))}>
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
