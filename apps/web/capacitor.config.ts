import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animescraperpro.app',
  appName: 'Orca',
  webDir: 'out',
  server: {
    allowNavigation: [
      'accounts.google.com',
      'jonyyyyyyyu-anime-scraper-api.hf.space',
      'orcanime.pages.dev'
    ]
  },
  plugins: {
    // Status bar transparan — konten bisa extend ke bawah status bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#00000000',
      overlaysWebView: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '475749423464-4eqtfgbmjfvj7jsi999vcap2mcug5lip.apps.googleusercontent.com',
    }
  },
};

export default config;
