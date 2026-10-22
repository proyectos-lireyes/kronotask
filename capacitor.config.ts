import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.proyectoslireyes.kronotask',
  appName: 'KronoTask',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
