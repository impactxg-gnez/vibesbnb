'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import {
  getHostScopeUserId,
  getImpersonatedHostId,
  onImpersonationChanged,
} from '@/lib/adminHostImpersonation';
import { HostImpersonationBanner } from '@/components/host/HostImpersonationBanner';
import { ArrowLeft, Wallet, CreditCard, Building2, CalendarCheck } from 'lucide-react';

export default function HostPayoutsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hostScopeRevision, setHostScopeRevision] = useState(0);
  const [storedRoles, setStoredRoles] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalEarnings: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

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
    if (!loading && !user) {
      router.push('/login');
    }
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

  const loadStats = useCallback(async () => {
    if (!user || !canAccess) return;
    setLoadingStats(true);
    try {
      const supabase = createClient();
      const { data: sessionUser } = await supabase.auth.getUser();
      const authRow = sessionUser?.user;
      if (!authRow?.id) {
        setStats({ totalProperties: 0, totalBookings: 0, totalEarnings: 0 });
        return;
      }
      const scopeId = getHostScopeUserId(user, authRow.id);

      const { count: propertyCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('host_id', scopeId);

      const { data: propsData } = await supabase.from('properties').select('id').eq('host_id', scopeId);
      const propIds = propsData?.map((p) => p.id) || [];

      let bookingCount = 0;
      let totalEarnings = 0;

      if (propIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('total_price, status')
          .in('property_id', propIds);

        if (bookingsData) {
          bookingCount = bookingsData.length;
          totalEarnings = bookingsData
            .filter((b) => b.status === 'confirmed' || b.status === 'completed')
            .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
        }
      }

      setStats({
        totalProperties: propertyCount || 0,
        totalBookings: bookingCount,
        totalEarnings,
      });
    } catch (e) {
      console.error('[host/payouts] stats', e);
      setStats({ totalProperties: 0, totalBookings: 0, totalEarnings: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, [user, canAccess]);

  useEffect(() => {
    if (!loading && user && canAccess) {
      void loadStats();
    }
  }, [loading, user, canAccess, hostScopeRevision, loadStats]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!canAccess) {
    return null;
  }

  const payoutInfo = user.user_metadata?.payout_info as
    | {
        account_holder_name?: string;
        bank_name?: string;
        account_number_masked?: string;
      }
    | undefined;
  const payoutConfigured = !!payoutInfo?.account_number_masked;

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <HostImpersonationBanner />
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <Link
          href="/host/properties"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to properties
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
            <Wallet className="w-7 h-7 text-primary-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Payouts</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Earnings overview and where to manage your payout account.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Building2 className="w-4 h-4" />
              Properties
            </div>
            <p className="text-2xl font-bold text-white">{loadingStats ? '…' : stats.totalProperties}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <CalendarCheck className="w-4 h-4" />
              Bookings
            </div>
            <p className="text-2xl font-bold text-white">{loadingStats ? '…' : stats.totalBookings}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Wallet className="w-4 h-4" />
              Total earnings
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {loadingStats ? '…' : `$${stats.totalEarnings.toLocaleString()}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">Confirmed &amp; completed bookings</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
          <div className="p-5 sm:p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary-400 shrink-0" />
              <h2 className="text-lg font-semibold text-white">Payout account</h2>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Add or update the bank account where VibesBNB sends your payouts.
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
                    <p className="text-gray-500 text-sm font-mono mt-0.5">{payoutInfo.account_number_masked}</p>
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
                  You haven&apos;t added a payout account yet. Set one up on your profile to get paid.
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

        <p className="text-xs text-gray-500">
          Payout schedules and transfers are processed according to VibesBNB host terms. For tax documents or
          disputes, contact support from your profile.
        </p>
      </div>
    </div>
  );
}
