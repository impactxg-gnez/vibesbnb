import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import {
  getPlatformSettings,
  upsertServiceFeePercent,
} from '@/lib/platformSettings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const settings = await getPlatformSettings(service);
    return NextResponse.json({
      serviceFeePercent: settings.serviceFeePercent,
      updatedAt: settings.updatedAt,
      migrationRequired: settings.migrationRequired,
    });
  } catch (e: unknown) {
    console.error('[admin/service-fee GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load service fee';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const raw = body.serviceFeePercent ?? body.service_fee_percent;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: 'serviceFeePercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const settings = await upsertServiceFeePercent(service, n);

    if (settings.migrationRequired) {
      return NextResponse.json(
        {
          error:
            'platform_settings table missing. Run SUPABASE_PLATFORM_SETTINGS.sql in Supabase.',
          migrationRequired: true,
          serviceFeePercent: settings.serviceFeePercent,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      serviceFeePercent: settings.serviceFeePercent,
      updatedAt: settings.updatedAt,
      migrationRequired: false,
    });
  } catch (e: unknown) {
    console.error('[admin/service-fee PATCH]', e);
    const message = e instanceof Error ? e.message : 'Failed to save service fee';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
