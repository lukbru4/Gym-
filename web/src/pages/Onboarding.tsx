// Fragerunden im Vollbild-Stil: eine Frage pro Bildschirm, Fortschrittsbalken, große Regler und Karten.
// Runde 1 „Über dich“ (#/ueber-dich) und Runde 2 „Dein Training“ (#/training-fragen).
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { BodyGraph, type Focus } from '../components/BodyGraph';
import { Icon } from '../components/Icon';
import { calorieNeeds } from '../lib/calories';
import { fmt } from '../lib/format';
import { markWelcomeSeen } from '../lib/onboarding';
import { loadQuiz, saveQuiz, type Answers } from '../lib/plan';
import {
  activeSteps, bodyFatLabel, deriveAnswers, navyBodyFat, offerRound2, ROUND1, ROUND2, round1Done, snoozeRound2, stepDone, toggleLimited, type Step,
} from '../lib/rounds';
import { todayISO } from '../lib/stats';
import type { MuscleId } from '../lib/types';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const FOCUS_MUSCLES: Record<string, MuscleId[]> = {
  brust: ['brust'], ruecken: ['oberer_ruecken', 'lat', 'unterer_ruecken'], schultern: ['schultern'], arme: ['bizeps', 'trizeps'],
  beine: ['quadrizeps', 'beinbeuger', 'gesaess', 'waden'], bauch: ['bauch'],
};
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? [v] : []);
const num = (v: unknown, d: number) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && String(v ?? '') !== '' ? n : d; };
const show = (n: number, step = 1) => (step < 1 ? n.toFixed(1).replace('.', ',').replace(',0', '') : String(Math.round(n)));

/** Schlichte eigene Figur von vorne: Bauch und Hüfte werden mit dem Körperfett breiter, Bauchmuskeln verschwinden */
export function FatFigure({ bf, female, size = 150 }: { bf: number; female: boolean; size?: number }) {
  const t = Math.min(1, Math.max(0, (bf - 5) / 40));
  const waist = 13 + t * 15; // halbe Breite an der Taille
  const hip = (female ? 17 : 14.5) + t * (female ? 13 : 10);
  const chest = (female ? 15.5 : 18) + t * 6;
  const sh = female ? 18.5 : 22;
  const cx = 50;
  const body = `M${cx - sh} 46 Q${cx - sh - 2} 50 ${cx - chest} 62 Q${cx - waist - 1} 80 ${cx - waist} 90 Q${cx - hip} 100 ${cx - hip} 108 L${cx + hip} 108 Q${cx + hip} 100 ${cx + waist} 90 Q${cx + waist + 1} 80 ${cx + chest} 62 Q${cx + sh + 2} 50 ${cx + sh} 46 Q${cx} 40 ${cx - sh} 46 Z`;
  const abs = Math.max(0, 1 - (bf - (female ? 14 : 8)) / 10);
  const skin = '#f2c6a0', shade = '#e0a982', shorts = '#2b2f36';
  return (
    <svg viewBox="0 0 100 165" width={size * 0.62} height={size} className="fat-figure" aria-hidden="true">
      {/* Arme */}
      <path d={`M${cx - sh} 47 Q${cx - sh - 7 - t * 4} 70 ${cx - sh - 6 - t * 3} 98`} stroke={skin} strokeWidth={8 + t * 4} strokeLinecap="round" fill="none" />
      <path d={`M${cx + sh} 47 Q${cx + sh + 7 + t * 4} 70 ${cx + sh + 6 + t * 3} 98`} stroke={skin} strokeWidth={8 + t * 4} strokeLinecap="round" fill="none" />
      {/* Beine */}
      <rect x={cx - hip + 1} y={104} width={hip - 2.5} height={52} rx={6} fill={skin} />
      <rect x={cx + 1.5} y={104} width={hip - 2.5} height={52} rx={6} fill={skin} />
      <path d={`M${cx - hip - 0.5} 100 L${cx + hip + 0.5} 100 L${cx + hip + 1} 122 L${cx + 1.5} 122 L${cx} 112 L${cx - 1.5} 122 L${cx - hip - 1} 122 Z`} fill={shorts} />
      {/* Oberkörper */}
      <path d={body} fill={skin} />
      {female && <path d={`M${cx - chest + 3} 60 Q${cx - 7} 70 ${cx - 1} 61 M${cx + chest - 3} 60 Q${cx + 7} 70 ${cx + 1} 61`} stroke={shade} strokeWidth="1.6" fill="none" />}
      {female && <path d={`M${cx - chest + 1} 56 Q${cx} 52 ${cx + chest - 1} 56 L${cx + chest - 2} 66 Q${cx} 70 ${cx - chest + 2} 66 Z`} fill="#8e4ec6" />}
      {!female && <path d={`M${cx - 14} 60 Q${cx - 7} 65 ${cx - 1} 60 M${cx + 14} 60 Q${cx + 7} 65 ${cx + 1} 60`} stroke={shade} strokeWidth="1.4" fill="none" />}
      <g stroke={shade} strokeWidth="1.2" strokeLinecap="round" opacity={abs}>
        <path d={`M${cx} 66 L${cx} 92`} />
        {[71, 78, 85].map((y) => <path key={y} d={`M${cx - 6} ${y} L${cx + 6} ${y}`} />)}
      </g>
      <ellipse cx={cx} cy={90 + t * 2} rx={1} ry={1.3} fill={shade} />
      {/* Kopf */}
      <rect x={cx - 4} y={36} width={8} height={8} fill={skin} />
      <rect x={cx - 10} y={14} width={20} height={24} rx={9} fill={skin} />
      <path d={female ? `M${cx - 11} 26 Q${cx - 12} 11 ${cx} 11 Q${cx + 12} 11 ${cx + 11} 26 L${cx + 12} 40 L${cx + 8} 22 Q${cx} 17 ${cx - 8} 22 L${cx - 12} 40 Z` : `M${cx - 10.5} 24 Q${cx - 11} 11 ${cx} 11 Q${cx + 11} 11 ${cx + 10.5} 24 Q${cx + 6} 17 ${cx} 18 Q${cx - 6} 17 ${cx - 10.5} 24 Z`} fill="#3b2a20" />
    </svg>
  );
}

