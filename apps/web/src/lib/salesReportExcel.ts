import ExcelJS from 'exceljs';
import type { SalesReport } from '@/lib/salesReport';

function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Build an .xlsx buffer for admin sales / payout review. */
export async function buildSalesReportWorkbook(
  report: SalesReport
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'VibesBNB';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 36 },
    { header: 'Amount (USD)', key: 'amount', width: 18 },
  ];
  summary.addRows([
    { metric: 'Period', amount: report.period },
    { metric: 'Period start (UTC)', amount: report.period_start },
    { metric: 'Period end (UTC)', amount: report.period_end },
    { metric: 'Service fee % (admin)', amount: report.service_fee_percent },
    { metric: 'Sales tax %', amount: report.sales_tax_percent },
    { metric: 'Tourist & development tax %', amount: report.tourist_tax_percent },
    { metric: '', amount: '' },
    { metric: 'Guest sales (paid)', amount: money(report.summary.guest_sales) },
    { metric: 'Refunds / cancelled', amount: money(report.summary.refunds) },
    { metric: 'Net guest sales', amount: money(report.summary.net_guest_sales) },
    { metric: 'Host transfers (to pay hosts)', amount: money(report.summary.host_transfer) },
    {
      metric: 'VibesBNB service fee (kept)',
      amount: money(report.summary.service_fee),
    },
    { metric: 'Sales tax (VibesBNB remits)', amount: money(report.summary.sales_tax) },
    {
      metric: 'Tourist tax (VibesBNB remits)',
      amount: money(report.summary.tourist_tax),
    },
    { metric: 'Total taxes to remit', amount: money(report.summary.taxes_total) },
    { metric: 'Paid bookings', amount: report.summary.paid_bookings_count },
    { metric: 'Refund bookings', amount: report.summary.refund_bookings_count },
    { metric: 'All bookings in period', amount: report.summary.bookings_count },
  ]);
  summary.getRow(1).font = { bold: true };

  const daily = wb.addWorksheet('Daily breakdown');
  daily.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Guest sales', key: 'sales', width: 14 },
    { header: 'Refunds', key: 'refunds', width: 12 },
    { header: 'Host transfer', key: 'host_transfer', width: 14 },
    { header: 'Service fee', key: 'service_fee', width: 12 },
    { header: 'Sales tax', key: 'sales_tax', width: 12 },
    { header: 'Tourist tax', key: 'tourist_tax', width: 12 },
    { header: 'Taxes total', key: 'taxes_total', width: 12 },
    { header: 'Bookings', key: 'bookings', width: 10 },
  ];
  daily.getRow(1).font = { bold: true };
  for (const b of report.breakdown) {
    daily.addRow({
      date: b.date,
      sales: money(b.sales),
      refunds: money(b.refunds),
      host_transfer: money(b.host_transfer),
      service_fee: money(b.service_fee),
      sales_tax: money(b.sales_tax),
      tourist_tax: money(b.tourist_tax),
      taxes_total: money(b.taxes_total),
      bookings: b.bookings,
    });
  }

  const detail = wb.addWorksheet('Booking detail');
  detail.columns = [
    { header: 'Booking ID', key: 'booking_id', width: 38 },
    { header: 'Created at', key: 'created_at', width: 22 },
    { header: 'Check-in', key: 'check_in', width: 12 },
    { header: 'Check-out', key: 'check_out', width: 12 },
    { header: 'Property', key: 'property_name', width: 28 },
    { header: 'Host', key: 'host_name', width: 22 },
    { header: 'Host ID', key: 'host_id', width: 38 },
    { header: 'Booking status', key: 'booking_status', width: 14 },
    { header: 'Payment status', key: 'payment_status', width: 14 },
    { header: 'Payout status', key: 'payout_status', width: 12 },
    { header: 'Guest total', key: 'guest_total', width: 12 },
    { header: 'Host transfer', key: 'host_transfer', width: 14 },
    { header: 'Service fee', key: 'service_fee', width: 12 },
    { header: 'Sales tax', key: 'sales_tax', width: 12 },
    { header: 'Tourist tax', key: 'tourist_tax', width: 12 },
    { header: 'Taxes total', key: 'taxes_total', width: 12 },
    { header: 'Cleaning fee', key: 'cleaning_fee', width: 12 },
    { header: 'Is refund', key: 'is_refund', width: 10 },
  ];
  detail.getRow(1).font = { bold: true };
  for (const r of report.rows) {
    detail.addRow({
      ...r,
      guest_total: money(r.guest_total),
      host_transfer: money(r.host_transfer),
      service_fee: money(r.service_fee),
      sales_tax: money(r.sales_tax),
      tourist_tax: money(r.tourist_tax),
      taxes_total: money(r.taxes_total),
      cleaning_fee: money(r.cleaning_fee),
      is_refund: r.is_refund ? 'yes' : 'no',
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
