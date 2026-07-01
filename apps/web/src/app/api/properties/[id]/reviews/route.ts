import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  enrichReviewsWithProfiles,
  sortReviewsForDisplay,
} from '@/lib/reviews/enrichReviews';
import { getReviewEligibility } from '@/lib/reviews/eligibility';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id?.trim();
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id required' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select(
        'id, property_id, rating, comment, created_at, is_team_review, reviewer_name, user_id'
      )
      .eq('property_id', propertyId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/properties/[id]/reviews]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = await enrichReviewsWithProfiles(supabase, data ?? []);
    const reviews = sortReviewsForDisplay(enriched);

    return NextResponse.json({ reviews });
  } catch (e) {
    console.error('[GET /api/properties/[id]/reviews]', e);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id?.trim();
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id required' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to leave a review' }, { status: 401 });
  }

  let body: { rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rating = Number(body.rating);
  const comment = String(body.comment ?? '').trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }
  if (!comment) {
    return NextResponse.json({ error: 'Please write a review comment' }, { status: 400 });
  }

  const eligibility = await getReviewEligibility(
    createServiceClient(),
    user.id,
    propertyId
  );
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: eligibility.reason || 'You cannot review this property' },
      { status: 403 }
    );
  }

  const service = createServiceClient();
  const { data: property, error: propertyError } = await service
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error('[POST /api/properties/[id]/reviews] property lookup', propertyError);
    return NextResponse.json({ error: propertyError.message }, { status: 500 });
  }
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      property_id: propertyId,
      user_id: user.id,
      rating: Math.round(rating),
      comment,
      status: 'pending',
      is_team_review: false,
    })
    .select(
      'id, property_id, rating, comment, created_at, status, is_team_review, reviewer_name, user_id'
    )
    .single();

  if (insertError) {
    console.error('[POST /api/properties/[id]/reviews] insert', insertError);
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already reviewed this property' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      review,
      message: 'Thanks! Your review was submitted and is pending approval.',
    },
    { status: 201 }
  );
}
