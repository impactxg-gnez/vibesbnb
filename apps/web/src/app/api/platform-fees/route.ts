import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getPlatformSettings } from '@/lib/platformSettings';

export const dynamic = 'force-dynamic';

/** Public read of current platform fee percentages (no auth). */
export async function GET() {
  try {
    const service = createServiceClient();
    const settings = await getPlatformSettings(service);
    return NextResponse.json({
      serviceFeePercent: settings.serviceFeePercent,
      hostFeePercent: settings.hostFeePercent,
      updatedAt: settings.updatedAt,
    });
  } catch (e: unknown) {
    console.error('[platform-fees GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load platform fees';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
