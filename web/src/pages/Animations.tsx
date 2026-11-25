// Testseite für alle Bewegungsmuster (nur für Admins im Menü verlinkt): Start, Mitte und Ende mit hervorgehobenen Muskeln.
// #/animationen/gross zeigt je Muster ein großes Bild (Mitte der Bewegung) zum genauen Prüfen.
import { ExerciseAnim, focusFor } from '../components/ExerciseAnim';
import { PATTERN_IDS, PATTERNS } from '../lib/animations';
import { animIdFor } from '../lib/animMap';
import { CATALOG } from '../lib/exerciseCatalog';

export function Animations({ big = false }: { big?: boolean }) {
  return (
    <>
      <h2>Animationen</h2>
      <p className="muted small">Alle Bewegungsmuster: Start, Mitte und Ende. Rot = Hauptmuskel, orange = Hilfsmuskeln.</p>
      <div className="anim-grid" id="anim-grid">
        {PATTERN_IDS.map((id) => {
          const sample = CATALOG.find((c) => animIdFor(c.name, c.muscles) === id);
          const focus = sample ? focusFor(sample.muscles) : undefined;
          return (
            <div className="card" key={id} data-pattern={id}>
              <h3>{PATTERNS[id].name}</h3>
              <div className={big ? "anim-big" : "anim-trio"}>
                {big
                  ? <ExerciseAnim id={id} height={420} fixedU={0.25} compact highlight={focus} />
                  : [0, 0.25, 0.5].map((u) => <ExerciseAnim key={u} id={id} height={190} fixedU={u} compact highlight={focus} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
