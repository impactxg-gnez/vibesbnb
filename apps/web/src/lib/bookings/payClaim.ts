import { createHmac, timingSafeEqual } from 'crypto';

const CLAIM_TTL_SECONDS = 60 * 60 * 24 * 14;

type ClaimPayload = {
  b: string;
  u: string;
  exp: number;
};

function claimSecret(): string | null {
  const secret = (
    process.env.BOOKING_PAY_CLAIM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
  return secret || null;
}

function signBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/** Signed token that lets the guest open (and pay) one booking from an email link. */
export function createBookingPayClaim(bookingId: string, userId: string): string | null {
  const secret = claimSecret();
  if (!secret || !bookingId || !userId) return null;

  const payload: ClaimPayload = {
    b: bookingId,
    u: userId,
    exp: Math.floor(Date.now() / 1000) + CLAIM_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${signBody(body, secret)}`;
}

export function verifyBookingPayClaim(
  token: string | null | undefined,
  bookingId: string
): { userId: string } | null {
  const secret = claimSecret();
  if (!secret || !token || !bookingId) return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signBody(body, secret);

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ClaimPayload;
    if (payload.b !== bookingId || typeof payload.u !== 'string' || !payload.u) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: payload.u };
  } catch {
    return null;
  }
}
