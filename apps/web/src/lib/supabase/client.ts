import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // If credentials are not available, return a mock client that won't work
  // but will allow the build to succeed
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured. Authentication will not work.');
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey);
}

