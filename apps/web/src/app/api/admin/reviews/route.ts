import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { createServiceClient } from '@/lib/supabase/service';
import { recomputePropertyReviewAggregates } from '@/lib/reviews/aggregates';

/** List all reviews (admin). */
export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const supabase = createServiceClient();
  const status = request.nextUrl.searchParams.get('status')?.trim();

  let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[admin/reviews] GET', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [] });
}

/** Create a VibesBNB team review for a property (no booking required). */
export async function POST(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const supabase = createServiceClient();

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
    await recomputePropertyReviewAggregates(supabase, propertyId);
  } catch (e) {
    console.warn('[admin/reviews] aggregate update failed', e);
  }

  return NextResponse.json({ review }, { status: 201 });
}
