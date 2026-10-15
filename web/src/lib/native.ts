// Nur in der nativen App: Statusleiste passend zu Hell/Dunkel, Android-Zurück-Taste.
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { subscribeTheme } from './themeStore';

function syncStatusBar() {
  const t = document.documentElement.dataset.theme;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  // Style.Dark = helle Schrift für dunklen Hintergrund
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}

export function initNative() {
  syncStatusBar();
  subscribeTheme(syncStatusBar);
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && location.hash && location.hash !== '#/') history.back();
    else App.exitApp();
  });
}
