import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getReviewEligibility } from '@/lib/reviews/eligibility';

export async function GET(
  _request: NextRequest,
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
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const eligibility = await getReviewEligibility(
    createServiceClient(),
    user.id,
    propertyId
  );
  return NextResponse.json(eligibility);
}
