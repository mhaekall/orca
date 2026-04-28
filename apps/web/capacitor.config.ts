import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animescraperpro.app',
  appName: 'Orca',
  webDir: 'out',
  server: {
    androidScheme: 'https'
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
