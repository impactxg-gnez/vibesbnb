'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { Sparkles, Save, ChevronUp, ChevronDown, Trash2, Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

type AdminProperty = {
  id: string;
  name?: string;
  title?: string;
  location?: string;
  status?: string;
  images?: string[];
};

export default function FeaturedRetreatsAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [displayCount, setDisplayCount] = useState(6);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [allProperties, setAllProperties] = useState<AdminProperty[]>([]);
  const [pickerQuery, setPickerQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [manualIdInput, setManualIdInput] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdminUser(user)) router.push('/');
  }, [user, loading, router]);

  const loadAllProperties = useCallback(async () => {
    const headers = await getHeadersForAdminFetch();
    if (!headers.Authorization) return;
    const res = await fetch('/api/admin/properties?status=active', { headers: { ...headers } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load properties');
    setAllProperties(data.properties || []);
  }, []);

  const loadConfig = useCallback(async () => {
    const headers = await getHeadersForAdminFetch();
    if (!headers.Authorization) return;
    const res = await fetch('/api/admin/featured-retreats', { headers: { ...headers } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load featured config');
    setDisplayCount(typeof data.displayCount === 'number' ? data.displayCount : 6);
    setPropertyIds(Array.isArray(data.propertyIds) ? data.propertyIds : []);
    setMigrationRequired(Boolean(data.migrationRequired));
  }, []);

  useEffect(() => {
    if (!user || !isAdminUser(user)) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        await Promise.all([loadConfig(), loadAllProperties()]);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadConfig, loadAllProperties]);

  const propertyById = useMemo(() => {
    const m = new Map<string, AdminProperty>();
    for (const p of allProperties) m.set(p.id, p);
    return m;
  }, [allProperties]);

  const pickerOptions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const inList = new Set(propertyIds);
    let list = allProperties.filter((p) => p.status === 'active' && !inList.has(p.id));
    if (q) {
      list = list.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 40);
  }, [allProperties, pickerQuery, propertyIds]);

  const addPropertyId = (id: string) => {
    const t = id.trim();
    if (!t) return;
    if (propertyIds.includes(t)) {
      toast.error('Already in the list');
      return;
    }
    if (propertyIds.length >= 24) {
      toast.error('Maximum 24 curated property IDs');
      return;
    }
    setPropertyIds((prev) => [...prev, t]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= propertyIds.length) return;
    setPropertyIds((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        toast.error('Please sign in again');
        return;
      }
      const res = await fetch('/api/admin/featured-retreats', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayCount, propertyIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Save failed');
        return;
      }
      setPropertyIds(data.propertyIds || propertyIds);
      setDisplayCount(data.displayCount ?? displayCount);
      setMigrationRequired(false);
      toast.success('Featured vibes saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !isAdminUser(user)) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Featured vibes (home)
          </h1>
          <p className="text-gray-600 mt-2">
            Choose which active listings appear in <strong>Featured Vibes</strong> on the home page and how many
            cards to show (1–24). If the curated list is empty, the site fills slots with active properties that have the
            most approved reviews (then rating as a tie-break).
          </p>
        </div>

        {migrationRequired && (
          <div className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Run the database migration</p>
              <p className="text-sm mt-1">
                Execute <code className="bg-amber-100 px-1 rounded">apps/web/SUPABASE_FEATURED_RETREATS_CONFIG.sql</code>{' '}
                in the Supabase SQL editor so saves persist.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of featured cards on home</label>
            <input
              type="number"
              min={1}
              max={24}
              value={displayCount}
              onChange={(e) => setDisplayCount(Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">Only the first N properties in your ordered list are shown; empty list uses auto picks.</p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Curated property order</h2>
            {loadingData ? (
              <p className="text-gray-500 text-sm">Loading…</p>
            ) : propertyIds.length === 0 ? (
              <p className="text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg p-4">
                No manual picks — home page uses up to {displayCount} active properties with the strongest review volume.
              </p>
            ) : (
              <ul className="space-y-2">
                {propertyIds.map((id, index) => {
                  const p = propertyById.get(id);
                  const label = p?.name || p?.title || id;
                  return (
                    <li
                      key={`${id}-${index}`}
                      className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
                    >
                      <span className="text-xs font-mono text-gray-400 w-6">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{label}</div>
                        <div className="text-xs text-gray-500 truncate">{id}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label="Move up"
                          onClick={() => move(index, -1)}
                          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          onClick={() => move(index, 1)}
                          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => setPropertyIds((prev) => prev.filter((_, i) => i !== index))}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Add active property</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Search by name, location, or ID…"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {pickerOptions.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">No matches (or all already added).</p>
              ) : (
                pickerOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      addPropertyId(p.id);
                      setPickerQuery('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-3 text-sm"
                  >
                    <Plus className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate font-medium text-gray-900">{p.name || p.title || p.id}</span>
                    <span className="text-xs text-gray-500 truncate ml-auto max-w-[140px]">{p.location}</span>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualIdInput}
                onChange={(e) => setManualIdInput(e.target.value)}
                placeholder="Or paste property ID"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  addPropertyId(manualIdInput);
                  setManualIdInput('');
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-semibold"
              >
                Add by ID
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 font-semibold"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
