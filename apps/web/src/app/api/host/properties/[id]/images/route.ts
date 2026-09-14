import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import {
  decodePropertyImage,
  ensurePropertyImageBucket,
  storePropertyImage,
} from '@/lib/propertyImageStorage';

export const dynamic = 'force-dynamic';

/** Editor uploads arrive already downscaled, so anything larger is a client bug. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Store one property photo and return its public URL.
 * Photos belong in storage: embedding them in the property row makes the editor's
 * PATCH body exceed the serverless request limit and bloats every property read.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            'Server missing SUPABASE_SERVICE_ROLE_KEY, so photos cannot be stored. Add it in Vercel environment variables and redeploy.',
        },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { dataUrl?: unknown };
    if (typeof body.dataUrl !== 'string' || !body.dataUrl) {
      return NextResponse.json({ error: 'dataUrl is required' }, { status: 400 });
    }

    const decoded = decodePropertyImage(body.dataUrl, MAX_UPLOAD_BYTES);
    if ('error' in decoded) {
      return NextResponse.json({ error: decoded.error }, { status: 400 });
    }

    const service = createServiceClient();
    await ensurePropertyImageBucket(service);
    const url = await storePropertyImage(service, params.id, decoded);

    return NextResponse.json({ url });
  } catch (error: unknown) {
    console.error('[host/properties images POST]', error);
    const message = error instanceof Error ? error.message : 'Photo upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
