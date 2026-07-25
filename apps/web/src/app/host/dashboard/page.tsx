'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarCheck,
  Wallet,
  MessageSquare,
  ArrowRight,
  Bell,
  CreditCard,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/auth/isAdmin';
import {
  getImpersonatedHostId,
  getHostScopeUserId,
  onImpersonationChanged,
} from '@/lib/adminHostImpersonation';
import { HostImpersonationBanner } from '@/components/host/HostImpersonationBanner';
import { createClient } from '@/lib/supabase/client';
import { formatCalendarDate } from '@/lib/dateUtils';

type DashboardPayload = {
  stats: {
    totalProperties: number;
    activeListings: number;
    upcomingStays: number;
    pendingApprovals: number;
    pendingPayoutTotal: number;
    paidYtdTotal: number;
    cancelledPayoutCount: number;
  };
  pendingApprovals: {
    id: string;
    property_name?: string | null;
    guest_name?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    total_price?: number | null;
  }[];
  pendingPayouts: {
    id: string;
    property_name: string | null;
    host_amount: number;
    check_in: string | null;
    check_out: string | null;
  }[];
  upcomingStays: {
    id: string;
    property_name?: string | null;
    guest_name?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    status?: string | null;
    payment_status?: string | null;
  }[];
  migrationRequired?: boolean;
};

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function HostDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hostScopeRevision, setHostScopeRevision] = useState(0);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [storedRoles, setStoredRoles] = useState<string[]>([]);

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

  const loadDashboard = useCallback(async () => {
    if (!user || !canAccess) return;
    setLoadingData(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const scopeId = getHostScopeUserId(user, user.id);
      const qs =
        isAdminUser(user) && scopeId !== user.id
          ? `?hostId=${encodeURIComponent(scopeId)}`
          : '';

      const res = await fetch(`/api/host/dashboard${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
      setData(json as DashboardPayload);
    } catch (e) {
      console.error('[host/dashboard]', e);
      setData(null);
    } finally {
      setLoadingData(false);
    }
  }, [user, canAccess]);

  useEffect(() => {
    if (!loading && user && canAccess) void loadDashboard();
  }, [loading, user, canAccess, hostScopeRevision, loadDashboard]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!canAccess) return null;

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <HostImpersonationBanner />
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-7 h-7 text-primary-400" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Host Dashboard
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Overview of your listings, stays, and payouts.
              </p>
            </div>
          </div>
          <Link
            href="/host/payouts"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-black font-bold text-sm hover:bg-primary-400 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            View payouts
          </Link>
        </div>

        {data?.migrationRequired ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Payout ledger is not set up yet. Run{' '}
            <code className="text-amber-100">SUPABASE_HOST_PAYOUTS.sql</code> in Supabase.
          </div>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Building2 className="w-4 h-4" />}
            label="Properties"
            value={loadingData ? '…' : String(stats?.totalProperties ?? 0)}
            hint={`${stats?.activeListings ?? 0} active`}
          />
          <StatCard
            icon={<CalendarCheck className="w-4 h-4" />}
            label="Upcoming stays"
            value={loadingData ? '…' : String(stats?.upcomingStays ?? 0)}
          />
          <StatCard
            icon={<Wallet className="w-4 h-4" />}
            label="Pending payout"
            value={loadingData ? '…' : money(stats?.pendingPayoutTotal ?? 0)}
            valueClass="text-amber-400"
          />
          <StatCard
            icon={<CreditCard className="w-4 h-4" />}
            label="Paid YTD"
            value={loadingData ? '…' : money(stats?.paidYtdTotal ?? 0)}
            valueClass="text-emerald-400"
            hint={`${stats?.cancelledPayoutCount ?? 0} cancelled`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
          {[
            { href: '/host/properties', label: 'Properties', icon: Building2 },
            { href: '/host/bookings', label: 'Bookings', icon: CalendarCheck },
            { href: '/host/payouts', label: 'Payouts', icon: Wallet },
            { href: '/host/messages', label: 'Messages', icon: MessageSquare },
            { href: '/profile#host-payout-settings', label: 'Bank setup', icon: CreditCard },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:border-primary-500/40 hover:bg-gray-900/80 transition-colors"
            >
              <item.icon className="w-4 h-4 text-primary-400 shrink-0" />
              <span className="truncate">{item.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 ml-auto shrink-0" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-400" />
                Needs attention
              </h2>
              <Link href="/host/bookings" className="text-xs text-primary-400 hover:text-primary-300">
                All bookings
              </Link>
            </div>
            <div className="p-5 space-y-3">
              {loadingData ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (data?.pendingApprovals?.length || 0) === 0 &&
                (data?.pendingPayouts?.length || 0) === 0 ? (
                <p className="text-sm text-gray-500">You&apos;re all caught up.</p>
              ) : (
                <>
                  {(data?.pendingApprovals || []).map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 flex justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {b.property_name || 'Property'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Approval · {b.guest_name || 'Guest'}
                          {b.check_in
                            ? ` · ${formatCalendarDate(String(b.check_in))}`
                            : ''}
                        </p>
                      </div>
                      <Link
                        href="/host/bookings"
                        className="text-xs font-bold text-primary-400 shrink-0 self-center"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                  {(data?.pendingPayouts || []).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {p.property_name || 'Stay'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Pending payout
                          {p.check_in
                            ? ` · ${formatCalendarDate(String(p.check_in))}`
                            : ''}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-amber-300 shrink-0 self-center">
                        {money(p.host_amount)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary-400" />
                Upcoming stays
              </h2>
              <Link href="/host/bookings" className="text-xs text-primary-400 hover:text-primary-300">
                View all
              </Link>
            </div>
            <div className="p-5 space-y-3">
              {loadingData ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (data?.upcomingStays?.length || 0) === 0 ? (
                <p className="text-sm text-gray-500">No upcoming stays yet.</p>
              ) : (
                (data?.upcomingStays || []).map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-white text-sm font-medium truncate">
                      {b.property_name || 'Property'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.guest_name || 'Guest'}
                      {b.check_in && b.check_out
                        ? ` · ${formatCalendarDate(String(b.check_in))} – ${formatCalendarDate(String(b.check_out))}`
                        : ''}
                      {b.payment_status === 'paid' ? ' · Paid' : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  valueClass = 'text-white',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-2">
        {icon}
        {label}
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
}
