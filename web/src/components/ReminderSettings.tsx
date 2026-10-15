// Einstellungen → Erinnerungen: Training, Essen, Wasser, Serie. Geplant wird nur in der App fürs Handy.
import { useState } from 'react';
import { applyReminders, DAYS, planWeek, trainingDays, setReminders, testReminder, useReminders, type ReminderSettings } from '../lib/reminders';
import { isNative } from '../lib/platform';
import { usePro } from '../lib/pro';
import { useGame } from '../app/gameContext';

export function ReminderSettingsCard() {
  const s = useReminders();
  const pro = usePro();
  const gs = useGame();
  const game = gs && gs.status === 'ok' ? gs.data : null;
  const [msg, setMsg] = useState('');
  const week = planWeek();
  const save = async (next: ReminderSettings) => {
    setReminders(next);
    if (!isNative || !game) return;
    const r = await applyReminders({ trainedToday: game.workouts.some((w) => w.date === game.today), weekDone: game.weekDone, weekGoal: game.weekGoal, pro: pro.pro }, true);
    setMsg(r === 'denied' ? 'Mitteilungen sind für Level Up ausgeschaltet. Erlaube sie in den iPhone-Einstellungen → Level Up → Mitteilungen.' : '');
  };
  const days = trainingDays(s, week);
  const toggle = (key: keyof ReminderSettings, on: boolean) => void save({ ...s, [key]: { ...s[key], on } });
  return (
    <>
      {!isNative && (
        <div className="notice" id="rem-web">Erinnerungen aufs Handy gibt es in der App fürs iPhone/Android. Im Browser zeigt dir die Startseite stattdessen einen Hinweis, wenn Trainingstag ist.</div>
      )}
      {msg && <p className="notice small" id="rem-msg">{msg}</p>}
      <div className="card" id="rem-training">
        <label className="check-row"><input type="checkbox" id="rem-training-on" checked={s.training.on} onChange={(e) => toggle('training', e.target.checked)} /><strong>Training</strong></label>
        <p className="muted small">{week.length && !s.training.days ? 'An deinen Trainingstagen aus dem Plan.' : 'An den gewählten Tagen.'} Hast du schon trainiert, kommt für heute keine Erinnerung.</p>
        <div className="rem-days" role="group" aria-label="Trainingstage">
          {DAYS.map((d) => (
            <button key={d} type="button" data-rem-day={d} className={`picker-cat${days.includes(d) ? ' active' : ''}`} aria-pressed={days.includes(d)}
              onClick={() => void save({ ...s, training: { ...s.training, days: days.includes(d) ? days.filter((x) => x !== d) : DAYS.filter((x) => x === d || days.includes(x)) } })}>{d}</button>
          ))}
        </div>
        <label className="rem-time">Uhrzeit<input type="time" id="rem-training-time" value={s.training.time} onChange={(e) => e.target.value && void save({ ...s, training: { ...s.training, time: e.target.value } })} /></label>
      </div>
      <div className="card" id="rem-food">
        <label className="check-row"><input type="checkbox" id="rem-food-on" checked={s.food.on} disabled={!pro.pro} onChange={(e) => toggle('food', e.target.checked)} /><strong>Essen eintragen</strong>{!pro.pro && <span className="pro-tag">Pro</span>}</label>
        <div className="rem-times">
          {['Frühstück', 'Mittag', 'Abend'].map((label, i) => (
            <label key={label} className="rem-time">{label}<input type="time" data-rem-food={i} value={s.food.times[i] ?? '12:00'} onChange={(e) => { if (!e.target.value) return; const times = [...s.food.times]; times[i] = e.target.value; void save({ ...s, food: { ...s.food, times } }); }} /></label>
          ))}
        </div>
      </div>
      <div className="card" id="rem-water">
        <label className="check-row"><input type="checkbox" id="rem-water-on" checked={s.water.on} onChange={(e) => toggle('water', e.target.checked)} /><strong>Wasser trinken</strong></label>
        <div className="rem-times">
          <label className="rem-time">Alle<select id="rem-water-every" value={s.water.every} onChange={(e) => void save({ ...s, water: { ...s.water, every: Number(e.target.value) } })}>{[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h} Std.</option>)}</select></label>
          <label className="rem-time">Von<input type="time" value={s.water.from} onChange={(e) => e.target.value && void save({ ...s, water: { ...s.water, from: e.target.value } })} /></label>
          <label className="rem-time">Bis<input type="time" value={s.water.to} onChange={(e) => e.target.value && void save({ ...s, water: { ...s.water, to: e.target.value } })} /></label>
        </div>
      </div>
      <div className="card" id="rem-streak">
        <label className="check-row"><input type="checkbox" id="rem-streak-on" checked={s.streak.on} onChange={(e) => toggle('streak', e.target.checked)} /><strong>Serie retten</strong></label>
        <p className="muted small">Sonntags, wenn dein Wochenziel noch nicht erreicht ist.</p>
        <label className="rem-time">Uhrzeit<input type="time" value={s.streak.time} onChange={(e) => e.target.value && void save({ ...s, streak: { ...s.streak, time: e.target.value } })} /></label>
      </div>
      {isNative && <button type="button" className="btn block" id="rem-test" onClick={async () => setMsg((await testReminder()) ? 'Test-Erinnerung kommt in 10 Sekunden – sperr ruhig das Handy.' : 'Mitteilungen sind ausgeschaltet. Erlaube sie in den iPhone-Einstellungen → Level Up.')}>Test-Erinnerung in 10 Sek.</button>}
    </>
  );
}
