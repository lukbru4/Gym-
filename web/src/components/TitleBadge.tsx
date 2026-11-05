// Dein Titel (Beginner … Ultra): aus „wie oft“ (Trainings pro Woche) und „wie gut“ (Muskel-Stufen).
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
  return <span className="title-badge" id={id} data-title-level={t.level} style={{ background: `linear-gradient(135deg, ${l.light}, ${l.dark})`, color: t.level <= 2 ? '#2b2100' : '#fff' }}>{t.name}</span>;
}

/** Karte im Profil: Titel, beide Teilwerte und was fürs nächste Level fehlt */
export function TitleCard({ t }: { t: TrainingTitle }) {
  return (
    <div className="card title-card" id="title-card">
      <div className="block-head"><h3>Dein Titel</h3><TitleBadge t={t} id="title-badge" /></div>
      <p className="small">Dein Titel zeigt, <strong>wie oft</strong> und <strong>wie gut</strong> du trainierst:</p>
      <ul className="title-parts">
        <li>Wie oft: {t.perWeek.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Trainings pro Woche (letzte 8 Wochen) → <b>{levelInfo(t.often).name}</b></li>
        <li>Wie gut: Stufen deiner Muskeln im Körpergraph → <b>{levelInfo(t.good).name}</b></li>
      </ul>
      <p className="small" id="title-next">{t.next ?? 'Höchster Titel erreicht – du bist Ultra!'}</p>
      <div className="title-scale" aria-label="Alle Titel">
        {STRENGTH_LEVELS.slice(1).map((l) => <span key={l.level} className={l.level === t.level ? 'on' : ''} style={{ background: `linear-gradient(135deg, ${l.light}, ${l.dark})` }}>{l.name}</span>)}
      </div>
    </div>
  );
}
