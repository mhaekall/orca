import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animescraperpro.app',
  appName: 'Orca',
  webDir: 'out',
  server: {
    androidScheme: 'https',
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
  },
};

export default config;
