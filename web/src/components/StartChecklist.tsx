// Startseite: „Deine ersten Schritte“ – bis alles erledigt oder ausgeblendet ist.
import { useSyncExternalStore } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { useLive } from '../lib/live';
import { checklistHidden, hideChecklist, useOnboardingTick } from '../lib/onboarding';
import { loadQuiz, subscribeQuiz } from '../lib/plan';
import { useReminders } from '../lib/reminders';

export function StartChecklist({ workoutCount }: { workoutCount: number }) {
  const { api, dataVersion } = useApp();
  useOnboardingTick();
  const hasPlan = useSyncExternalStore(subscribeQuiz, () => Boolean(loadQuiz()?.plan));
  const rem = useReminders();
  const live = useLive('friend');
  const friends = useAsync(async () => (api.social ? api.social.friends() : []), [api, dataVersion, live]);
  if (checklistHidden()) return null;
  const items: { id: string; text: string; href: string; done: boolean }[] = [
    { id: 'plan', text: 'Trainingsplan erstellen', href: '#/trainingsplan', done: hasPlan },
    { id: 'training', text: 'Erstes Training eintragen', href: '#/workouts', done: workoutCount > 0 },
    ...(api.social ? [{ id: 'friend', text: 'Einen Freund hinzufügen', href: '#/freunde', done: friends.status === 'ok' && friends.data.some((f) => f.status === 'friend') }] : []),
    { id: 'reminders', text: 'Erinnerungen einschalten', href: '#/konto/erinnerungen', done: rem.training.on || rem.food.on || rem.water.on || rem.streak.on },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <div className="card start-list" id="start-checklist">
      <div className="block-head">
        <h3>Deine ersten Schritte</h3>
        <span className="muted small" id="start-progress">{done} / {items.length}</span>
      </div>
      <div className="start-bar"><i style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul>
        {items.map((i) => (
          <li key={i.id} className={i.done ? 'done' : ''} data-step={i.id}>
            {i.done ? <span className="start-check">✓</span> : <span className="start-dot" />}
            {i.done ? <span>{i.text}</span> : <a href={i.href}>{i.text} ›</a>}
          </li>
        ))}
      </ul>
      <button type="button" className="link-btn muted small" id="start-hide" onClick={hideChecklist}>Ausblenden</button>
    </div>
  );
}
