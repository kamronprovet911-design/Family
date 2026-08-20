import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kamronprovet.family',
  appName: 'Моя семья',
  webDir: 'mobile-web',
  server: {
    url: 'https://famgeo.onrender.com',
    cleartext: false,
    allowNavigation: ['famgeo.onrender.com', '*.supabase.co'],
  },
  android: { allowMixedContent: false },
};

export default config;
