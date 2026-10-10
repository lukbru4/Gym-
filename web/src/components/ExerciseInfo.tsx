// Übungsseite: 3D-Animation, Muskeln, Ausführung, typische Fehler und umgangssprachliche Namen.
import { useEffect } from 'react';
import { MUSCLE_NAMES, musclesOf } from '../lib/muscles';
import { animIdFor } from '../lib/animMap';
import { PATTERNS } from '../lib/animations';
import { keywordsOf } from '../lib/exerciseCatalog';
import { ExerciseAnim, focusFor } from './ExerciseAnim';
import { BodyGraph } from './BodyGraph';
import { focusOf } from './WorkoutMuscles';
import type { Exercise } from '../lib/types';

/** Zusatzhinweise je nach Geräteart im Namen */
function tips(name: string): string[] {
  const n = name.toLowerCase();
  const out: string[] = [];
  if (/maschine/.test(n) && !/smith/.test(n)) out.push('An der Maschine: Sitz und Polster so einstellen, dass die Drehachse der Maschine auf Höhe deines Gelenks liegt.');
  if (/smith/.test(n)) out.push('An der Smith-Maschine läuft die Stange auf Schienen: Stell die Füße etwas weiter vor, damit die Bewegung natürlich bleibt. Haken am Ende der Übung einrasten.');
  if (/kabel|seil/.test(n)) out.push('Am Kabelzug: Stell die Rolle auf die richtige Höhe und halte die Spannung während der ganzen Bewegung.');
  if (/kurzhantel/.test(n)) out.push('Mit Kurzhanteln arbeitet jede Seite für sich – so gleichst du Kraftunterschiede aus.');
  if (/einarmig|einbeinig/.test(n)) out.push('Einseitig: Zuerst die schwächere Seite trainieren und bei der stärkeren dieselbe Wiederholungszahl machen.');
  return out;
}

export function ExerciseInfo({ ex, onClose }: { ex: Pick<Exercise, 'name' | 'type' | 'muscles'>; onClose: () => void }) {
  useEffect(() => {
    document.body.classList.add('picker-open');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('picker-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const muscles = musclesOf({ name: ex.name, muscles: ex.muscles });
  const id = animIdFor(ex.name, muscles);
  const p = PATTERNS[id] ?? PATTERNS.generic;
  const alias = keywordsOf(ex.name).split(', ').filter(Boolean).slice(0, 8);
  const extra = tips(ex.name);
  return (
    <div className="picker ex-info" role="dialog" aria-modal="true" aria-label={`Anleitung: ${ex.name}`} id="exercise-info">
      <div className="picker-head">
        <h2>{ex.name}</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" id="info-close" onClick={onClose}>✕</button>
      </div>
      <ExerciseAnim id={id} highlight={focusFor(muscles)} height={300} label={`Animation: ${ex.name}`} />
      {id === 'generic' && <p className="muted small">Für diese Übung gibt es noch keine eigene Animation – gezeigt wird eine allgemeine Bewegung.</p>}
      {id !== 'generic' && PATTERNS[id].name !== ex.name && <p className="muted small">Bewegungsablauf: {p.name}. Varianten (Gerät, Griff) sehen ähnlich aus.</p>}
      {muscles.length > 0 && (
        <div className="card info-map">
          <h3>Zielmuskeln</h3>
          <BodyGraph focus={focusOf([{ name: ex.name, muscles, type: ex.type }]).focus} labels />
          <p className="info-muscles">{muscles.map((m, i) => <span className={`chip${i > 0 ? ' secondary' : ''}`} key={m}>{MUSCLE_NAMES.get(m) ?? m}{i === 0 ? ' (Hauptmuskel)' : ''}</span>)}</p>
        </div>
      )}
      <div className="card">
        <h3>So geht’s</h3>
        <ul className="info-list">{[...p.cues, ...extra].map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      <div className="card">
        <h3>Typische Fehler</h3>
        <ul className="info-list">{p.mistakes.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      {alias.length > 0 && <p className="muted small" id="info-alias">Auch bekannt als: {alias.join(' · ')}</p>}
      <p className="muted small">Allgemeine Hinweise zur Technik, kein Ersatz für eine Trainerin oder einen Trainer. Bei Schmerzen abbrechen und ärztlich abklären.</p>
    </div>
  );
}
