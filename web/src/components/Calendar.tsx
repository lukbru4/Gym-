// Monatskalender im Profil: Trainingstage sind markiert und führen zum Training.
import { useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { fmtDate } from '../lib/format';
import { todayISO } from '../lib/stats';
import type { Workout } from '../lib/types';

export function Calendar({ workouts }: { workouts: Workout[] }) {
  const { api, dataVersion } = useApp();
  // Tage mit Fortschritts-Foto bekommen ein 📷
  const photos = useAsync(() => api.progress.listPhotos(), [api, dataVersion]);
  const photoDays = new Set(photos.status === 'ok' ? photos.data.map((p) => p.date) : []);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Montag zuerst
  const byDate = new Map<string, number>();
  for (const w of [...workouts].sort((a, b) => a.id - b.id)) if (!byDate.has(w.date)) byDate.set(w.date, w.id);
  const today = todayISO();
  const shift = (delta: number) => setMonth(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7));
  const title = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="card" id="calendar">
      <div className="block-head">
        <h3>{title}</h3>
        <span>
          <button className="icon-btn" data-cal="-1" aria-label="Voriger Monat" onClick={() => shift(-1)}>‹</button>
          <button className="icon-btn" data-cal="1" aria-label="Nächster Monat" onClick={() => shift(1)}>›</button>
        </span>
      </div>
      <div className="cal-grid">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <span key={d} className="cal-head">{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`e${i}`} className="cal-day empty" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const iso = `${month}-${String(d).padStart(2, '0')}`;
          const id = byDate.get(iso);
          const photo = photoDays.has(iso);
          const cls = `cal-day${id ? ' trained' : ''}${iso === today ? ' today' : ''}${photo ? ' photo' : ''}`;
          const cam = photo ? <span className="cal-photo" aria-label="Fortschritts-Foto">📷</span> : null;
          return id ? (
            <a key={iso} className={cls} href={`#/training/${id}`} aria-label={`${fmtDate(iso)}: Training${photo ? ', Foto' : ''}`}>{d}{cam}</a>
          ) : photo ? (
            <a key={iso} className={cls} href="#/koerper" aria-label={`${fmtDate(iso)}: Fortschritts-Foto`}>{d}{cam}</a>
          ) : (
            <span key={iso} className={cls}>{d}</span>
          );
        })}
      </div>
    </div>
  );
}
