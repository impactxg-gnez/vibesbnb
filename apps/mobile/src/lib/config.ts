import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  supabaseUrl: (extra.supabaseUrl as string) || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey:
    (extra.supabaseAnonKey as string) || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  apiUrl: (extra.apiUrl as string) || process.env.EXPO_PUBLIC_API_URL || 'https://vibesbnb.com',
};

export function isConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
