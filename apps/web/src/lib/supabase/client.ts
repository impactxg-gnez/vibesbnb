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
  
  // createBrowserClient automatically handles cookies in the browser
  // It reads from document.cookie and writes to it
  const client = createBrowserClient(supabaseUrl, supabaseKey);
  
  // Ensure session is refreshed on client creation
  // This helps if cookies exist but session isn't loaded yet
  if (typeof window !== 'undefined') {
    client.auth.getSession().catch((error) => {
      // Silently handle - session might not exist yet
      console.debug('[Supabase Client] Session check:', error.message);
    });
  }
  
  return client;
}

