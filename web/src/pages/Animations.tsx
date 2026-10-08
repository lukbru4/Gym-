// Testseite für alle Bewegungsmuster (nur für Admins im Menü verlinkt): Start- und Endstellung nebeneinander.
import { ExerciseAnim } from '../components/ExerciseAnim';
import { PATTERN_IDS, PATTERNS } from '../lib/animations';

export function Animations() {
  return (
    <>
      <h2>Animationen</h2>
      <p className="muted small">Alle Bewegungsmuster: Start, Mitte und Ende.</p>
      <div className="anim-grid" id="anim-grid">
        {PATTERN_IDS.map((id) => (
          <div className="card" key={id} data-pattern={id}>
            <h3>{PATTERNS[id].name}</h3>
            <div className="anim-trio">
              {[0, 0.25, 0.5].map((u) => <ExerciseAnim key={u} id={id} height={190} fixedU={u} compact />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
