import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** List all reviews (admin). */
export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/reviews] GET', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [] });
}

/** Create a VibesBNB team review for a property. */
export async function POST(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let body: {
    property_id?: string;
    rating?: number;
    comment?: string;
    reviewer_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const propertyId = String(body.property_id ?? '').trim();
  const comment = String(body.comment ?? '').trim();
  const rating = Number(body.rating);
  const reviewerName = String(body.reviewer_name ?? 'VibesBNB Team').trim() || 'VibesBNB Team';

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }
  if (!comment) {
    return NextResponse.json({ error: 'comment is required' }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 });
  }

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error('[admin/reviews] property lookup', propertyError);
    return NextResponse.json({ error: propertyError.message }, { status: 500 });
  }
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      property_id: propertyId,
      rating: Math.round(rating),
      comment,
      status: 'approved',
      is_team_review: true,
      reviewer_name: reviewerName,
      user_id: null,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[admin/reviews] insert', insertError);
    const hint =
      insertError.message.includes('is_team_review') ||
      insertError.message.includes('reviewer_name')
        ? ' Run SUPABASE_REVIEWS_UPDATE.sql in the Supabase SQL editor.'
        : '';
    return NextResponse.json(
      { error: `${insertError.message}${hint}` },
      { status: 500 }
    );
  }

  // Recompute property aggregates so cards/search reflect VibesBNB reviews immediately.
  try {
    const { data: approvedRows, error: aggErr } = await supabase
      .from('reviews')
      .select('rating,is_team_review')
      .eq('property_id', propertyId)
      .eq('status', 'approved');
    if (!aggErr && approvedRows) {
      const count = approvedRows.length;
      const avg =
        count > 0
          ? approvedRows.reduce((sum, r: any) => sum + (Number(r.rating) || 0), 0) / count
          : 0;
      const hasTeam = approvedRows.some((r: any) => r.is_team_review === true);
      await supabase
        .from('properties')
        .update({
          rating: Number.isFinite(avg) ? Number(avg.toFixed(1)) : 0,
          reviews_count: count,
          has_team_review: hasTeam,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);
    }
  } catch (e) {
    console.warn('[admin/reviews] aggregate update failed', e);
  }

  // Bust cached browse payload so card lists update quickly.
  try {
    await invalidatePropertyListingCaches(propertyId);
  } catch {
    /* ignore */
  }

  return NextResponse.json({ review }, { status: 201 });
}