/** Tacho für die Selbsteinschätzung (Zeiger von links nach rechts) */
function Gauge({ level, size = 40 }: { level: number; size?: number }) {
  const a = Math.PI * (1 - level / 4);
  const x = 20 + Math.cos(a) * 12, y = 22 - Math.sin(a) * 12;
  const colors = ['#30a46c', '#8bc34a', '#f5b300', '#f76b15', '#e5484d'];
  return (
    <svg viewBox="0 0 40 26" width={size} height={(size * 26) / 40} aria-hidden="true">
      {colors.map((c, i) => {
        const a0 = Math.PI * (1 - i / 5), a1 = Math.PI * (1 - (i + 1) / 5);
        return <path key={c} d={`M${20 + Math.cos(a0) * 16} ${22 - Math.sin(a0) * 16} A16 16 0 0 1 ${20 + Math.cos(a1) * 16} ${22 - Math.sin(a1) * 16}`} stroke={c} strokeWidth="5" fill="none" />;
      })}
      <path d={`M20 22 L${x} ${y}`} stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="22" r="2.6" fill="var(--text)" />
    </svg>
  );
}

function Slider({ value, min, max, step, unit, onChange, id = 'ob-slider' }: { value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; id?: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <div className="ob-slider">
      <div className="ob-big"><strong id={`${id}-value`}>{show(value, step)}</strong> <span>{unit}</span></div>
      <div className="ob-slider-row">
        <button type="button" className="ob-step" aria-label="weniger" onClick={() => onChange(clamp(value - step))}>−</button>
        <input type="range" id={id} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={unit ?? 'Wert'} />
        <button type="button" className="ob-step" aria-label="mehr" onClick={() => onChange(clamp(value + step))}>+</button>
      </div>
    </div>
  );
}

