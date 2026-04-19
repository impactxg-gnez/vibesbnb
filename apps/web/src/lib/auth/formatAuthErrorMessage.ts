/**
 * Maps Supabase Auth / GoTrue errors to clearer copy for users.
 * Rate limits often come from double-submit, resend spam, or project SMTP quotas.
 */
export function formatAuthErrorMessage(error: { message?: string; code?: string; status?: number } | null): string {
  if (!error) return 'Something went wrong';
  const code = String(error.code ?? '').toLowerCase();
  const msg = String(error.message ?? '').toLowerCase();

  const isRateLimited =
    error.status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code.includes('rate') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('too many emails') ||
    msg.includes('email rate limit') ||
    msg.includes('only request this once');

  if (isRateLimited) {
    return 'Too many verification emails were sent from this browser or network. Please wait a few minutes, then try again or use Sign in if you already created an account.';
  }

  return error.message || 'Something went wrong';
}
