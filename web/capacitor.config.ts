// Native Apps (iOS/Android) mit Capacitor: verpackt den Web-Build (dist/) in eine App.
// appId ist die eindeutige Kennung in App Store und Play Store – nach der ersten Store-Veröffentlichung
// nicht mehr änderbar.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lukbru4.levelup',
  appName: 'Level Up',
  webDir: 'dist',
  backgroundColor: '#0a0a0a',
  ios: { contentInset: 'never' },
  plugins: {
    LocalNotifications: { iconColor: '#ff6a00' },
  },
};

export default config;
