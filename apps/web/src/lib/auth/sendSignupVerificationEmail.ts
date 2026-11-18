import { sendEmail } from '@/lib/email/mailer';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import { signupVerificationEmailHtml } from '@/lib/email/signupVerificationEmail';
import { normalizeSignupEmail } from '@/lib/auth/validateSignupEmail';

export type SendSignupVerificationResult =
  | { ok: true; sent: boolean }
  | { ok: false; error: string };

function appOrigin(fallback?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim();
  const origin = (fallback || fromEnv || '').replace(/\/$/, '').trim();
  return origin;
}

/**
 * Generate a Supabase auth confirm/magic link and deliver it via Resend.
 * Prefer this over Supabase's built-in Auth mailer (often rate-limited / undelivered).
 */
export async function sendSignupVerificationEmail(params: {
  email: string;
  /** Browser origin, e.g. https://vibesbnb.com */
  origin?: string | null;
  password?: string;
  fullName?: string;
  role?: string;
}): Promise<SendSignupVerificationResult> {
  if (!hasServiceRoleKey()) {
    return { ok: false, error: 'Service role key missing; cannot generate verification link.' };
  }

  const email = normalizeSignupEmail(params.email);
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Valid email is required.' };
  }

  const origin = appOrigin(params.origin);
  if (!origin) {
    return { ok: false, error: 'App origin is required for the verification redirect.' };
  }

  const redirectTo = `${origin}/auth/callback?type=signup`;
  const service = createServiceClient();
  const isHost = params.role === 'host' || params.role === 'host_pending';

  // After client signUp the user already exists — magiclink confirms email and signs them in.
  // Optional password path (signup link) is for callers that create the user via admin.
  let actionLink: string | null = null;

  if (params.password) {
    const { data, error } = await service.auth.admin.generateLink({
      type: 'signup',
      email,
      password: params.password,
      options: {
        redirectTo,
        data: {
          ...(params.fullName ? { full_name: params.fullName } : {}),
          ...(params.role ? { role: params.role } : {}),
        },
      },
    });
    if (!error && data?.properties?.action_link) {
      actionLink = data.properties.action_link;
    } else if (error) {
      console.warn('[sendSignupVerificationEmail] signup link:', error.message);
    }
  }

  if (!actionLink) {
    const { data, error } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) {
      console.warn('[sendSignupVerificationEmail] generateLink failed:', error?.message);
      // Avoid account enumeration — treat as soft success when user may not exist
      return { ok: true, sent: false };
    }
    if (data.user?.email_confirmed_at) {
      return { ok: true, sent: false };
    }
    actionLink = data.properties.action_link;
  }

  const result = await sendEmail({
    to: email,
    subject: isHost
      ? 'Confirm your VibesBNB host email'
      : 'Confirm your VibesBNB email',
    html: signupVerificationEmailHtml({
      confirmUrl: actionLink,
      email,
      isHost,
    }),
  });

  if (!result.success) {
    console.error('[sendSignupVerificationEmail] Send error:', result.error);
    return { ok: false, error: result.error || 'Failed to send verification email.' };
  }

  return { ok: true, sent: true };
}
