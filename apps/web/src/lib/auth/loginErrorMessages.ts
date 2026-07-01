const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'Google sign-in was cancelled. Try again when you are ready.',
  missing_code:
    'The sign-in link was invalid or expired. Please try Google sign-in again.',
  auth_callback:
    'Could not complete Google sign-in. Ensure Google is enabled in Supabase (Authentication → Providers) and your redirect URLs include https://www.vibesbnb.com/auth/callback.',
  not_configured:
    'Authentication is not configured on this deployment. Contact support if this persists.',
};

export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return LOGIN_ERROR_MESSAGES[code] ?? 'Sign-in failed. Please try again.';
}
