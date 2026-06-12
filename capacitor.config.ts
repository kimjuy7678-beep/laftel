import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laftel.app',
  appName: 'Laftel',
  webDir: 'out',
  server: {
    url: 'https://laftel-eta.vercel.app',
    cleartext: true,
  },
};

export default config;