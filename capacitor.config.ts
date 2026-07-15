import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.deal.master.pro',
  appName: 'Deal-Master-PRO',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      "monopolyyy.onrender.com"
    ]
  }
};

export default config;
