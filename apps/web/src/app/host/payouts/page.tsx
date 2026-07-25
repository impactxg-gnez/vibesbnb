'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import {
  getHostScopeUserId,
  getImpersonatedHostId,
  onImpersonationChanged,
} from '@/lib/adminHostImpersonation';
import { HostImpersonationBanner } from '@/components/host/HostImpersonationBanner';
import { formatCalendarDate } from '@/lib/dateUtils';

type PayoutRow = {
  id: string;
  booking_id: string;
  guest_total: number;
  platform_fee: number;
  host_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  check_in?: string | null;
  check_out?: string | null;
  property_name?: string | null;
  paid_at?: string | null;
  transfer_ref?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  created_at?: string | null;
};

type Tab = 'pending' | 'paid' | 'cancelled';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function HostPayoutsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hostScopeRevision, setHostScopeRevision] = useState(0);
  const [storedRoles, setStoredRoles] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [loadingRows, setLoadingRows] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [summary, setSummary] = useState({
    pendingTotal: 0,
    paidTotal: 0,
    cancelledTotal: 0,
    cancelledCount: 0,
  });
  const [pending, setPending] = useState<PayoutRow[]>([]);
  const [paid, setPaid] = useState<PayoutRow[]>([]);
  const [cancelled, setCancelled] = useState<PayoutRow[]>([]);

  useEffect(() => onImpersonationChanged(() => setHostScopeRevision((n) => n + 1)), []);

  useEffect(() => {
    const rolesStr = localStorage.getItem('userRoles');
    if (rolesStr) {
      try {
        setStoredRoles(JSON.parse(rolesStr));
      } catch {
        setStoredRoles([]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const userRole = user?.user_metadata?.role || 'traveller';
  const hasHostRole = userRole === 'host' || storedRoles.includes('host');
  const adminImpersonating = Boolean(user && isAdminUser(user) && getImpersonatedHostId());
  const canAccess = hasHostRole || adminImpersonating;

  useEffect(() => {
    if (!loading && user && !canAccess) {
      router.replace('/profile');
    }
  }, [loading, user, canAccess, router]);

  const loadPayouts = useCallback(async () => {
    if (!user || !canAccess) return;
    setLoadingRows(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const scopeId = getHostScopeUserId(user, user.id);
      const qs =
        isAdminUser(user) && scopeId !== user.id
          ? `?hostId=${encodeURIComponent(scopeId)}`
          : '';

      const res = await fetch(`/api/host/payouts${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load payouts');

      setSummary(
        json.summary || {
          pendingTotal: 0,
          paidTotal: 0,
          cancelledTotal: 0,
          cancelledCount: 0,
        }
      );
      setPending(json.pending || []);
      setPaid(json.paid || []);
      setCancelled(json.cancelled || []);
      setMigrationRequired(Boolean(json.migrationRequired));
    } catch (e) {
      console.error('[host/payouts]', e);
      setPending([]);
      setPaid([]);
      setCancelled([]);
    } finally {
      setLoadingRows(false);
    }
  }, [user, canAccess]);

  useEffect(() => {
    if (!loading && user && canAccess) void loadPayouts();
  }, [loading, user, canAccess, hostScopeRevision, loadPayouts]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!canAccess) return null;

  const payoutInfo = user.user_metadata?.payout_info as
    | {
        account_holder_name?: string;
        bank_name?: string;
        account_number_masked?: string;
      }
    | undefined;
  const payoutConfigured = !!payoutInfo?.account_number_masked;

  const rows =
    tab === 'pending' ? pending : tab === 'paid' ? paid : cancelled;

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <HostImpersonationBanner />
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl">
        <Link
          href="/host/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
            <Wallet className="w-7 h-7 text-primary-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Payouts</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Pending, paid, and cancelled payouts for your bookings.
            </p>
          </div>
        </div>

        {migrationRequired ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Payout ledger is not set up yet. Run{' '}
            <code className="text-amber-100">SUPABASE_HOST_PAYOUTS.sql</code> in Supabase.
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            icon={<Clock className="w-4 h-4" />}
            label="Pending"
            value={money(summary.pendingTotal)}
            valueClass="text-amber-400"
            count={`${pending.length} stay${pending.length === 1 ? '' : 's'}`}
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Paid"
            value={money(summary.paidTotal)}
            valueClass="text-emerald-400"
            count={`${paid.length} transfer${paid.length === 1 ? '' : 's'}`}
          />
          <SummaryCard
            icon={<XCircle className="w-4 h-4" />}
            label="Cancelled"
            value={money(summary.cancelledTotal)}
            valueClass="text-gray-300"
            count={`${summary.cancelledCount} booking${summary.cancelledCount === 1 ? '' : 's'}`}
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
          <div className="p-5 sm:p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Payout account</h2>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Bank account where VibesBNB sends your host payouts.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            {payoutConfigured ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-emerald-400 font-medium">Account on file</p>
                  {payoutInfo?.bank_name ? (
                    <p className="text-gray-300 text-sm mt-1">{payoutInfo.bank_name}</p>
                  ) : null}
                  {payoutInfo?.account_number_masked ? (
                    <p className="text-gray-500 text-sm font-mono mt-0.5">
                      {payoutInfo.account_number_masked}
                    </p>
                  ) : null}
                </div>
                <Link
                  href="/profile#host-payout-settings"
                  className="inline-flex justify-center px-5 py-2.5 rounded-xl bg-primary-500 text-black font-bold text-sm hover:bg-primary-400 transition-colors"
                >
                  Manage payout details
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-amber-400/90 text-sm">
                  You haven&apos;t added a payout account yet. Set one up to get paid.
                </p>
                <Link
                  href="/profile#host-payout-settings"
                  className="inline-flex justify-center px-5 py-2.5 rounded-xl bg-primary-500 text-black font-bold text-sm hover:bg-primary-400 transition-colors whitespace-nowrap"
                >
                  Set up payouts
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-white/5 pb-1">
          {(
            [
              ['pending', 'Pending', pending.length],
              ['paid', 'Paid', paid.length],
              ['cancelled', 'Cancelled', cancelled.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                tab === id
                  ? 'text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs text-gray-500">({count})</span>
            </button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loadingRows ? (
            <p className="p-6 text-sm text-gray-500">Loading payouts…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No {tab} payouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[640px]">
                <thead className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Property</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold text-right">Guest paid</th>
                    <th className="px-4 py-3 font-semibold text-right">Fee</th>
                    <th className="px-4 py-3 font-semibold text-right">Your payout</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-white font-medium max-w-[200px]">
                        <span className="line-clamp-2">{row.property_name || 'Stay'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {row.check_in && row.check_out
                          ? `${formatCalendarDate(String(row.check_in))} – ${formatCalendarDate(String(row.check_out))}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-right whitespace-nowrap">
                        {money(row.guest_total)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-right whitespace-nowrap">
                        {money(row.platform_fee)}
                      </td>
                      <td className="px-4 py-3 text-white font-semibold text-right whitespace-nowrap">
                        {money(row.host_amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {row.status === 'paid' && row.paid_at ? (
                          <span className="text-emerald-400">
                            Paid {formatCalendarDate(String(row.paid_at))}
                          </span>
                        ) : null}
                        {row.status === 'pending' ? (
                          <span className="text-amber-400">Awaiting transfer</span>
                        ) : null}
                        {row.status === 'cancelled' ? (
                          <span className="text-gray-400" title={row.cancel_reason || undefined}>
                            Cancelled
                            {row.cancelled_at
                              ? ` ${formatCalendarDate(String(row.cancelled_at))}`
                              : ''}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Payout amounts are your lodging earnings (nights × rate + cleaning). Platform fees and
          guest taxes are excluded. Transfers are processed by VibesBNB after stays are confirmed
          and paid.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  count,
  valueClass,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  count: string;
  valueClass: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{count}</p>
    </div>
  );
}
