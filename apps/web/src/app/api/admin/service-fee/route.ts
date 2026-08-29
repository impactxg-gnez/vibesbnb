import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { getPlatformSettings, upsertPlatformFees } from '@/lib/platformSettings';

export const dynamic = 'force-dynamic';

function parseFee(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const service = createServiceClient();
    const settings = await getPlatformSettings(service);
    return NextResponse.json({
      serviceFeePercent: settings.serviceFeePercent,
      hostFeePercent: settings.hostFeePercent,
      updatedAt: settings.updatedAt,
      migrationRequired: settings.migrationRequired,
    });
  } catch (e: unknown) {
    console.error('[admin/service-fee GET]', e);
    const message = e instanceof Error ? e.message : 'Failed to load platform fees';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const serviceRaw = body.serviceFeePercent ?? body.service_fee_percent;
    const hostRaw = body.hostFeePercent ?? body.host_fee_percent;

    const serviceFee =
      serviceRaw != null ? parseFee(serviceRaw) : undefined;
    const hostFee = hostRaw != null ? parseFee(hostRaw) : undefined;

    if (serviceRaw != null && serviceFee == null) {
      return NextResponse.json(
        { error: 'serviceFeePercent must be between 0 and 100' },
        { status: 400 }
      );
    }
    if (hostRaw != null && hostFee == null) {
      return NextResponse.json(
        { error: 'hostFeePercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const settings = await upsertPlatformFees(service, {
      ...(serviceFee != null ? { serviceFeePercent: serviceFee } : {}),
      ...(hostFee != null ? { hostFeePercent: hostFee } : {}),
    });

    if (settings.migrationRequired) {
      return NextResponse.json(
        {
          error:
            'platform_settings table missing or incomplete. Run SUPABASE_PLATFORM_SETTINGS.sql and SUPABASE_PLATFORM_HOST_FEE.sql in Supabase.',
          migrationRequired: true,
          serviceFeePercent: settings.serviceFeePercent,
          hostFeePercent: settings.hostFeePercent,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      serviceFeePercent: settings.serviceFeePercent,
      hostFeePercent: settings.hostFeePercent,
      updatedAt: settings.updatedAt,
      migrationRequired: false,
    });
  } catch (e: unknown) {
    console.error('[admin/service-fee PATCH]', e);
    const message = e instanceof Error ? e.message : 'Failed to save platform fees';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
