import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const BUCKET = 'property-images';
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type DecodedImage = { buffer: Buffer; contentType: string };

function decodeDataUrl(dataUrl: string): DecodedImage | { error: string } {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) {
    return { error: 'Expected a base64 image data URL' };
  }

  const contentType = match[1].toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    return { error: `Unsupported image type: ${contentType}` };
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength === 0) {
    return { error: 'Image data was empty' };
  }
  if (buffer.byteLength > MAX_BYTES) {
    return { error: 'Image is larger than 4 MB after compression' };
  }

  return { buffer, contentType };
}

/** The bucket is created on demand so deployments need no manual storage setup. */
async function ensureBucket(storage: ReturnType<typeof createServiceClient>['storage']) {
  const { data, error } = await storage.getBucket(BUCKET);
  if (data && !error) return;

  const { error: createError } = await storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });

  // A parallel save may have created it first.
  if (createError && !/already exists/i.test(createError.message)) {
    throw createError;
  }
}

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

    const decoded = decodeDataUrl(body.dataUrl);
    if ('error' in decoded) {
      return NextResponse.json({ error: decoded.error }, { status: 400 });
    }

    const service = createServiceClient();
    await ensureBucket(service.storage);

    const extension = EXTENSIONS[decoded.contentType] ?? 'jpg';
    const unique =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${params.id}/${unique}.${extension}`;

    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, decoded.buffer, {
      contentType: decoded.contentType,
      cacheControl: '31536000',
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = service.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl, path });
  } catch (error: unknown) {
    console.error('[host/properties images POST]', error);
    const message = error instanceof Error ? error.message : 'Photo upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
