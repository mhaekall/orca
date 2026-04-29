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
      serverClientId: '475749423464-e2dq5kmtgdehbbb369f0nvr86f73gpl0.apps.googleusercontent.com',
      androidClientId: '475749423464-pbmr1a7p4994qj4rt7l1s45etaqda87q.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  },
};

export default config;
