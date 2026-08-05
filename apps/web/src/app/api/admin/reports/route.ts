import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { buildSalesReport, type ReportPeriod } from '@/lib/salesReport';
import { buildSalesReportWorkbook } from '@/lib/salesReportExcel';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const periodParam = request.nextUrl.searchParams.get('period') || 'month';
    if (!['day', 'week', 'month'].includes(periodParam)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
    const period = periodParam as ReportPeriod;
    const format = (request.nextUrl.searchParams.get('format') || 'json').toLowerCase();

    const service = createServiceClient();
    const report = await buildSalesReport(service, period);

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await buildSalesReportWorkbook(report);
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `vibesbnb-sales-report-${period}-${stamp}.xlsx`;
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
