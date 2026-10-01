#!/usr/bin/env bash
# Builds the Android app: web build -> Capacitor sync -> Gradle.
# Needs JDK 21 and the Android SDK (platform 36). Defaults match this
# machine's user-local installs; override JAVA_HOME / ANDROID_HOME if needed.
#
# Usage: scripts/build-apk.sh [debug|release|aab]   (default: debug)
#   debug   -> unsigned debug sideload APK -> release/foundation-strength-<ver>.apk
#   release -> signed release APK (needs android/keystore.properties or
#              FS_KEYSTORE* env vars; see scripts/make-keystore.sh) ->
#              release/foundation-strength-<ver>-release.apk
#   aab     -> signed release Android App Bundle (what Play Store requires) ->
#              release/foundation-strength-<ver>.aab
#
# `release`/`aab` fail fast with a clear message if signing isn't configured;
# `debug` is unaffected either way.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-debug}"

export JAVA_HOME="${JAVA_HOME_21:-$HOME/Android/jdk21}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
[ -f android/local.properties ] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties

npm run build
npx cap sync android

VERSION="$(node -p "require('./package.json').version")"
mkdir -p release

case "$MODE" in
  debug)
    (cd android && ./gradlew assembleDebug --no-daemon -q)
    cp android/app/build/outputs/apk/debug/app-debug.apk "release/foundation-strength-$VERSION.apk"
    ls -la "release/foundation-strength-$VERSION.apk"
    ;;
  release)
    (cd android && ./gradlew assembleRelease --no-daemon -q)
    cp android/app/build/outputs/apk/release/app-release.apk "release/foundation-strength-$VERSION-release.apk"
    ls -la "release/foundation-strength-$VERSION-release.apk"
    ;;
  aab)
    (cd android && ./gradlew bundleRelease --no-daemon -q)
    cp android/app/build/outputs/bundle/release/app-release.aab "release/foundation-strength-$VERSION.aab"
    ls -la "release/foundation-strength-$VERSION.aab"
    ;;
  *)
    echo "Unknown mode: $MODE (expected debug, release, or aab)" >&2
    exit 1
    ;;
esac
