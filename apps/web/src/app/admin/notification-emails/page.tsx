'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import toast from 'react-hot-toast';
import {
  Mail,
  Plus,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type NotificationEmail = {
  id: string;
  email: string;
  label: string | null;
  enabled: boolean;
  created_at: string;
};

const SYSTEM_DEFAULT_ADMINS = ['vibewithdeon@vibesbnb.com', 'keval65@gmail.com'];

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

  // Testing Suite state
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [testingType, setTestingType] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<{
    ok: boolean;
    title: string;
    details: string;
    raw?: any;
  } | null>(null);

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
      toast.success('Email added — will receive admin alerts');
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

  const runTestNotification = async (type: string, label: string) => {
    setTestingType(type);
    setTestOutput(null);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          targetEmail: testTargetEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');

      setTestOutput({
        ok: data.ok,
        title: `${label} Result`,
        details: data.message || (data.ok ? 'Executed successfully' : 'Failed'),
        raw: data,
      });

      if (data.ok) {
        toast.success(`${label} completed!`);
      } else {
        toast.error(`${label}: ${data.message || 'Error'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestOutput({
        ok: false,
        title: `${label} Error`,
        details: msg,
      });
      toast.error(msg);
    } finally {
      setTestingType(null);
    }
  };

  const runIcalHealthScan = async () => {
    setTestingType('ical_scan');
    setTestOutput(null);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/cron/check-broken-icals', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'iCal health scan failed');

      setTestOutput({
        ok: data.ok,
        title: 'iCal Link Health Scan Completed',
        details: `Checked: ${data.summary?.checked ?? 0} | Healthy: ${data.summary?.healthy ?? 0} | Broken: ${data.summary?.broken ?? 0} | Alerts Sent: ${data.summary?.alertsSent ?? 0}`,
        raw: data,
      });

      toast.success('iCal link scan completed!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      setTestOutput({
        ok: false,
        title: 'iCal Scan Error',
        details: msg,
      });
      toast.error(msg);
    } finally {
      setTestingType(null);
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
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-emerald-600" />
            Email Notification System
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Pure in-repo notifications powered by Nodemailer. Manages alerts for new bookings, new chat enquiries, broken iCal feeds, and payment confirmations.
          </p>
        </div>

        {migrationRequired && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Run <code className="font-mono text-xs">SUPABASE_ADMIN_NOTIFICATION_EMAILS.sql</code> in
            the Supabase SQL editor, then refresh this page.
          </div>
        )}

        {/* 1. Default Built-in Admin Recipients */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Mandatory System Admin Recipients
          </div>
          <p className="text-xs text-gray-500">
            These addresses are hard-coded defaults and will always receive admin notifications, even if the database is not configured.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SYSTEM_DEFAULT_ADMINS.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm"
              >
                <span className="font-medium text-emerald-900">{email}</span>
                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Guaranteed
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Notification Testing Suite */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-base">
              <Send className="w-5 h-5 text-emerald-600" />
              Live Notification Testing Suite
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Trigger test emails to verify SMTP connectivity, templates, and delivery to hosts & admins.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Custom Destination Email (Optional - leaves empty to test default admins)
            </label>
            <input
              type="email"
              value={testTargetEmail}
              onChange={(e) => setTestTargetEmail(e.target.value)}
              placeholder="e.g. your-email@example.com"
              className="w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void runTestNotification('test_smtp', 'Verify SMTP Connection')}
              disabled={testingType !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {testingType === 'test_smtp' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              Verify SMTP Connection
            </button>

            <button
              type="button"
              onClick={() => void runTestNotification('new_booking', 'New Booking Alert')}
              disabled={testingType !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {testingType === 'new_booking' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test New Booking Alert
            </button>

            <button
              type="button"
              onClick={() => void runTestNotification('new_message', 'New Message Enquiry')}
              disabled={testingType !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {testingType === 'new_message' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test New Message Enquiry
            </button>

            <button
              type="button"
              onClick={() => void runTestNotification('broken_ical', 'Broken iCal Alert')}
              disabled={testingType !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {testingType === 'broken_ical' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Test Broken iCal Alert
            </button>

            <button
              type="button"
              onClick={() => void runTestNotification('payment_confirmation', 'Payment Confirmation')}
              disabled={testingType !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {testingType === 'payment_confirmation' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test Payment Confirmation
            </button>

            <button
              type="button"
              onClick={() => void runIcalHealthScan()}
              disabled={testingType !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
            >
              {testingType === 'ical_scan' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Run iCal Link Scan Now
            </button>
          </div>

          {testOutput && (
            <div
              className={`mt-4 p-4 rounded-xl text-xs space-y-2 border ${
                testOutput.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 text-sm">
                {testOutput.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                {testOutput.title}
              </div>
              <p className="font-mono whitespace-pre-wrap">{testOutput.details}</p>
              {testOutput.raw?.sentTo && (
                <p className="text-[11px] text-gray-600 font-mono">
                  Recipients: {testOutput.raw.sentTo.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3. Add Custom Admin Recipient */}
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Add Additional Admin Recipient</h2>
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
                placeholder="Support / Manager"
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

        {/* 4. Active Managed DB List */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Database Managed Additional Recipients ({emails.length})
          </div>
          {emails.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No additional database recipients added. Default system admins will receive all alerts.
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
