// Ein Training im Plan selbst zusammenstellen: Übung tauschen (empfohlene zuerst), entfernen, hinzufügen.
// Ausgeschlossene Übungen, Geräte-Vorliebe und Beschwerden gelten auch hier – solche Übungen werden nicht angeboten.
import { useEffect, useState } from 'react';
import { CATALOG_MUSCLES } from '../lib/exerciseCatalog';
import { matchesSearch } from '../lib/searchTerms';
import { addableFor, alternativesFor, isCustomized, PLAN_PREFIX, withTemplateExercises, type Answers, type PlanChoice, type PlanTemplate } from '../lib/plan';

type Sheet = { mode: 'swap'; target: string } | { mode: 'add' };

function ChoiceList({ title, items, onPick, open }: { title: string; items: PlanChoice[]; onPick: (name: string) => void; open: boolean }) {
  if (!items.length) return null;
  return (
    <details className="pde-group" open={open || undefined} data-group={title}>
      <summary className="pde-head"><span>{title}</span><small className="muted">{items.length}</small></summary>
      <ul className="picker-list pde-list">
        {items.map((c) => (
          <li key={c.name}>
            <button type="button" className="picker-item" data-choice={c.name} onClick={() => onPick(c.name)}>
              <span className="picker-name">{c.recommended && <span className="pde-star" aria-label="oft empfohlen">★ </span>}{c.name}</span>
              <span className="picker-sub">{c.muscle}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function PlanDayEditor({ template, answers, onChange, onInfo }: { template: PlanTemplate; answers: Answers; onChange: (a: Answers) => void; onInfo: (name: string) => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!sheet) return;
    document.body.classList.add('picker-open');
    return () => document.body.classList.remove('picker-open');
  }, [sheet]);
  const strength = template.exercises.filter((e) => !e.cardio).map((e) => e.name);
  const save = (names: string[]) => onChange(withTemplateExercises(answers, template.name, names));
  const close = () => { setSheet(null); setQ(''); };
  const pick = (name: string) => {
    if (sheet?.mode === 'swap') save(strength.map((n) => (n === sheet.target ? name : n)));
    else save([...strength, name]);
    close();
  };
  // Suche versteht Stichwörter wie „hintere Schulter“ oder „Po“
  const match = (c: PlanChoice) => !q || matchesSearch(q, c.name, CATALOG_MUSCLES[c.name] ?? []) || c.muscle.toLowerCase().includes(q.toLowerCase());
  const searching = q.trim().length > 0;
  const day = template.name.replace(PLAN_PREFIX, '');

  return (
    <>
      <ul className="plan-list pde">
        {template.exercises.map((e) => {
          const work = e.sets.filter((s) => !s.warmup);
          return (
            <li key={e.name} data-plan-row={e.name}>
              <span className="pde-name">
                <button type="button" className="linklike plan-ex" data-plan-ex={e.name} onClick={() => onInfo(e.name)}>{e.name}</button>
                <small className="muted">{e.cardio ? `${e.sets[0].duration_min} Min.` : `${work.length} × ${e.range ? (e.range[0] === e.range[1] ? e.range[0] : `${e.range[0]}–${e.range[1]}`) : work[0]?.reps ?? ''}`}</small>
              </span>
              {!e.cardio && (
                <span className="pde-actions">
                  <button type="button" className="btn small-btn" data-swap={e.name} onClick={() => setSheet({ mode: 'swap', target: e.name })}>Tauschen</button>
                  <button type="button" className="icon-btn" data-remove={e.name} aria-label={`${e.name} entfernen`} disabled={strength.length <= 1} onClick={() => save(strength.filter((n) => n !== e.name))}>✕</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="row pde-foot">
        <button type="button" className="btn small-btn" data-add={template.name} onClick={() => setSheet({ mode: 'add' })}>+ Übung hinzufügen</button>
        {isCustomized(answers, template.name) && (
          <button type="button" className="btn small-btn" data-reset={template.name} onClick={() => onChange(withTemplateExercises(answers, template.name, null))}>Zurücksetzen</button>
        )}
      </div>
      {sheet && (
        <div className="picker" role="dialog" aria-modal="true" aria-label={sheet.mode === 'swap' ? 'Übung tauschen' : 'Übung hinzufügen'} id="pde-sheet">
          <div className="picker-head">
            <h2>{sheet.mode === 'swap' ? `${sheet.target} tauschen` : `${day}: Übung hinzufügen`}</h2>
            <button className="icon-btn" type="button" aria-label="Schließen" id="pde-close" onClick={close}>✕</button>
          </div>
          <input type="search" className="picker-search" id="pde-search" placeholder="Übung oder Körperstelle suchen (z. B. hintere Schulter)" value={q} onChange={(ev) => setQ(ev.target.value)} />
          <div className="pde-body">
            {sheet.mode === 'swap' ? (() => {
              const alt = alternativesFor(answers, template.name, sheet.target);
              const rec = alt.recommended.filter(match);
              const more = alt.more.filter(match);
              return (
                <>
                  <ChoiceList key={`r${searching}`} title="★ Oft empfohlen" items={rec} onPick={pick} open />
                  <ChoiceList key={`m${searching}`} title="Weitere Möglichkeiten" items={more} onPick={pick} open={searching} />
                  {!rec.length && !more.length && <p className="muted small">Keine passende Alternative – vielleicht hast du sie ausgeschlossen oder sie braucht andere Geräte.</p>}
                </>
              );
            })() : (() => {
              const groups = addableFor(answers, template.name).map((g) => ({ ...g, items: g.items.filter(match) })).filter((g) => g.items.length);
              return groups.length ? groups.map((g) => <ChoiceList key={`${g.group}-${searching}`} title={g.group} items={g.items} onPick={pick} open={searching} />) : <p className="muted small">Keine weitere passende Übung gefunden.</p>;
            })()}
            <p className="muted small">★ = häufig empfohlene Übung für diese Muskelgruppe. Übungen, die du ausgeschlossen hast oder für die dir Geräte fehlen, stehen hier nicht.</p>
          </div>
        </div>
      )}
    </>
  );
}
