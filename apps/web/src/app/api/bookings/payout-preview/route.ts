import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { authenticateHostRequest } from '@/lib/auth/authenticateHostRequest';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { createServiceClient } from '@/lib/supabase/service';
import { previewHostPayoutForBooking } from '@/lib/hostPayouts';

export const dynamic = 'force-dynamic';

/** Host/admin preview of lodging earnings, host fee, and net payout before accepting. */
export async function GET(request: NextRequest) {
  try {
    const hostAuth = await authenticateHostRequest(request);
    let isAdmin = false;
    let hostId: string | null = null;
    let userId: string | null = null;

    if ('response' in hostAuth) {
      const adminAuth = await authenticateAdminRequest(request);
      if ('response' in adminAuth) return hostAuth.response;
      isAdmin = true;
    } else {
      isAdmin = isAdminUser(hostAuth.user);
      hostId = hostAuth.hostId;
      userId = hostAuth.user.id;
    }

    const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim();
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const checkIn = request.nextUrl.searchParams.get('checkIn');
    const checkOut = request.nextUrl.searchParams.get('checkOut');

    const result = await previewHostPayoutForBooking(createServiceClient(), bookingId, {
      checkIn,
      checkOut,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const allowed =
      isAdmin || result.hostId === userId || result.hostId === hostId;
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(result.preview);
  } catch (error: unknown) {
    console.error('[payout-preview GET]', error);
    const message = error instanceof Error ? error.message : 'Failed to preview payout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
