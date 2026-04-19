import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveFeaturedRetreatsForHome } from '@/lib/featuredRetreatsResolve';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { retreats, source, displayCount } = await resolveFeaturedRetreatsForHome(supabase);
    return NextResponse.json({ retreats, source, displayCount });
  } catch (error: unknown) {
    console.error('[featured-retreats] GET', error);
    const message = error instanceof Error ? error.message : 'Failed to load featured vibes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
