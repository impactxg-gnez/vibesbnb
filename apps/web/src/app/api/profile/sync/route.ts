import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncProfileFromAuthUser } from '@/lib/supabase/syncProfileFromAuthUser';

export const dynamic = 'force-dynamic';

/** Sync auth email / phone into `profiles` for the signed-in user. */
export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
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
