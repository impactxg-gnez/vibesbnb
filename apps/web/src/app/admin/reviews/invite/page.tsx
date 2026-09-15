'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import { Copy, Link2, Loader2, RefreshCw, Search, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

type AdminProperty = {
  id: string;
  name?: string;
  title?: string;
  location?: string;
  status?: string;
};

type Invite = {
  id: string;
  token: string;
  property_id: string;
  created_at: string;
  revoked_at: string | null;
};

export default function InviteGuestReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [pickerQuery, setPickerQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdminUser(user)) router.push('/');
  }, [user, loading, router]);

  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) return;
      const res = await fetch('/api/admin/properties?status=active&limit=100', { headers: { ...headers } });
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

  const loadInvite = useCallback(async (propertyId: string) => {
    setInviteLoading(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch(
        `/api/admin/review-invites?property_id=${encodeURIComponent(propertyId)}`,
        { headers: { ...headers } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invite');
      setInvite(data.invite || null);
    } catch (e) {
      setInvite(null);
      toast.error(e instanceof Error ? e.message : 'Failed to load invite');
    } finally {
      setInviteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setInvite(null);
      return;
    }
    void loadInvite(selectedId);
  }, [selectedId, loadInvite]);

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

  const publicUrl = useMemo(() => {
    if (!invite?.token || typeof window === 'undefined') return '';
    return `${window.location.origin}/review/${encodeURIComponent(invite.token)}`;
  }, [invite?.token]);

  const adminFetch = async (url: string, init?: RequestInit) => {
    const headers = await getHeadersForAdminFetch();
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...headers, ...(init?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const generateLink = async () => {
    if (!selectedId) return;
    setWorking(true);
    try {
      const data = await adminFetch('/api/admin/review-invites', {
        method: 'POST',
        body: JSON.stringify({ property_id: selectedId }),
      });
      setInvite(data.invite);
      toast.success(data.created ? 'Review link created' : 'Using the existing active link');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create link');
    } finally {
      setWorking(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy — select the URL and copy it manually');
    }
  };

  const disableLink = async () => {
    if (!invite?.id) return;
    setWorking(true);
    try {
      await adminFetch(`/api/admin/review-invites/${encodeURIComponent(invite.id)}/revoke`, {
        method: 'POST',
      });
      setInvite(null);
      toast.success('Link disabled');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not disable link');
    } finally {
      setWorking(false);
    }
  };

  const rotateLink = async () => {
    if (!selectedId) return;
    setWorking(true);
    try {
      const data = await adminFetch('/api/admin/review-invites', {
        method: 'POST',
        body: JSON.stringify({ property_id: selectedId, rotate: true }),
      });
      setInvite(data.invite);
      toast.success('New link created — the previous URL no longer works');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not rotate link');
    } finally {
      setWorking(false);
    }
  };

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
            <Link2 className="w-6 h-6 text-purple-600" />
            Invite guest review
          </h1>
          <p className="text-gray-600 mt-2">
            Generate a shareable link for a listing. Recipients sign in with Google and post a guest
            review — no VibesBnB booking required. Anyone with the link can review once per Google
            account.
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">2. Share review link</label>
            {!selectedId ? (
              <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-6 text-center">
                Select a property above to generate a link.
              </p>
            ) : inviteLoading ? (
              <div className="flex justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : invite ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Active link for <strong>{selected?.name || selected?.title || selectedId}</strong>
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    readOnly
                    value={publicUrl}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void rotateLink()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Rotate link
                  </button>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void disableLink()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4" />
                    Disable
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={working}
                onClick={() => void generateLink()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Generate review link
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
