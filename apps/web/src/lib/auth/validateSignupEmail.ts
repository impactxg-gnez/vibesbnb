/**
 * Client-side signup email checks (format, disposable domains, junk TLDs).
 * True verification is enforced via Supabase email confirmation + app gates.
 */

const EMAIL_FORMAT =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** TLDs / domains commonly used for throwaway signups (not exhaustive). */
const BLOCKED_TLDS = new Set([
  'shit',
  'fake',
  'invalid',
  'test',
  'example',
  'localhost',
  'local',
  'zzz',
  'wtf',
  'ninja',
]);

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'sharklasers.com',
  'grr.la',
  'spam4.me',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  '10minutemail.com',
  '10minutemail.net',
  'minutemail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'getnada.com',
  'nada.email',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'throwaway.email',
  'mailnesia.com',
  'mintemail.com',
  'mytemp.email',
  'tempail.com',
  'emailondeck.com',
  'getairmail.com',
  'mailcatch.com',
  'mohmal.com',
  'spamgourmet.com',
  'mailnull.com',
  'spambox.us',
  'mailscrap.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'discardmail.de',
  'mailtemp.info',
  'mailsac.com',
  'inboxkitten.com',
  'tmpmail.net',
  'tmpmail.org',
  'burnermail.io',
  'crazymailing.com',
  'mailpoof.com',
  'fakemail.net',
  'tempinbox.com',
  'mail.tm',
  'emailfake.com',
  'generator.email',
  'dropmail.me',
  'harakirimail.com',
  'mailinator.xyz',
]);

const DISPOSABLE_DOMAIN_PATTERNS = [
  /^temp/i,
  /^trash/i,
  /^fake/i,
  /^spam/i,
  /^throwaway/i,
  /^disposable/i,
  /^minute/i,
  /^mohmal/i,
  /mailinator/i,
  /guerrillamail/i,
  /yopmail/i,
];

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type SignupEmailValidation = { ok: true; email: string } | { ok: false; error: string };

export function validateSignupEmail(raw: string): SignupEmailValidation {
  const email = normalizeSignupEmail(raw);

  if (!email) {
    return { ok: false, error: 'Email is required.' };
  }
  if (email.length > 254) {
    return { ok: false, error: 'Email address is too long.' };
  }
  if (!EMAIL_FORMAT.test(email)) {
    return {
      ok: false,
      error: 'Enter a valid email address (e.g. you@gmail.com).',
    };
  }

  const [local, domain] = email.split('@');
  if (!local || !domain || !domain.includes('.')) {
    return { ok: false, error: 'Enter a valid email address with a real domain.' };
  }

  const tld = domain.split('.').pop() ?? '';
  if (tld.length < 2 || !/^[a-z]{2,24}$/i.test(tld)) {
    return { ok: false, error: 'Email domain looks invalid. Use a real email provider.' };
  }
  if (BLOCKED_TLDS.has(tld.toLowerCase())) {
    return { ok: false, error: 'That email domain is not allowed. Use a real inbox you can access.' };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      error: 'Temporary or disposable email addresses are not allowed. Use your real email.',
    };
  }
  if (DISPOSABLE_DOMAIN_PATTERNS.some((re) => re.test(domain))) {
    return {
      ok: false,
      error: 'Temporary or disposable email addresses are not allowed. Use your real email.',
    };
  }

  if (local.length < 2) {
    return { ok: false, error: 'Email address looks too short.' };
  }

  return { ok: true, email };
}
