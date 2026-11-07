'use client';

import { useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { useAuth } from '@/contexts/AuthContext';
import { isReferralAffiliateEnabledClient } from '@/lib/referrals/config';

type Row = {
  id: string;
  name: string;
  email: string;
  code: string;
  link: string;
  status: string;
  clicks: number;
  bookings: number;
  commissionOwed: number;
  payoutStatus: string;
};

type Payout = {
  id: string;
  affiliate_id: string;
  amount: number;
  period: string;
  status: string;
  paid_at: string | null;
};

export default function AdminAffiliatesPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const headers = await getHeadersForAdminFetch(session);
    if (!headers.Authorization) return;
    const res = await fetch('/api/admin/affiliates', { headers: { ...headers }, cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Could not load affiliates');
      return;
    }
    setRows(data.rows || []);
    setPayouts(data.payouts || []);
  }, [session]);

  useEffect(() => {
    if (!isReferralAffiliateEnabledClient()) return;
    void load().finally(() => setLoading(false));
  }, [load]);

  if (!isReferralAffiliateEnabledClient()) notFound();

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const headers = await getHeadersForAdminFetch(session);
    const res = await fetch('/api/admin/affiliates', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Could not create affiliate');
      return;
    }
    setName('');
    setEmail('');
    toast.success('Affiliate created');
    await load();
  };

  const markPaid = async (payoutId: string) => {
    const headers = await getHeadersForAdminFetch(session);
    const res = await fetch('/api/admin/affiliates', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Could not mark payout paid');
      return;
    }
    toast.success('Payout marked paid');
    await load();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliates</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manual payouts. Commission is on rent only, after the stay, and a payout row waits
            until the unpaid balance reaches the minimum.
          </p>
        </div>

        <form onSubmit={create} className="flex flex-wrap gap-3 items-end bg-white border rounded-lg p-4">
          <label className="text-sm text-gray-700">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block border rounded px-3 py-2"
              required
            />
          </label>
          <label className="text-sm text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block border rounded px-3 py-2"
              required
            />
          </label>
          <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded">
            Create affiliate
          </button>
        </form>

        {loading ? <p className="text-gray-600">Loading…</p> : null}

        <div className="overflow-x-auto bg-white border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Affiliate</th>
                <th className="px-3 py-2">Clicks</th>
                <th className="px-3 py-2">Bookings</th>
                <th className="px-3 py-2">Commission owed</th>
                <th className="px-3 py-2">Payout status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-gray-500">{row.email}</div>
                    <div className="text-gray-500 break-all">{row.link}</div>
                  </td>
                  <td className="px-3 py-2">{row.clicks}</td>
                  <td className="px-3 py-2">{row.bookings}</td>
                  <td className="px-3 py-2">${Number(row.commissionOwed).toFixed(2)}</td>
                  <td className="px-3 py-2">{row.payoutStatus}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={5}>
                    No affiliates yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Payouts</h2>
          <ul className="space-y-2">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {payout.period}: ${Number(payout.amount).toFixed(2)} · {payout.status}
                </span>
                {payout.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => markPaid(payout.id)}
                    className="px-3 py-1 bg-emerald-600 text-white rounded"
                  >
                    Mark paid
                  </button>
                ) : (
                  <span className="text-gray-500">{payout.paid_at ? 'Paid' : payout.status}</span>
                )}
              </li>
            ))}
            {payouts.length === 0 ? <li className="text-gray-500 text-sm">No payout records yet.</li> : null}
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
