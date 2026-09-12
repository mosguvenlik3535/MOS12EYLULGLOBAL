import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MOSBARKODYAZILIM — Android uygulaması (Capacitor)
 * webDir: vite build çıktısı (tek dosyalık dist/index.html).
 * Android tarafında localStorage, fetch, WebRTC ve tarayıcı API'leri doğrudan çalışır.
 */
const config: CapacitorConfig = {
  appId: 'com.mosbarkodyazilim.pos',
  appName: 'MOSBARKODYAZILIM',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
