/** Normalize user input to E.164 (+country + number). Defaults US/CA when 10 digits. */
export type PhoneValidation =
  | { ok: true; phone: string }
  | { ok: false; error: string };

export function normalizePhoneE164(
  raw: string,
  defaultCountryCode = '1'
): PhoneValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Phone number is required' };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) {
    return {
      ok: false,
      error: 'Enter a valid phone number with country code (e.g. +1 555 123 4567)',
    };
  }

  let national = digits;
  if (trimmed.startsWith('+')) {
    national = digits;
  } else if (digits.length === 10) {
    national = `${defaultCountryCode}${digits}`;
  } else if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
    national = digits;
  }

  if (national.length < 11 || national.length > 15) {
    return {
      ok: false,
      error: 'Enter a valid phone number in international format (e.g. +1 555 123 4567)',
    };
  }

  return { ok: true, phone: `+${national}` };
}

export function validateSignupPhone(raw: string): PhoneValidation {
  return normalizePhoneE164(raw);
}
