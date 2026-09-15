/**
 * Confirms a Firebase Phone Auth ID token via Identity Toolkit.
 * Avoids `firebase-admin` in the serverless route (that import crashes the
 * Vercel function and Next then serves the static HTML 500 page).
 */
export function isFirebaseIdLookupConfigured(): boolean {
  return Boolean((process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim());
}

export async function phoneFromFirebaseIdToken(
  idToken: string
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, error: 'Firebase is not configured on this deployment.' };
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    users?: Array<{ phoneNumber?: string }>;
  };

  if (!res.ok) {
    const msg = String(body.error?.message || '');
    if (msg.includes('INVALID_ID_TOKEN') || msg.includes('TOKEN_EXPIRED')) {
      return { ok: false, error: 'SMS session expired. Request a new code and try again.' };
    }
    return { ok: false, error: 'Could not verify the SMS code session.' };
  }

  const phone = body.users?.[0]?.phoneNumber?.trim() || '';
  if (!phone) {
    return { ok: false, error: 'Firebase token does not include a verified phone number.' };
  }
  return { ok: true, phone };
}
