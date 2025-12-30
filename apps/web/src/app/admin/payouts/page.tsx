'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, Check, X, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Payout {
  id: string;
  host_id: string;
  host_name: string;
  host_email: string;
  booking_id: string;
  property_name: string;
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
    if (!loading && user && user.user_metadata?.role !== 'admin') {
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
    // In a real app, you'd fetch from a payouts table
    const mockPayouts: Payout[] = [
      {
        id: 'payout1',
        host_id: 'host1',
        host_name: 'Jane Host',
        host_email: 'jane@example.com',
        booking_id: 'booking1',
        property_name: 'Cozy Mountain Cabin',
        amount: 850.0,
        status: 'pending',
        requested_at: new Date().toISOString(),
      },
      {
        id: 'payout2',
        host_id: 'host2',
        host_name: 'John Host',
        host_email: 'john@example.com',
        booking_id: 'booking2',
        property_name: 'Beachfront Villa',
        amount: 1200.0,
        status: 'approved',
        requested_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    setPayouts(mockPayouts);
    setFilteredPayouts(mockPayouts);
  };

  const handleApprovePayout = async (payoutId: string) => {
    try {
      setPayouts(payouts.map((p) => (p.id === payoutId ? { ...p, status: 'approved' as const } : p)));
      setFilteredPayouts(
        filteredPayouts.map((p) => (p.id === payoutId ? { ...p, status: 'approved' as const } : p))
      );
      toast.success('Payout approved');
    } catch (error) {
      toast.error('Failed to approve payout');
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setPayouts(
        payouts.map((p) =>
          p.id === payoutId ? { ...p, status: 'rejected' as const, reason } : p
        )
      );
      setFilteredPayouts(
        filteredPayouts.map((p) =>
          p.id === payoutId ? { ...p, status: 'rejected' as const, reason } : p
        )
      );
      toast.success('Payout rejected');
    } catch (error) {
      toast.error('Failed to reject payout');
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

  if (!user || user.user_metadata?.role !== 'admin') {
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-mist-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search payouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-mist-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payout.host_name}</div>
                          <div className="text-sm text-mist-500">{payout.host_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payout.property_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-mist-500">
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

