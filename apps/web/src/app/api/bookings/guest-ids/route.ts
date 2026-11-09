import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabaseFromRequest } from '@/lib/auth/getUserFromRequest';
import { createServiceClient } from '@/lib/supabase/service';
import { GUEST_ID_BUCKET } from '@/lib/guestIdDocuments';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Sign in to upload guest IDs' }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const slot = Number(form.get('slot'));
  const file = form.get('file');
  if (!Number.isInteger(slot) || slot < 0 || slot > 30) {
    return NextResponse.json({ error: 'Invalid guest slot' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size < 32) {
    return NextResponse.json({ error: 'Choose a photo or PDF of the guest ID' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'ID file must be 8 MB or smaller' }, { status: 400 });
  }
  const type = file.type || 'image/jpeg';
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, or PDF' }, { status: 400 });
  }

  const ext =
    type === 'application/pdf'
      ? 'pdf'
      : type === 'image/png'
        ? 'png'
        : type === 'image/webp'
          ? 'webp'
          : 'jpg';
  const path = `${auth.user.id}/checkout/${Date.now()}-g${slot}.${ext}`;
  const service = createServiceClient();
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await service.storage.from(GUEST_ID_BUCKET).upload(path, body, {
    contentType: type,
    upsert: false,
  });

  if (error) {
    const missing = /bucket/i.test(error.message || '');
    return NextResponse.json(
      {
        error: missing
          ? 'Guest ID storage is not set up. Create a private bucket named guest-id-docs in Supabase.'
          : error.message || 'Upload failed',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    storage_path: path,
    file_name: file.name,
    slot,
  });
}
