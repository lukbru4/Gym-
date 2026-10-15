// Nur native App: Benachrichtigung am Ende der Pause – auch wenn die App im Hintergrund ist
// oder das Handy gesperrt. Im Browser passiert hier nichts (dort gibt es Ton/Vibration im Timer).
import { Haptics, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './platform';

const ID = 4711;
let asked = false;

async function allowed(): Promise<boolean> {
  let { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted' && !asked) {
    asked = true; // nur einmal pro App-Start fragen
    ({ display } = await LocalNotifications.requestPermissions());
  }
  return display === 'granted';
}

export async function scheduleRestEnd(endAt: number) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID }] });
    if (endAt <= Date.now() || !(await allowed())) return;
    await LocalNotifications.schedule({
      notifications: [{ id: ID, title: 'Pause vorbei 💪', body: 'Weiter geht’s – nächster Satz!', schedule: { at: new Date(endAt), allowWhileIdle: true } }],
    });
  } catch {
    /* ohne Benachrichtigung weiter */
  }
}

export async function cancelRestEnd() {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID }] });
  } catch {
    /* ignorieren */
  }
}

/** Kurzes Vibrieren am Pausenende (iPhones kennen navigator.vibrate nicht) */
export function restEndHaptic() {
  if (isNative) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
