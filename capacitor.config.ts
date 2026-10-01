import type { CapacitorConfig } from '@capacitor/cli'

// Android app (APK) wrapping the built PWA, so it runs fully offline with no
// server. Build: npm run apk (needs the Android SDK and JDK 21; see
// scripts/build-apk.sh). The web app itself is unchanged.
const config: CapacitorConfig = {
  appId: 'app.foundationstrength.workout',
  appName: 'Foundation Strength',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
