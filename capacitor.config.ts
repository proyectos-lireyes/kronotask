import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chronotask.app',
  appName: 'KronoTask',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.google.com',
      'accounts.google.com',
      '*.googleusercontent.com',
    ],
  },
};

export default config;
