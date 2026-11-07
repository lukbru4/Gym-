// Dein Titel (Beginner 1 … Ultra 3): steigt mit jedem Training, am Anfang schnell, oben langsamer.
import { datedSets } from '../lib/editor';
import { levelInfo, STRENGTH_LEVELS, trainingTitle, type TrainingTitle } from '../lib/levels';
import { strengthLevels } from '../lib/muscles';
import { todayISO } from '../lib/stats';
import type { ExerciseMap, Workout, WorkoutSet } from '../lib/types';

export function titleFor(workouts: Workout[], sets: WorkoutSet[], ex: ExerciseMap): TrainingTitle {
  const today = todayISO();
  return trainingTitle(workouts, strengthLevels(datedSets(workouts, sets), ex, today), today);
}

export function TitleBadge({ t, id }: { t: TrainingTitle; id?: string }) {
  const l = levelInfo(t.level);
  return <span className="title-badge" id={id} data-title-level={t.level} data-title-step={t.step} style={{ background: `linear-gradient(135deg, ${l.light}, ${l.dark})`, color: t.level <= 2 ? '#2b2100' : '#fff' }}>{t.name}</span>;
}

/** Karte im Profil: Titel, Fortschritt zur nächsten Unterstufe, alle Stufen */
export function TitleCard({ t }: { t: TrainingTitle }) {
  return (
    <div className="card title-card" id="title-card">
      <div className="block-head"><h3>Dein Titel</h3><TitleBadge t={t} id="title-badge" /></div>
      <p className="small">Mit jedem Training steigst du auf – jede Stufe hat 3 Unterstufen. Du hast <strong>{t.trainings}</strong> {t.trainings === 1 ? 'Training' : 'Trainings'} gemacht.</p>
      <div className="title-progress" aria-hidden="true"><i style={{ width: `${Math.round(t.progress * 100)}%`, background: t.color }} /></div>
      <p className="small" id="title-next">{t.next ?? 'Höchster Titel erreicht – du bist Ultra 3!'}</p>
      <div className="title-scale" aria-label="Alle Titel">
        {STRENGTH_LEVELS.slice(1).map((l) => (
          <span key={l.level} className={l.level === t.level ? 'on' : ''} style={{ background: `linear-gradient(135deg, ${l.light}, ${l.dark})` }}>
            {l.name}
            <small className="title-dots">{[1, 2, 3].map((s) => <b key={s} className={l.level < t.level || (l.level === t.level && s <= t.step) ? 'on' : ''} />)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
