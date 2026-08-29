import { ExpoConfig, ConfigContext } from 'expo/config';

const BUNDLE_ID = 'com.vibesbnb.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'VibesBNB',
  slug: 'vibesbnb',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'vibesbnb',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    associatedDomains: ['applinks:vibesbnb.com', 'applinks:www.vibesbnb.com'],
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#0a0a0a',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'vibesbnb.com', pathPrefix: '/listings' },
          { scheme: 'https', host: 'vibesbnb.com', pathPrefix: '/bookings' },
          { scheme: 'https', host: 'vibesbnb.com', pathPrefix: '/messages' },
          { scheme: 'https', host: 'vibesbnb.com', pathPrefix: '/host' },
          { scheme: 'https', host: 'www.vibesbnb.com', pathPrefix: '/listings' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0a0a0a',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#22c55e',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'd9ecb945-9d20-4dce-b43f-44a443cd4693',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://vibesbnb.com',
  },
});
