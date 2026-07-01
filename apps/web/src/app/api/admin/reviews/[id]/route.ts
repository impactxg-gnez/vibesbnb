import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const reviewId = params.id?.trim();
  if (!reviewId) {
    return NextResponse.json({ error: 'Review id required' }, { status: 400 });
  }

  let body: { status?: ReviewStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = body.status;
  if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
    return NextResponse.json(
      { error: 'status must be pending, approved, or rejected' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: review, error } = await supabase
    .from('reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select('*')
    .single();

  if (error) {
    console.error('[admin/reviews PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  try {
    await invalidatePropertyListingCaches(review.property_id);
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ review });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAdminRequest(request);
  if ('response' in auth) return auth.response;

  const reviewId = params.id?.trim();
  if (!reviewId) {
    return NextResponse.json({ error: 'Review id required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('reviews')
    .select('property_id')
    .eq('id', reviewId)
    .maybeSingle();

  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);

  if (error) {
    console.error('[admin/reviews DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing?.property_id) {
    try {
      await invalidatePropertyListingCaches(existing.property_id);
    } catch {
      /* non-blocking */
    }
  }

  return NextResponse.json({ success: true });
}
