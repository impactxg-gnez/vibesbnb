'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Check, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

interface BankAccountRow {
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

interface TransferRow {
  id: string;
  booking_id: string;
  host_id: string;
  host_name: string;
  host_email: string | null;
  property_name: string | null;
  check_in: string | null;
  check_out: string | null;
  guest_total: number;
  platform_fee: number;
  host_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  transfer_ref: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  bank_name: string | null;
  bank_status: string | null;
}

type MainTab = 'accounts' | 'transfers';
type TransferStatusFilter = 'pending' | 'paid' | 'cancelled' | 'all';

function money(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function shortDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = String(value).split('T')[0];
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString();
  } catch {
    return d;
  }
}

export default function ManagePayoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>('accounts');

  // Bank accounts
  const [payouts, setPayouts] = useState<BankAccountRow[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<BankAccountRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );

  // Transfers
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [transferStatus, setTransferStatus] = useState<TransferStatusFilter>('pending');
  const [transferSearch, setTransferSearch] = useState('');
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadBankAccounts = useCallback(async () => {
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization)
        throw new Error('No valid session — please sign in again.');

      const response = await fetch('/api/admin/payouts?type=accounts', {
        headers: { ...headers },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load payouts');
      }

      const list: BankAccountRow[] = data.payouts || [];
      setPayouts(list);
      setFilteredPayouts(list);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load payouts');
      setPayouts([]);
      setFilteredPayouts([]);
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization)
        throw new Error('No valid session — please sign in again.');

      const params = new URLSearchParams({ type: 'transfers' });
      if (transferStatus !== 'all') params.set('status', transferStatus);

      const response = await fetch(`/api/admin/payouts?${params}`, {
        headers: { ...headers },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load transfer queue');
      }

      setMigrationRequired(Boolean(data.migrationRequired));
      setTransfers(data.transfers || []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load transfer queue');
      setTransfers([]);
    } finally {
      setTransfersLoading(false);
    }
  }, [transferStatus]);

  useEffect(() => {
    if (mainTab === 'accounts') loadBankAccounts();
  }, [mainTab, loadBankAccounts]);

  useEffect(() => {
    if (mainTab === 'transfers') loadTransfers();
  }, [mainTab, loadTransfers]);

  useEffect(() => {
    let filtered = payouts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.host_name.toLowerCase().includes(query) ||
          p.host_email.toLowerCase().includes(query) ||
          p.property_name.toLowerCase().includes(query) ||
          (p.bank_name || '').toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredPayouts(filtered);
  }, [searchQuery, statusFilter, payouts]);

  const filteredTransfers = transfers.filter((t) => {
    if (!transferSearch.trim()) return true;
    const q = transferSearch.toLowerCase();
    return (
      (t.host_name || '').toLowerCase().includes(q) ||
      (t.host_email || '').toLowerCase().includes(q) ||
      (t.property_name || '').toLowerCase().includes(q) ||
      (t.transfer_ref || '').toLowerCase().includes(q) ||
      (t.booking_id || '').toLowerCase().includes(q)
    );
  });

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
      toast.success('Payout account verified');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve payout');
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
      toast.success('Payout account suspended');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject payout');
    }
  };

  const handleMarkPaid = async (transfer: TransferRow) => {
    const transferRef =
      prompt('Transfer reference (optional — bank/PayPal confirmation id):', '') ?? null;
    if (transferRef === null) return;
    const notes = prompt('Notes (optional):', '') ?? null;
    if (notes === null) return;

    setMarkingId(transfer.id);
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
        body: JSON.stringify({
          action: 'mark_paid',
          payoutId: transfer.id,
          transferRef: transferRef.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to mark paid');

      toast.success(`Marked paid — ${money(transfer.host_amount)}`);
      await loadTransfers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark paid');
    } finally {
      setMarkingId(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Payouts</h1>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setMainTab('accounts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              mainTab === 'accounts'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Bank accounts
          </button>
          <button
            type="button"
            onClick={() => setMainTab('transfers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              mainTab === 'transfers'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Transfer queue
          </button>
        </div>

        {mainTab === 'accounts' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search hosts or banks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

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
                        Pending earnings
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
                          No bank accounts found
                        </td>
                      </tr>
                    ) : (
                      filteredPayouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payout.host_name}
                              </div>
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
                            {money(payout.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shortDate(payout.requested_at)}
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
          </>
        )}

        {mainTab === 'transfers' && (
          <>
            {migrationRequired && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Run <code className="font-mono">SUPABASE_HOST_PAYOUTS.sql</code> in the Supabase
                SQL Editor to enable the transfer ledger.
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search host, property, booking, or transfer ref..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={transferStatus}
                  onChange={(e) => setTransferStatus(e.target.value as TransferStatusFilter)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Host
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property / dates
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Host amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfersLoading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          Loading…
                        </td>
                      </tr>
                    ) : filteredTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No transfers found
                        </td>
                      </tr>
                    ) : (
                      filteredTransfers.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{t.host_name}</div>
                            <div className="text-sm text-gray-500">{t.host_email || '—'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{t.property_name || 'Property'}</div>
                            <div className="text-xs text-gray-500">
                              {shortDate(t.check_in)} → {shortDate(t.check_out)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {money(t.guest_total)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {money(t.platform_fee)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {money(t.host_amount)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div>{t.bank_name || 'No bank on file'}</div>
                            {t.bank_status && (
                              <div className="text-xs text-gray-400">{t.bank_status}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                t.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : t.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {t.status}
                            </span>
                            {t.status === 'paid' && t.paid_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {shortDate(t.paid_at)}
                                {t.transfer_ref ? ` · ${t.transfer_ref}` : ''}
                              </div>
                            )}
                            {t.status === 'cancelled' && t.cancel_reason && (
                              <div className="text-xs text-gray-500 mt-1">{t.cancel_reason}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {t.status === 'pending' && (
                              <button
                                type="button"
                                disabled={markingId === t.id}
                                onClick={() => handleMarkPaid(t)}
                                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                {markingId === t.id ? 'Saving…' : 'Mark paid'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
