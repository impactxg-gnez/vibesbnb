'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import toast from 'react-hot-toast';
import { CalendarClock, Download, RefreshCw, ExternalLink } from 'lucide-react';
import type { IcalSyncRowStatus } from '@/lib/icalSyncExcel';

type HostOption = {
  id: string;
  name: string;
  email: string | null;
  propertyCount: number;
};

type SyncRow = {
  propertyId: string;
  unitName: string;
  exportUrl: string;
  importUrls: string[];
  syncStatus: IcalSyncRowStatus;
  lastSyncedAt: string | null;
  notes: string;
  status?: string | null;
  location?: string | null;
};

type HostBundle = {
  hostId: string;
  hostLabel: string;
  hostEmail: string | null;
  subtitle: string;
  propertyCount: number;
  syncedCount: number;
  failedCount: number;
  notSyncedCount: number;
  pendingCount: number;
  rows: SyncRow[];
};

function statusClass(status: IcalSyncRowStatus): string {
  switch (status) {
    case 'Synced':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'Failed':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'Pending':
      return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-600';
  }
}

export default function AdminIcalSyncPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [hostId, setHostId] = useState('');
  const [hostSearch, setHostSearch] = useState('');
  const [bundle, setBundle] = useState<HostBundle | null>(null);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdminUser(user))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadHosts = useCallback(async () => {
    setLoadingHosts(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/ical-sync', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load hosts');
      setHosts(Array.isArray(data.hosts) ? data.hosts : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load hosts');
    } finally {
      setLoadingHosts(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdminUser(user)) void loadHosts();
  }, [user, loadHosts]);

  const loadBundle = useCallback(async (id: string) => {
    if (!id) {
      setBundle(null);
      return;
    }
    setLoadingBundle(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch(`/api/admin/ical-sync?hostId=${encodeURIComponent(id)}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sync status');
      setBundle(data as HostBundle);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sync status');
      setBundle(null);
    } finally {
      setLoadingBundle(false);
    }
  }, []);

  useEffect(() => {
    if (hostId) void loadBundle(hostId);
    else setBundle(null);
  }, [hostId, loadBundle]);

  const filteredHosts = hosts.filter((h) => {
    const q = hostSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      h.name.toLowerCase().includes(q) ||
      (h.email || '').toLowerCase().includes(q) ||
      h.id.toLowerCase().includes(q)
    );
  });

  const handleExport = async () => {
    if (!hostId) {
      toast.error('Select a host first');
      return;
    }
    setExporting(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch(
        `/api/admin/ical-sync?hostId=${encodeURIComponent(hostId)}&format=xlsx`,
        { headers }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] || `VibesBNB_iCal_Sync.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Spreadsheet downloaded');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading || !user) {
    return (
      <AdminLayout>
        <div className="p-8 text-gray-400">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <CalendarClock className="text-emerald-400" />
              iCal Sync Tracker
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm">
              Filter by host, review import sync status, and download an Ionica-style spreadsheet with
              VibesBNB export URLs for the property manager to wire bidirectional iCal.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!hostId || exporting || loadingBundle}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm disabled:opacity-40 transition"
          >
            <Download size={18} />
            {exporting ? 'Preparing…' : 'Download spreadsheet'}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Search hosts
              </label>
              <input
                type="search"
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                placeholder="Name, email, or host id"
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Host
              </label>
              <select
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                disabled={loadingHosts}
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a host…</option>
                {filteredHosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.email ? ` (${h.email})` : ''} — {h.propertyCount}{' '}
                    {h.propertyCount === 1 ? 'property' : 'properties'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadHosts();
              if (hostId) void loadBundle(hostId);
            }}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loadingBundle && (
          <p className="text-gray-400 text-sm">Loading sync status…</p>
        )}

        {bundle && !loadingBundle && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Units', value: bundle.propertyCount, tone: 'text-white' },
                { label: 'Synced', value: bundle.syncedCount, tone: 'text-emerald-400' },
                { label: 'Failed', value: bundle.failedCount, tone: 'text-red-400' },
                { label: 'Pending', value: bundle.pendingCount, tone: 'text-amber-300' },
                { label: 'Not synced', value: bundle.notSyncedCount, tone: 'text-gray-400' },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    {c.label}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${c.tone}`}>{c.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">{bundle.hostLabel}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{bundle.subtitle}</p>
                {bundle.hostEmail ? (
                  <p className="text-xs text-gray-500 mt-1">{bundle.hostEmail}</p>
                ) : null}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                      <th className="px-4 py-3 font-bold">Unit</th>
                      <th className="px-4 py-3 font-bold">Export iCal</th>
                      <th className="px-4 py-3 font-bold">Import URLs</th>
                      <th className="px-4 py-3 font-bold">Sync</th>
                      <th className="px-4 py-3 font-bold">Last synced</th>
                      <th className="px-4 py-3 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No properties for this host.
                        </td>
                      </tr>
                    ) : (
                      bundle.rows.map((row) => (
                        <tr
                          key={row.propertyId}
                          className="border-b border-gray-800/80 hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3 text-white font-medium max-w-[220px]">
                            <span className="line-clamp-2">{row.unitName}</span>
                          </td>
                          <td className="px-4 py-3">
                            {row.exportUrl ? (
                              <a
                                href={row.exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs break-all"
                              >
                                <ExternalLink size={12} className="shrink-0" />
                                Open
                              </a>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px]">
                            {row.importUrls.length > 0 ? (
                              <span className="line-clamp-2" title={row.importUrls.join('\n')}>
                                {row.importUrls.length} linked
                              </span>
                            ) : (
                              <span className="text-amber-200/80">Fill in (yellow on sheet)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusClass(
                                row.syncStatus
                              )}`}
                            >
                              {row.syncStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {row.lastSyncedAt
                              ? new Date(row.lastSyncedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px]">
                            <span className="line-clamp-2">{row.notes || '—'}</span>
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

        {!hostId && !loadingBundle && (
          <p className="text-gray-500 text-sm">
            Select a host to view iCal sync status and export their tracker spreadsheet.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
