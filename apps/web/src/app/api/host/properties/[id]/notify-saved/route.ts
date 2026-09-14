import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { createServiceClient } from '@/lib/supabase/service';
import { dispatchListingSavedEmail } from '@/lib/notifications/dispatchListingSavedEmail';

/**
 * Sends the listing confirmation for saves that happen straight from the browser (the new-listing
 * wizard inserts the row itself), so the host still gets the email with admins on CC.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveHostPropertyAccess(params.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action === 'updated' ? 'updated' : 'created';

  await dispatchListingSavedEmail({
    service: createServiceClient(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin,
    propertyId: params.id,
    action,
    actorEmail: access.user.email ?? null,
    savedByTeam: access.isAdmin && access.property.host_id !== access.user.id,
  });

  return NextResponse.json({ success: true });
}
