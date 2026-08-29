import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest';
import { syncProfileFromAuthUser } from '@/lib/supabase/syncProfileFromAuthUser';

export const dynamic = 'force-dynamic';

/** Sync auth email / phone into `profiles` for the signed-in user. */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await syncProfileFromAuthUser(user);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[profile/sync]', e);
    const message = e instanceof Error ? e.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
