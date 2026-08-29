'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { HOST_FEE_PERCENT, PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';
import { setCachedPlatformFees } from '@/lib/platformPricing';

export default function ManageServiceFeePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [serviceFee, setServiceFee] = useState(PLATFORM_FEE_PERCENT);
  const [hostFee, setHostFee] = useState(HOST_FEE_PERCENT);
  const [saving, setSaving] = useState(false);
  const [loadingFee, setLoadingFee] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isAdminUser(user)) return;
    let cancelled = false;
    void (async () => {
      setLoadingFee(true);
      try {
        const headers = await getHeadersForAdminFetch();
        const res = await fetch('/api/admin/service-fee', { headers: { ...headers } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load platform fees');
        if (cancelled) return;
        const svc = Number(data.serviceFeePercent) || PLATFORM_FEE_PERCENT;
        const host = Number(data.hostFeePercent) || HOST_FEE_PERCENT;
        setServiceFee(svc);
        setHostFee(host);
        setMigrationRequired(Boolean(data.migrationRequired));
        setCachedPlatformFees(svc, host);
      } catch (e) {
        console.error(e);
        toast.error('Could not load saved fees — showing defaults');
      } finally {
        if (!cancelled) setLoadingFee(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/service-fee', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceFeePercent: serviceFee, hostFeePercent: hostFee }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.migrationRequired) {
          setMigrationRequired(true);
          toast.error('Run platform settings SQL migrations in Supabase first');
          return;
        }
        throw new Error(data.error || 'Failed to update platform fees');
      }
      const svc = Number(data.serviceFeePercent) || serviceFee;
      const host = Number(data.hostFeePercent) || hostFee;
      setServiceFee(svc);
      setHostFee(host);
      setCachedPlatformFees(svc, host);
      setMigrationRequired(false);
      toast.success('Platform fees saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update platform fees');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingFee) {
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

  const exampleNightly = 100;
  const exampleNights = 3;
  const exampleRent = exampleNightly * exampleNights;
  const exampleGuestService = Math.round((exampleRent * serviceFee) / 100);
  const exampleGuestLodging = exampleRent + exampleGuestService;
  const exampleGrandTotal = exampleGuestLodging + 50; // + cleaning/taxes placeholder
  const exampleHostFee = Math.round((exampleGrandTotal * hostFee) / 100);
  const exampleHostPayout = exampleRent - exampleHostFee;

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Platform Fees</h1>
          <p className="text-gray-500 mt-1">
            Configure guest service fee (markup on lodging) and host fee (deducted from host
            payout). Both apply to new bookings immediately after saving.
          </p>
        </div>

        {migrationRequired ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Run <code className="font-mono">SUPABASE_PLATFORM_SETTINGS.sql</code> and{' '}
            <code className="font-mono">SUPABASE_PLATFORM_HOST_FEE.sql</code> in the Supabase SQL
            editor so fees persist server-side.
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl">
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest service fee
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(Number(e.target.value))}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Added to the host&apos;s nightly rate on checkout. Shown to guests as the platform
                service fee.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Host fee</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={hostFee}
                  onChange={(e) => setHostFee(Number(e.target.value))}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Deducted from the host&apos;s payout — calculated on the guest&apos;s total booking
                amount (grand total).
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Example (${exampleNightly}/night × {exampleNights} nights)</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Host payout rate (lodging):</span>
                  <span>${exampleRent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guest service fee ({serviceFee}% on rent):</span>
                  <span>+${exampleGuestService.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guest grand total (illustrative):</span>
                  <span>${exampleGrandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Host fee ({hostFee}% of grand total):</span>
                  <span>−${exampleHostFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Host receives (lodging − host fee):</span>
                  <span>${Math.max(0, exampleHostPayout).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save platform fees'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
