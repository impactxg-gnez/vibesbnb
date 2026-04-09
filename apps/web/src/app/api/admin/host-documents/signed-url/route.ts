import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

const BUCKET = 'host-verification-docs';

/** Short-lived signed URL for private bucket objects (seconds). */
const SIGNED_URL_TTL_SECONDS = 3600;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const documentId = request.nextUrl.searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId query parameter is required' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data: row, error: rowError } = await service
      .from('host_verification_documents')
      .select('storage_path')
      .eq('id', documentId)
      .maybeSingle();

    if (rowError) throw rowError;
    if (!row?.storage_path) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const path = row.storage_path as string;
    const { data: signed, error: signError } = await service.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error('[host-documents/signed-url]', signError);
      return NextResponse.json(
        {
          error:
            signError?.message ||
            'Could not create signed URL. Check bucket name and service role access.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } catch (e: unknown) {
    console.error('[admin/host-documents/signed-url]', e);
    const message =
      e instanceof Error ? e.message : 'Failed to create signed URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
