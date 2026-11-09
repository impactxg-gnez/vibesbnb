#!/usr/bin/env bash
set -euo pipefail
export JAVA_HOME="${JAVA_HOME:-$HOME/.jdks/temurin-17/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

AVD="${1:-Pixel_7_API_35}"
exec emulator -avd "$AVD" -gpu swiftshader_indirect -no-metrics
