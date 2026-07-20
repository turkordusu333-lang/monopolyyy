import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.deal.master.pro',
  appName: 'Deal-Master-PRO',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      "16.170.166.112"
    ]
  }
};

export default config;
