import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t || null;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = trimOrNull(body.email)?.toLowerCase() || null;
    const phone = trimOrNull(body.phone);
    const propertyId = trimOrNull(body.propertyId);
    const source = trimOrNull(body.source) || 'listing_exit';

    if (!email && !phone) {
      return NextResponse.json({ error: 'Enter an email or mobile number.' }, { status: 400 });
    }
    if (email && !looksLikeEmail(email)) {
      return NextResponse.json({ error: 'That email does not look valid.' }, { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service.from('listing_leads').insert({
      property_id: propertyId,
      email,
      phone,
      source,
    });

    if (error) {
      if (error.code === '42P01' || /listing_leads/i.test(error.message || '')) {
        return NextResponse.json(
          {
            error:
              'Lead capture is not set up yet. Run SUPABASE_LISTING_LEADS.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[leads POST]', error);
    const message = error instanceof Error ? error.message : 'Could not save your details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
