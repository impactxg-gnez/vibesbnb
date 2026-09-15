import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getReviewInviteByToken } from '@/lib/reviews/invites';
import { listingCardImagesFromRow } from '@/lib/propertyImageUrls';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = decodeURIComponent(params.token || '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Invite token required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const invite = await getReviewInviteByToken(supabase, token);
    if (!invite) {
      return NextResponse.json({ error: 'This review link is invalid or has been disabled.' }, { status: 404 });
    }

    const { data: property, error } = await supabase
      .from('properties')
      .select('id, name, title, location, images, cover_image, status')
      .eq('id', invite.property_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    if (property.status && property.status !== 'active') {
      return NextResponse.json(
        { error: 'This listing is not currently accepting reviews.' },
        { status: 404 }
      );
    }

    const images = listingCardImagesFromRow(property as Record<string, unknown>);
    return NextResponse.json({
      invite: { id: invite.id, property_id: invite.property_id },
      property: {
        id: property.id,
        name: property.name || property.title || 'Stay',
        location: property.location || '',
        image: images[0] || null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load invite';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
