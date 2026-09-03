'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import toast from 'react-hot-toast';
import { Mail, Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

type NotificationEmail = {
  id: string;
  email: string;
  label: string | null;
  enabled: boolean;
  created_at: string;
};

export default function AdminNotificationEmailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [emails, setEmails] = useState<NotificationEmail[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdminUser(user)) router.push('/');
  }, [user, loading, router]);

  const loadEmails = async () => {
    setLoadingList(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) throw new Error('No valid session — please sign in again.');
      const res = await fetch('/api/admin/notification-emails', {
        headers: { ...headers },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load emails');
      setEmails(data.emails || []);
      setMigrationRequired(Boolean(data.migrationRequired));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load emails');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user && isAdminUser(user)) void loadEmails();
  }, [user?.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSaving(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/notification-emails', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, label: newLabel }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.migrationRequired) setMigrationRequired(true);
        throw new Error(data.error || 'Failed to add email');
      }
      setEmails((prev) => [...prev, data.email]);
      setNewEmail('');
      setNewLabel('');
      setMigrationRequired(false);
      toast.success('Email added — will receive new booking and new chat alerts');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add email');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (row: NotificationEmail) => {
    setActingId(row.id);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/notification-emails', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, enabled: !row.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setEmails((prev) => prev.map((x) => (x.id === row.id ? data.email : x)));
      toast.success(data.email.enabled ? 'Notifications enabled' : 'Notifications paused');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  const handleRemove = async (row: NotificationEmail) => {
    if (!confirm(`Remove ${row.email} from admin alerts?`)) return;
    setActingId(row.id);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch(`/api/admin/notification-emails?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        headers: { ...headers },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      setEmails((prev) => prev.filter((x) => x.id !== row.id));
      toast.success('Email removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setActingId(null);
    }
  };

  if (loading || loadingList) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>
      </AdminLayout>
    );
  }

  if (!user || !isAdminUser(user)) return null;

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-emerald-600" />
            Admin notification emails
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            These addresses receive alerts when a new booking is created or a new chat thread is
            started. Existing booking/guest emails and per-message chat emails are unchanged.
          </p>
        </div>

        {migrationRequired && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Run <code className="font-mono text-xs">SUPABASE_ADMIN_NOTIFICATION_EMAILS.sql</code> in
            the Supabase SQL editor, then refresh this page.
          </div>
        )}

        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Add email</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ops@vibesbnb.com"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Label (optional)
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ops / Deon / Support"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !newEmail.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add recipient
          </button>
        </form>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Recipients ({emails.length})
          </div>
          {emails.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              No emails yet. Add at least one address to receive admin alerts.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {emails.map((row) => (
                <li
                  key={row.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{row.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {row.label || 'No label'} · {row.enabled ? 'Active' : 'Paused'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void toggleEnabled(row)}
                      disabled={actingId === row.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {row.enabled ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                      )}
                      {row.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(row)}
                      disabled={actingId === row.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
