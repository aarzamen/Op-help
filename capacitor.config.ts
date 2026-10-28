import type { CapacitorConfig } from '@capacitor/cli';

// iOS app shell around the same build the website serves (`npm run build` → dist/).
// The web assets are bundled into the app, so it works offline from the first launch.
const config: CapacitorConfig = {
  appId: 'com.aarzamen.opord',
  appName: 'OPORD',
  webDir: 'dist',
  // The page paints its own safe-area padding (viewport-fit=cover + env(safe-area-inset-*)).
  backgroundColor: '#F2F0EB',
  ios: {
    contentInset: 'never',
  },
};

export default config;