function NavyCalc({ a, onResult }: { a: Answers; onResult: (bf: number) => void }) {
  const female = a.sex === 'w';
  const [neck, setNeck] = useState(female ? 33 : 38);
  const [waist, setWaist] = useState(num(a.waist, female ? 75 : 85));
  const [hip, setHip] = useState(female ? 98 : 95);
  const height = num(a.height, 175);
  const bf = navyBodyFat({ female, height, neck, waist, hip });
  return (
    <div className="card ob-navy" id="ob-navy">
      <p className="small"><strong>Mit Maßband ausrechnen</strong> (Methode der US Navy, ± 3–4 %)</p>
      <ul className="small muted ob-how">
        <li><strong>Hals:</strong> direkt unter dem Kehlkopf, Band leicht nach vorne unten geneigt.</li>
        <li><strong>Bauch:</strong> auf Höhe des Bauchnabels, normal ausatmen.</li>
        {female && <li><strong>Hüfte:</strong> an der breitesten Stelle des Pos.</li>}
      </ul>
      <label className="ob-mini">Hals <Slider id="navy-neck" value={neck} min={25} max={55} step={0.5} unit="cm" onChange={setNeck} /></label>
      <label className="ob-mini">Bauch <Slider id="navy-waist" value={waist} min={50} max={160} step={0.5} unit="cm" onChange={setWaist} /></label>
      {female && <label className="ob-mini">Hüfte <Slider id="navy-hip" value={hip} min={60} max={160} step={0.5} unit="cm" onChange={setHip} /></label>}
      <p className="small">Größe: {height} cm (aus deiner Antwort)</p>
      <button type="button" className="btn primary block" id="navy-take" disabled={bf === null} onClick={() => bf !== null && onResult(bf)}>
        {bf === null ? 'Bitte Maße prüfen' : `Ergebnis übernehmen: ${bf} %`}
      </button>
    </div>
  );
}

