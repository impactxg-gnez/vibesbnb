'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

interface ReportData {
  period: string;
  total_income: number;
  total_refunds: number;
  net_income: number;
  bookings_count: number;
  breakdown: {
    date: string;
    income: number;
    refunds: number;
    bookings: number;
  }[];
}

export default function ReportManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [loadingReports, setLoadingReports] = useState(true);

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
        total_income: data.total_income,
        total_refunds: data.total_refunds,
        net_income: data.net_income,
        bookings_count: data.bookings_count,
        breakdown: data.breakdown || [],
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
  }, [user, loadReports]);

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
  }, [user, loadReports]);

  const handleExport = () => {
    if (!reportData) return;
    // In a real app, this would generate and download a CSV/PDF
    toast.success('Export feature coming soon');
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

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>
          <div className="flex items-center gap-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="day">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData.total_income.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Refunds</h3>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData.total_refunds.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Net Income</h3>
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData.net_income.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{reportData.bookings_count}</p>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Daily Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Income
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Refunds
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No data available for this period
                        </td>
                      </tr>
                    ) : (
                      reportData.breakdown.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ${item.income.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            ${item.refunds.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(item.income - item.refunds).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.bookings}
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

