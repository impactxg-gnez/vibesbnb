import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { createServiceClient, createSupabaseForAdminApi } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function bearerToken(req: NextRequest): string {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAdminRequest(req);
  if ('response' in auth) return auth.response;

  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const supabase = createSupabaseForAdminApi(bearerToken(req));

  const { data, error } = await supabase
    .from('property_accessibility_proofs')
    .select('id, property_id, feature_key, image_url, caption, status, created_at, properties(name, title)')
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    // Table may not exist until SQL migration is applied
    return NextResponse.json({ error: error.message, proofs: [] }, { status: 200 });
  }

  const proofs = (data || []).map((row: any) => ({
    id: row.id,
    property_id: row.property_id,
    feature_key: row.feature_key,
    image_url: row.image_url,
    caption: row.caption,
    status: row.status,
    created_at: row.created_at,
    property_name: row.properties?.name || row.properties?.title || null,
  }));

  return NextResponse.json({ proofs });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateAdminRequest(req);
  if ('response' in auth) return auth.response;

  const body = await req.json();
  const id = String(body?.id || '');
  const status = body?.status === 'approved' || body?.status === 'rejected' ? body.status : null;
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: proof, error } = await supabase
    .from('property_accessibility_proofs')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    })
    .eq('id', id)
    .select('property_id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!proof) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (status === 'approved' && proof.property_id) {
    const { data: pending } = await supabase
      .from('property_accessibility_proofs')
      .select('id')
      .eq('property_id', proof.property_id)
      .eq('status', 'pending')
      .limit(1);

    await supabase
      .from('properties')
      .update({
        adapted_status: pending?.length ? 'pending' : 'verified',
        updated_at: new Date().toISOString(),
      })
      .eq('id', proof.property_id);
  }

  if (status === 'rejected' && proof.property_id) {
    await supabase
      .from('properties')
      .update({ adapted_status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', proof.property_id);
  }

  return NextResponse.json({ ok: true });
}