export function Round({ round }: { round: 1 | 2 }) {
  const { api, user } = useApp();
  const uid = user?.id ?? 'local';
  const all = round === 1 ? ROUND1 : ROUND2;
  const [answers, setAnswers] = useState<Answers>(() => loadQuiz()?.answers ?? {});
  const steps = activeSteps(all, answers);
  const [i, setI] = useState(0);
  const [help, setHelp] = useState(false);
  const [navy, setNavy] = useState(false);
  const [done, setDone] = useState(false);
  const s: Step | undefined = steps[Math.min(i, steps.length - 1)];
  useEffect(() => { setHelp(false); setNavy(false); }, [s?.id]);

  const store = (next: Answers) => {
    const full = deriveAnswers(next);
    setAnswers(full);
    saveQuiz({ answers: full, plan: loadQuiz()?.plan ?? null, savedAt: new Date().toISOString() });
    return full;
  };
  const finish = async (a: Answers) => {
    const today = todayISO();
    const key = round === 1 ? 'r1' : 'r2';
    const full = store({ ...a, [key]: typeof a[key] === 'string' && a[key] ? a[key] : today });
    if (round === 1) {
      markWelcomeSeen(uid);
      // Bauchumfang/Körperfett gleich als erste Körpermaße speichern
      const waist = num(full.waist, 0), bf = num(full.bodyfat, 0);
      if ((waist || bf) && api.progress) void api.progress.saveMeasure(today, { ...(waist ? { waist } : {}), ...(bf ? { bodyfat: bf } : {}) }).catch(() => {});
      const name = String(full.name ?? '').trim();
      if (name && api.social) {
        const social = api.social;
        void social.myProfile().then((p) => (p && !p.display_name ? social.updateProfile(name.slice(0, 30), p.visibility) : undefined)).catch(() => {});
      }
      setDone(true);
    } else navigate('#/trainingsplan/plan');
  };
  const next = (a: Answers = answers) => {
    if (i >= steps.length - 1 || i >= activeSteps(all, a).length - 1) void finish(a);
    else setI(i + 1);
  };

  if (done) return <Summary answers={answers} />;
  if (!s) return null;
  const value = answers[s.id];
  const pick = (v: string) => {
    const a = store({ ...answers, [s.id]: v });
    setTimeout(() => next(a), 180);
  };
  const sliderVal = num(value, num(s.defFrom ? answers[s.defFrom] : undefined, s.def ?? s.min ?? 0));
  const setVal = (v: number) => store({ ...answers, [s.id]: String(v) });
  const female = answers.sex === 'w';
  const goOn = () => {
    // Regler ohne Bewegung: Startwert übernehmen
    if ((s.kind === 'slider' || s.kind === 'months') && value === undefined && !s.optional) next(store({ ...answers, [s.id]: String(sliderVal), ...(s.kind === 'months' ? { expSteady: String(answers.expSteady ?? 'ja') } : {}) }));
    else if (s.kind === 'slider' && value === undefined && s.optional) next(store({ ...answers, [s.id]: String(sliderVal) }));
    else if (s.kind === 'bodyfat' && value === undefined) next(store({ ...answers, bodyfat: String(sliderVal || 20) }));
    else if (s.kind === 'week' && answers.durationMin === undefined) next(store({ ...answers, durationMin: '60' }));
    else next();
  };
  const skip = () => {
    const a = { ...answers };
    if (s.kind === 'slider' || s.kind === 'bodyfat') delete a[s.id];
    next(store(a));
  };
  const autoAdvance = s.kind === 'cards' || s.kind === 'level';

  let body: React.ReactNode = null;
  if (s.kind === 'text') {
    body = <input id="ob-text" className="ob-text" maxLength={30} autoFocus placeholder="Dein Vorname" value={String(value ?? '')} onChange={(e) => store({ ...answers, [s.id]: e.target.value })} />;
  } else if (s.kind === 'cards' || s.kind === 'level') {
    body = (
      <div className={`ob-cards${s.options!.some((o) => o.sub || o.icon) || s.kind === 'level' ? '' : ' ob-cards-small'}`} role="radiogroup">
        {s.options!.map((o, k) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={`ob-card${value === o.v ? ' on' : ''}`} data-v={o.v} onClick={() => pick(o.v)}>
            {s.kind === 'level' ? <Gauge level={k} /> : o.icon ? <Icon name={o.icon} size={30} /> : null}
            <span><strong>{o.label}</strong>{o.sub && <small>{o.sub}</small>}</span>
          </button>
        ))}
      </div>
    );
  } else if (s.kind === 'multi' || s.kind === 'focus') {
    const cur = asList(value);
    const toggle = (v: string) => store({ ...answers, [s.id]: s.limit ? toggleLimited(cur, v, s.limit) : v === 'keine' ? (cur.includes(v) ? [] : [v]) : cur.includes(v) ? cur.filter((x) => x !== v) : [...cur.filter((x) => x !== 'keine'), v] });
    const focus: Focus = new Map();
    if (s.kind === 'focus') for (const g of cur) for (const m of FOCUS_MUSCLES[g] ?? []) focus.set(m, 'p');
    body = (
      <>
        {s.kind === 'focus' && <div className="ob-body"><BodyGraph focus={focus} /></div>}
        <div className="ob-chips">
          {s.options!.map((o) => (
            <button key={o.v} type="button" aria-pressed={cur.includes(o.v)} className={`ob-chip${cur.includes(o.v) ? ' on' : ''}`} data-v={o.v} onClick={() => toggle(o.v)}>
              {o.icon && <Icon name={o.icon} size={20} />}{o.label}
            </button>
          ))}
        </div>
        {s.limit && <p className="muted small center" id="ob-limit">{cur.filter((x) => x !== 'alles').length} von {s.limit} gewählt</p>}
      </>
    );
  } else if (s.kind === 'slider') {
    body = <Slider value={sliderVal} min={s.min!} max={s.max!} step={s.step ?? 1} unit={s.unit} onChange={setVal} />;
  } else if (s.kind === 'bodyfat') {
    const bf = num(value, female ? 26 : 18);
    body = (
      <>
        <div className="ob-fat">
          <FatFigure bf={bf} female={female} size={190} />
          <div className="ob-fat-side">
            <div className="ob-big"><strong id="ob-slider-value">{bf}</strong> <span>%</span></div>
            <span className="ob-fat-label">{bodyFatLabel(bf, female)}</span>
          </div>
        </div>
        <input type="range" id="ob-slider" className="ob-range-wide" min={s.min} max={s.max} step={1} value={bf} onChange={(e) => setVal(Number(e.target.value))} aria-label="Körperfett in Prozent" />
        <div className="row ob-fat-actions">
          <button type="button" className="btn small-btn" id="ob-navy-open" onClick={() => setNavy(!navy)}><Icon name="tape" size={18} /> Mit Maßband ausrechnen</button>
          <button type="button" className="btn small-btn" id="ob-unknown" onClick={skip}>Weiß ich nicht</button>
        </div>
        {navy && <NavyCalc a={answers} onResult={(r) => { setVal(r); setNavy(false); }} />}
      </>
    );
  } else if (s.kind === 'months') {
    const m = sliderVal;
    const label = m >= 24 ? `${fmt(m / 12, 1)}` : String(m);
    const steady = answers.expSteady !== 'nein';
    body = (
      <>
        <div className="ob-slider">
          <div className="ob-big"><strong id="ob-slider-value">{label}</strong> <span>{m >= 24 ? 'Jahre' : m === 1 ? 'Monat' : 'Monate'}</span></div>
          <input type="range" id="ob-slider" className="ob-range-wide" min={0} max={120} step={1} value={m} onChange={(e) => store({ ...answers, expMonths: e.target.value, expSteady: answers.expSteady ?? 'ja' })} aria-label="Monate Training" />
          <div className="ob-scale muted small"><span>Gar nicht</span><span>10 Jahre</span></div>
        </div>
        <label className="ob-toggle">
          <span>Die letzten 3 Monate habe ich durchgehend trainiert</span>
          <input type="checkbox" id="ob-steady" checked={steady} onChange={(e) => store({ ...answers, expMonths: String(m), expSteady: e.target.checked ? 'ja' : 'nein' })} />
        </label>
      </>
    );
  } else if (s.kind === 'week') {
    const days = asList(answers.weekdays);
    const dur = num(answers.durationMin, 60);
    const rec = answers.exp === 'neu' ? 45 : 60;
    body = (
      <>
        <div className="ob-days" role="group" aria-label="Trainingstage">
          {DAYS.map((d) => {
            const on = days.includes(d);
            return <button key={d} type="button" aria-pressed={on} className={`ob-day${on ? ' on' : ''}`} data-day={d} onClick={() => store({ ...answers, weekdays: on ? days.filter((x) => x !== d) : DAYS.filter((x) => x === d || days.includes(x)) })}>{d}</button>;
          })}
        </div>
        <p className="muted small center" id="ob-days-count">{days.length ? `${days.length}× pro Woche${days.length > 6 ? ' – plane mindestens einen Ruhetag ein' : ''}` : 'Tippe die Tage an'}</p>
        <p className="small"><strong>Wie lange pro Training?</strong></p>
        <Slider id="ob-dur" value={dur} min={30} max={120} step={15} unit="Min." onChange={(v) => store({ ...answers, durationMin: String(v) })} />
        <p className="muted small center">Empfohlen: {rec} Minuten{dur === rec ? ' ✓' : ''}</p>
      </>
    );
  } else if (s.kind === 'info') {
    body = <div className="ob-info"><Icon name={round === 1 ? 'bed' : 'up'} size={72} /></div>;
  }

  return (
    <div className="ob" id={`round-${round}`} data-step={s.id}>
      <div className="ob-top">
        <button type="button" className="icon-btn" id="ob-back" aria-label="Zurück" disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
        <div className="ob-progress" aria-hidden="true"><i style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
        {round === 2 ? <a className="icon-btn" href="#/" id="ob-close" aria-label="Schließen">✕</a> : <span className="ob-count muted small">{i + 1}/{steps.length}</span>}
      </div>
      <p className="ob-section">{s.section}</p>
      <h2 className="ob-title">{s.title}</h2>
      {s.hint && <p className="muted ob-hint">{s.hint}</p>}
      {body}
      {s.help && (
        <div className="ob-help">
          <button type="button" className="link-btn small" id="ob-help" onClick={() => setHelp(!help)}><Icon name="info" size={16} /> {s.help.title}</button>
          {help && <ul className="card small ob-help-text" id="ob-help-text">{s.help.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
        </div>
      )}
      <div className="ob-foot">
        {s.optional && s.kind !== 'bodyfat' && <button type="button" className="link-btn" id="ob-skip" onClick={skip}>Überspringen</button>}
        {!autoAdvance || value !== undefined ? (
          <button type="button" className="btn primary block ob-next" id="ob-next" disabled={!stepDone(s, answers)} onClick={goOn}>
            {i >= steps.length - 1 ? (round === 1 ? 'Fertig' : 'Plan berechnen') : 'Weiter'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Summary({ answers }: { answers: Answers }) {
  const needs = calorieNeeds(answers);
  const female = answers.sex === 'w';
  const bf = num(answers.bodyfat, 0);
  const name = String(answers.name ?? '').trim();
  const goal = ROUND1.find((x) => x.id === 'goal')!.options!.find((o) => o.v === answers.goal)?.label;
  const level = ROUND1.find((x) => x.id === 'level')!.options!.find((o) => o.v === answers.level)?.label;
  const beginner = answers.level === 'neuling' || answers.level === 'anfaenger';
  return (
    <div className="ob ob-summary" id="round-1-done">
      <p className="ob-section">Fertig</p>
      <h2 className="ob-title">{name ? `Danke, ${name}!` : 'Dein Profil steht'}</h2>
      <div className="card ob-profile">
        {bf > 0 && <FatFigure bf={bf} female={female} size={120} />}
        <ul className="ob-facts">
          {goal && <li><Icon name="target" size={22} /><span><small className="muted">Ziel</small><strong>{goal}</strong></span></li>}
          {level && <li><Icon name="muscle" size={22} /><span><small className="muted">Stufe</small><strong>{level}</strong></span></li>}
          {bf > 0 && <li><Icon name="tape" size={22} /><span><small className="muted">Körperfett</small><strong>ca. {bf} % · {bodyFatLabel(bf, female)}</strong></span></li>}
          {needs && <li><Icon name="flame" size={22} /><span><small className="muted">Kalorien am Tag</small><strong id="ob-kcal">ca. {fmt(needs.target, 0)} kcal</strong></span></li>}
          {needs && <li><Icon name="apple" size={22} /><span><small className="muted">Eiweiß am Tag</small><strong>ca. {needs.protein} g</strong></span></li>}
        </ul>
      </div>
      <p className="muted small">Schätzungen aus deinen Angaben, kein ärztlicher Rat. Du kannst alles später unter „Trainingsplan“ ändern.</p>
      <div className="card ob-next-card">
        <h3><Icon name="dumbbell" size={22} /> Trainingsplan erstellen lassen?</h3>
        <p className="small">{beginner ? 'Empfohlen für dich: Noch ca. 12 kurze Fragen zu deinem Training – dann bekommst du einen fertigen Plan mit einfachen Übungen und Anleitungen.' : 'Noch ca. 12 kurze Fragen zu deinem Training – dann bekommst du einen fertigen Plan.'}</p>
        <a className="btn primary block" href="#/training-fragen" id="ob-to-r2">Plan erstellen lassen</a>
      </div>
      <a className="btn block" href="#/" id="ob-home">Erstmal umschauen</a>
    </div>
  );
}

export const Round1 = () => <Round round={1} />;
export const Round2 = () => <Round round={2} />;

/** Hinweis vor dem Training: Runde 2 noch nicht gemacht → Plan anbieten */
export function Round2Prompt({ onLater }: { onLater: () => void }) {
  return (
    <div className="card r2-prompt" id="r2-prompt">
      <h3><Icon name="target" size={22} /> Erst einen Trainingsplan erstellen lassen?</h3>
      <p className="small">Ca. 12 kurze Fragen (2 Minuten) – dann weißt du genau, welche Übungen du machen sollst, mit Anleitung.</p>
      <div className="row">
        <a className="btn primary grow" href="#/training-fragen" id="r2-go">Los geht's</a>
        <button type="button" className="btn" id="r2-later" onClick={onLater}>Später</button>
      </div>
    </div>
  );
}

export { round1Done };

/** Zeigt den Hinweis nur, solange Runde 2 offen und nicht „später“ gewählt ist */
export function Round2Offer() {
  const { user } = useApp();
  const uid = user?.id ?? 'local';
  const [, setTick] = useState(0);
  const today = todayISO();
  const q = loadQuiz();
  if (q?.plan || !offerRound2(q?.answers, uid, today)) return null;
  return <Round2Prompt onLater={() => { snoozeRound2(uid, today); setTick((t) => t + 1); }} />;
}
