'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Wallet,
  Building2,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

type BreakdownRow = {
  date: string;
  sales: number;
  refunds: number;
  host_transfer: number;
  service_fee: number;
  sales_tax: number;
  tourist_tax: number;
  taxes_total: number;
  bookings: number;
};

type DetailRow = {
  booking_id: string;
  created_at: string;
  property_name: string | null;
  host_name: string | null;
  payment_status: string | null;
  payout_status: string | null;
  guest_total: number;
  host_transfer: number;
  service_fee: number;
  taxes_total: number;
  is_refund: boolean;
};

type ReportData = {
  period: string;
  service_fee_percent: number;
  sales_tax_percent: number;
  tourist_tax_percent: number;
  summary: {
    guest_sales: number;
    refunds: number;
    net_guest_sales: number;
    host_transfer: number;
    service_fee: number;
    sales_tax: number;
    tourist_tax: number;
    taxes_total: number;
    bookings_count: number;
    paid_bookings_count: number;
    refund_bookings_count: number;
  };
  breakdown: BreakdownRow[];
  rows: DetailRow[];
};

function money(n: number) {
  return `$${(Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReportManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [loadingReports, setLoadingReports] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization)
        throw new Error('No valid session — please sign in again.');

      const response = await fetch(
        `/api/admin/reports?period=${encodeURIComponent(period)}`,
        { headers: { ...headers } }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reports');
      }

      setReportData({
        period: data.period,
        service_fee_percent: data.service_fee_percent,
        sales_tax_percent: data.sales_tax_percent,
        tourist_tax_percent: data.tourist_tax_percent,
        summary: data.summary,
        breakdown: data.breakdown || [],
        rows: data.rows || [],
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to load reports'
      );
    } finally {
      setLoadingReports(false);
    }
  }, [period]);

  useEffect(() => {
    if (user && isAdminUser(user)) {
      loadReports();
    }
  }, [user?.id, loadReports]);

  useEffect(() => {
    if (!user || !isAdminUser(user)) return;
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(t);
      t = setTimeout(() => loadReports(), 500);
    };
    const ch = supabase.channel('admin-reports-bookings');
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      schedule
    );
    ch.subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [user?.id, loadReports]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization)
        throw new Error('No valid session — please sign in again.');

      const response = await fetch(
        `/api/admin/reports?period=${encodeURIComponent(period)}&format=xlsx`,
        { headers: { ...headers } }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibesbnb-sales-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel report downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading || loadingReports) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdminUser(user)) {
    return null;
  }

  const s = reportData?.summary;

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales &amp; payout report</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review guest sales, host transfers, VibesBNB service fee, and taxes to remit.
              {reportData
                ? ` Service fee ${reportData.service_fee_percent}% · sales tax ${reportData.sales_tax_percent}% · tourist tax ${reportData.tourist_tax_percent}%.`
                : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="day">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exporting || !reportData}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Exporting…' : 'Download Excel'}
            </button>
          </div>
        </div>

        {reportData && s ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                label="Guest sales"
                value={money(s.guest_sales)}
                hint={`${s.paid_bookings_count} paid booking${s.paid_bookings_count === 1 ? '' : 's'}`}
                icon={<TrendingUp className="w-5 h-5 text-green-500" />}
              />
              <SummaryCard
                label="Host transfers"
                value={money(s.host_transfer)}
                hint="To pay hosts (lodging + cleaning)"
                icon={<Wallet className="w-5 h-5 text-emerald-600" />}
              />
              <SummaryCard
                label="VibesBNB service fee"
                value={money(s.service_fee)}
                hint={`${reportData.service_fee_percent}% platform keep`}
                icon={<Building2 className="w-5 h-5 text-purple-500" />}
              />
              <SummaryCard
                label="Taxes to remit"
                value={money(s.taxes_total)}
                hint={`Sales ${money(s.sales_tax)} · Tourist ${money(s.tourist_tax)}`}
                icon={<Receipt className="w-5 h-5 text-amber-600" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <SummaryCard
                label="Refunds / cancelled"
                value={money(s.refunds)}
                hint={`${s.refund_bookings_count} booking${s.refund_bookings_count === 1 ? '' : 's'}`}
                icon={<TrendingDown className="w-5 h-5 text-red-500" />}
              />
              <SummaryCard
                label="Net guest sales"
                value={money(s.net_guest_sales)}
                hint="Sales minus refunds"
                icon={<DollarSign className="w-5 h-5 text-blue-500" />}
              />
              <SummaryCard
                label="All bookings"
                value={String(s.bookings_count)}
                hint="Including pending / unpaid"
                icon={<Calendar className="w-5 h-5 text-gray-500" />}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Daily breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        'Date',
                        'Sales',
                        'Refunds',
                        'Host transfer',
                        'Service fee',
                        'Taxes',
                        'Bookings',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No data available for this period
                        </td>
                      </tr>
                    ) : (
                      reportData.breakdown.map((item) => (
                        <tr key={item.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">{item.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-green-700">
                            {money(item.sales)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-red-600">
                            {money(item.refunds)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            {money(item.host_transfer)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-purple-700">
                            {money(item.service_fee)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-amber-800">
                            {money(item.taxes_total)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            {item.bookings}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-gray-900">Booking detail (review)</h2>
                <p className="text-xs text-gray-500">Full detail is in the Excel download</p>
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {[
                        'Property',
                        'Host',
                        'Guest total',
                        'Host transfer',
                        'Service fee',
                        'Taxes',
                        'Payment',
                        'Payout',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No bookings in this period
                        </td>
                      </tr>
                    ) : (
                      reportData.rows.map((row) => (
                        <tr
                          key={row.booking_id}
                          className={`hover:bg-gray-50 ${row.is_refund ? 'bg-red-50/40' : ''}`}
                        >
                          <td className="px-4 py-3 text-gray-900 max-w-[180px]">
                            <span className="line-clamp-2">
                              {row.property_name || 'Stay'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {row.host_name || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{money(row.guest_total)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{money(row.host_transfer)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-purple-700">
                            {money(row.service_fee)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-amber-800">
                            {money(row.taxes_total)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 capitalize">
                            {row.is_refund ? 'refund' : row.payment_status || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 capitalize">
                            {row.payout_status || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No report data available</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}
