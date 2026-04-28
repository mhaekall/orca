import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animescraperpro.app',
  appName: 'Orca',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    errorPath: 'index.html'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    }
  }
};

export default config;
