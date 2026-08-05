'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';

export default function ManageServiceFeePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [serviceFee, setServiceFee] = useState(PLATFORM_FEE_PERCENT);
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
        if (!res.ok) throw new Error(data.error || 'Failed to load service fee');
        if (cancelled) return;
        setServiceFee(Number(data.serviceFeePercent) || PLATFORM_FEE_PERCENT);
        setMigrationRequired(Boolean(data.migrationRequired));
        // Keep local cache in sync for client-side quote previews
        localStorage.setItem('serviceFee', String(data.serviceFeePercent));
      } catch (e) {
        console.error(e);
        const saved = localStorage.getItem('serviceFee');
        if (saved != null) setServiceFee(Number(saved) || PLATFORM_FEE_PERCENT);
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
        body: JSON.stringify({ serviceFeePercent: serviceFee }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.migrationRequired) {
          setMigrationRequired(true);
          toast.error('Run SUPABASE_PLATFORM_SETTINGS.sql in Supabase first');
          return;
        }
        throw new Error(data.error || 'Failed to update service fee');
      }
      localStorage.setItem('serviceFee', String(data.serviceFeePercent));
      setMigrationRequired(false);
      toast.success('Service fee saved for the platform');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update service fee');
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

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Service Fee</h1>
          <p className="text-gray-500 mt-1">
            Set the platform fee baked into guest-facing prices. Hosts enter their payout rate;
            guests see the marked-up total. This % is used in sales reports as VibesBNB&apos;s keep.
          </p>
        </div>

        {migrationRequired ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Run <code className="font-mono">SUPABASE_PLATFORM_SETTINGS.sql</code> in the Supabase
            SQL editor so the fee persists server-side (not only in this browser).
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Fee Percentage
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
                Included in traveler lodging prices. Shown as VibesBNB service fee in admin sales
                reports.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Example Calculation</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Host enters (payout rate):</span>
                  <span>$100.00 / night</span>
                </div>
                <div className="flex justify-between">
                  <span>Traveler sees:</span>
                  <span>
                    ${(100 + Math.round((100 * serviceFee) / 100)).toFixed(2)} / night
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform keeps ({serviceFee}%):</span>
                  <span>${Math.round((100 * serviceFee) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Host receives:</span>
                  <span>$100.00</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Service Fee'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
