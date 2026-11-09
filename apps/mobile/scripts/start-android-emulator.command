#!/bin/bash
export JAVA_HOME="$HOME/.jdks/temurin-17/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
echo "Starting Pixel 7 (Android 15) emulator…"
exec emulator -avd Pixel_7_API_35 -gpu swiftshader_indirect -no-metrics -netdelay none -netspeed full
