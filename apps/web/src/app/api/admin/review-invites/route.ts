import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { createServiceClient } from '@/lib/supabase/service';
import {
  generateReviewInviteToken,
  getActiveReviewInvite,
} from '@/lib/reviews/invites';

function inviteHint(message: string): string {
  if (message.includes('review_invites') || message.includes('schema cache')) {
    return ' Run SUPABASE_REVIEW_INVITES.sql in the Supabase SQL editor.';
  }
  return '';
}

/** List the active invite for a property (if any). */
export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const propertyId = request.nextUrl.searchParams.get('property_id')?.trim() || '';
  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const invite = await getActiveReviewInvite(supabase, propertyId);
    return NextResponse.json({ invite });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load invite';
    return NextResponse.json({ error: `${message}${inviteHint(message)}` }, { status: 500 });
  }
}

/** Create an invite, or return the existing active one. Pass rotate=true to replace it. */
export async function POST(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  let body: { property_id?: string; rotate?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const propertyId = String(body.property_id ?? '').trim();
  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, status')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) {
    return NextResponse.json({ error: propertyError.message }, { status: 500 });
  }
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }
  if (property.status && property.status !== 'active') {
    return NextResponse.json(
      { error: 'Choose an active listing to generate a review link.' },
      { status: 400 }
    );
  }

  try {
    if (!body.rotate) {
      const existing = await getActiveReviewInvite(supabase, propertyId);
      if (existing) {
        return NextResponse.json({ invite: existing, created: false });
      }
    } else {
      await supabase
        .from('review_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('property_id', propertyId)
        .is('revoked_at', null);
    }

    const { data: invite, error: insertError } = await supabase
      .from('review_invites')
      .insert({
        token: generateReviewInviteToken(),
        property_id: propertyId,
        created_by: auth.user.id.startsWith('demo-') ? null : auth.user.id,
      })
      .select('id, token, property_id, created_by, created_at, revoked_at')
      .single();

    if (insertError || !invite) {
      const message = insertError?.message || 'Failed to create invite';
      return NextResponse.json(
        { error: `${message}${inviteHint(message)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ invite, created: true }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create invite';
    return NextResponse.json({ error: `${message}${inviteHint(message)}` }, { status: 500 });
  }
}
