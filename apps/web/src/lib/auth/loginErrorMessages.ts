const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'Google sign-in was cancelled. Try again when you are ready.',
  missing_code:
    'The sign-in link was invalid or expired. Please try Google sign-in again.',
  auth_callback:
    'Could not complete Google sign-in. Please try again. If it keeps failing, make sure you stay on the same site address (www or non-www) for the whole sign-in.',
  not_configured:
    'Authentication is not configured on this deployment. Contact support if this persists.',
};

export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return LOGIN_ERROR_MESSAGES[code] ?? 'Sign-in failed. Please try again.';
}
