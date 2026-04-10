'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, Check, X, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

interface Payout {
  id: string;
  host_id: string;
  host_name: string;
  host_email: string;
  property_name: string;
  bank_name?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reason?: string;
}

export default function ManagePayoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    loadPayouts();
  }, []);

  useEffect(() => {
    let filtered = payouts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.host_name.toLowerCase().includes(query) ||
          p.host_email.toLowerCase().includes(query) ||
          p.property_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredPayouts(filtered);
  }, [searchQuery, statusFilter, payouts]);

  const loadPayouts = async () => {
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization)
        throw new Error('No valid session — please sign in again.');

      const response = await fetch('/api/admin/payouts', {
        headers: { ...headers },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load payouts');
      }

      const list: Payout[] = data.payouts || [];
      setPayouts(list);
      setFilteredPayouts(list);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load payouts');
      setPayouts([]);
      setFilteredPayouts([]);
    }
  };

  const handleApprovePayout = async (payoutId: string) => {
    try {
      const authHeaders = await getHeadersForAdminFetch();
      if (!authHeaders.Authorization)
        throw new Error('No valid session — please sign in again.');

      const response = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ payoutAccountId: payoutId, status: 'approved' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to approve');

      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: 'approved' as const } : p))
      );
      setFilteredPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: 'approved' as const } : p))
      );
      toast.success('Payout account verified');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to approve payout'
      );
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason) return;

    try {
      const authHeaders = await getHeadersForAdminFetch();
      if (!authHeaders.Authorization)
        throw new Error('No valid session — please sign in again.');

      const response = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ payoutAccountId: payoutId, status: 'rejected' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId ? { ...p, status: 'rejected' as const, reason } : p
        )
      );
      setFilteredPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId ? { ...p, status: 'rejected' as const, reason } : p
        )
      );
      toast.success('Payout account suspended');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reject payout'
      );
    }
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Payout</h1>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search payouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payout.host_name}</div>
                          <div className="text-sm text-gray-500">{payout.host_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payout.bank_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.property_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payout.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            payout.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : payout.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {payout.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprovePayout(payout.id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                              title="Approve"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectPayout(payout.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {payout.status === 'rejected' && payout.reason && (
                          <span className="text-xs text-red-600" title={payout.reason}>
                            {payout.reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

