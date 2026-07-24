'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTeamReviewForm } from '@/components/admin/AdminTeamReviewForm';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { Loader2, MessageSquarePlus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

type AdminProperty = {
  id: string;
  name?: string;
  title?: string;
  location?: string;
  status?: string;
};

export default function AddVibesbnbReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [pickerQuery, setPickerQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdminUser(user)) router.push('/');
  }, [user, loading, router]);

  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) return;
      const res = await fetch('/api/admin/properties?status=active', { headers: { ...headers } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load properties');
      setProperties(data.properties || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load properties');
    } finally {
      setLoadingProps(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdminUser(user)) return;
    void loadProperties();
  }, [user?.id, loadProperties]);

  const selected = useMemo(
    () => properties.find((p) => p.id === selectedId) || null,
    [properties, selectedId]
  );

  const filtered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    let list = properties.filter((p) => p.status === 'active' || !p.status);
    if (q) {
      list = list.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 50);
  }, [properties, pickerQuery]);

  if (loading || !user || !isAdminUser(user)) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquarePlus className="w-6 h-6 text-purple-600" />
            Add VibesBNB Review
          </h1>
          <p className="text-gray-600 mt-2">
            Select a property, then publish an official VibesBNB review. It appears on the listing under{' '}
            <strong>About → VibesBNB review</strong>.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">1. Choose property</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Search by name, location, or ID…"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {loadingProps ? (
              <p className="text-sm text-gray-500 py-6 text-center">Loading properties…</p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">No matching active properties.</p>
                ) : (
                  filtered.map((p) => {
                    const label = p.name || p.title || p.id;
                    const active = selectedId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full text-left px-3 py-2.5 text-sm transition ${
                          active ? 'bg-purple-50 ring-inset ring-2 ring-purple-400' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 truncate">{label}</div>
                        <div className="text-xs text-gray-500 truncate">{p.location || p.id}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Or pick from dropdown</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">2. Write &amp; publish review</label>
            {selectedId ? (
              <AdminTeamReviewForm
                propertyId={selectedId}
                propertyName={selected?.name || selected?.title}
                onSubmitted={() => {
                  toast.success('Review published — you can pick another property anytime.');
                }}
              />
            ) : (
              <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-6 text-center">
                Select a property above to enable the review form.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
