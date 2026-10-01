#!/usr/bin/env bash
# Builds the Android APK: web build -> Capacitor sync -> Gradle debug build.
# Needs JDK 21 and the Android SDK (platform 36). Defaults match this
# machine's user-local installs; override JAVA_HOME / ANDROID_HOME if needed.
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME_21:-$HOME/Android/jdk21}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
[ -f android/local.properties ] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties
npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug --no-daemon -q)
mkdir -p release
cp android/app/build/outputs/apk/debug/app-debug.apk "release/foundation-strength-$(node -p "require('./package.json').version").apk"
ls -la release/*.apk
