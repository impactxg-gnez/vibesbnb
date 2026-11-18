import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkBrokenIcalLinks } from '@/lib/calendar/checkBrokenIcalService';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorizeCronOrAdmin(request: NextRequest): boolean {
  const secret = process.env.CALENDAR_CRON_SECRET ?? process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret');

  if (secret && (bearer === secret || headerSecret === secret)) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const isCronAuthorized = authorizeCronOrAdmin(request);
    let adminUser = null;

    if (!isCronAuthorized) {
      const auth = await authenticateAdminRequest(request);
      if ('response' in auth) {
        return auth.response;
      }
      adminUser = auth.user;
    }

    const service = createServiceClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin);

    const body = await request.json().catch(() => ({}));
    const calendarId = body.calendarId ? String(body.calendarId) : undefined;
    const propertyId = body.propertyId ? String(body.propertyId) : undefined;

    console.log('[check-broken-icals] Starting health check scan...');
    const result = await checkBrokenIcalLinks(service, appUrl, { calendarId, propertyId });
    console.log('[check-broken-icals] Finished:', {
      checked: result.checked,
      healthy: result.healthy,
      broken: result.broken,
      alertsSent: result.alertsSent,
    });

    return NextResponse.json({
      ok: true,
      summary: {
        checked: result.checked,
        healthy: result.healthy,
        broken: result.broken,
        alertsSent: result.alertsSent,
      },
      details: result.details,
      triggeredBy: adminUser ? `admin:${adminUser.email}` : 'cron',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Calendar health check failed';
    console.error('[check-broken-icals] Error:', error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for simple ping / cron triggers
  return POST(request);
}
