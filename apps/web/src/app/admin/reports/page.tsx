'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

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
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.user_metadata?.role === 'admin') {
      loadReports();
    }
  }, [user, period]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const supabase = createClient();
      const now = new Date();
      let startDate: Date;

      if (period === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const breakdown: { [key: string]: { income: number; refunds: number; bookings: number } } = {};

      let totalIncome = 0;
      let totalRefunds = 0;

      bookingsData?.forEach((booking) => {
        const date = new Date(booking.created_at).toLocaleDateString();
        if (!breakdown[date]) {
          breakdown[date] = { income: 0, refunds: 0, bookings: 0 };
        }

        if (booking.status === 'cancelled') {
          breakdown[date].refunds += Number(booking.total_price || 0);
          totalRefunds += Number(booking.total_price || 0);
        } else {
          breakdown[date].income += Number(booking.total_price || 0);
          totalIncome += Number(booking.total_price || 0);
        }
        breakdown[date].bookings += 1;
      });

      const breakdownArray = Object.entries(breakdown).map(([date, data]) => ({
        date,
        ...data,
      }));

      setReportData({
        period: period,
        total_income: totalIncome,
        total_refunds: totalRefunds,
        net_income: totalIncome - totalRefunds,
        bookings_count: bookingsData?.length || 0,
        breakdown: breakdownArray,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

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

  if (!user || user.user_metadata?.role !== 'admin') {
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <h3 className="text-sm font-medium text-mist-500">Total Income</h3>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData.total_income.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-mist-500">Total Refunds</h3>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData.total_refunds.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-mist-500">Net Income</h3>
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${reportData.net_income.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-mist-500">Total Bookings</h3>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                        Income
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                        Refunds
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                        Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                        Bookings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-mist-500">
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
            <Calendar className="w-16 h-16 text-mist-400 mx-auto mb-4" />
            <p className="text-mist-500">No report data available</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

