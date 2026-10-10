// Läuft die App als native App (iOS/Android über Capacitor) oder im Browser?
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

/** Öffentliche Web-Adresse der App: Links in E-Mails und Einladungen zeigen immer hierhin,
 *  denn die native App hat keine aufrufbare Adresse (capacitor://localhost). */
export const WEB_URL = 'https://lukbru4.github.io/Gym-/';

export const publicUrl = () => (isNative ? WEB_URL : location.origin + location.pathname);
