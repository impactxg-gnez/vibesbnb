import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/** Host submits Adapted program proof photo for an accessibility claim. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const propertyId = String(body?.propertyId || '');
    const featureKey = String(body?.featureKey || '').trim();
    const imageUrl = String(body?.imageUrl || '').trim();
    const caption = body?.caption ? String(body.caption).trim() : null;

    if (!propertyId || !featureKey || !imageUrl) {
      return NextResponse.json(
        { error: 'propertyId, featureKey, and imageUrl are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceClient();
    const { data: property } = await service
      .from('properties')
      .select('id, host_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || property.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: proof, error } = await service
      .from('property_accessibility_proofs')
      .insert({
        property_id: propertyId,
        feature_key: featureKey,
        image_url: imageUrl,
        caption,
        status: 'pending',
      })
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await service
      .from('properties')
      .update({ adapted_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', propertyId);

    return NextResponse.json({ ok: true, id: proof?.id });
  } catch (e) {
    console.error('[accessibility-proofs]', e);
    return NextResponse.json({ error: 'Failed to submit proof' }, { status: 500 });
  }
}
