import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { buildSalesReport, type ReportPeriod } from '@/lib/salesReport';
import { buildSalesReportWorkbook } from '@/lib/salesReportExcel';

export const dynamic = 'force-dynamic';

const VALID_PERIODS: ReportPeriod[] = ['day', 'week', 'month', 'custom', 'all'];

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const periodParam = request.nextUrl.searchParams.get('period') || 'month';
    if (!VALID_PERIODS.includes(periodParam as ReportPeriod)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
    const period = periodParam as ReportPeriod;
    const startYmd = request.nextUrl.searchParams.get('start');
    const endYmd = request.nextUrl.searchParams.get('end');
    const format = (request.nextUrl.searchParams.get('format') || 'json').toLowerCase();

    if (period === 'custom' && startYmd && !/^\d{4}-\d{2}-\d{2}$/.test(startYmd)) {
      return NextResponse.json({ error: 'Invalid start date (use YYYY-MM-DD)' }, { status: 400 });
    }
    if (period === 'custom' && endYmd && !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) {
      return NextResponse.json({ error: 'Invalid end date (use YYYY-MM-DD)' }, { status: 400 });
    }

    const service = createServiceClient();
    const report = await buildSalesReport(service, period, {
      startYmd,
      endYmd,
    });

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await buildSalesReportWorkbook(report);
      const stamp = new Date().toISOString().slice(0, 10);
      const rangePart =
        period === 'custom' || period === 'all'
          ? `${report.period_start.slice(0, 10)}_to_${report.period_end.slice(0, 10)}`
          : period;
      const filename = `vibesbnb-sales-report-${rangePart}-${stamp}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Backward-compatible aliases for the existing UI fields
    return NextResponse.json({
      ...report,
      total_income: report.summary.guest_sales,
      total_refunds: report.summary.refunds,
      net_income: report.summary.net_guest_sales,
      bookings_count: report.summary.bookings_count,
    });
  } catch (e: unknown) {
    console.error('[admin/reports]', e);
    const message = e instanceof Error ? e.message : 'Failed to load reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
