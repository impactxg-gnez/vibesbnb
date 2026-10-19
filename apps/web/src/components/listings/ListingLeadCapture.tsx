'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Props = {
  propertyId: string;
  propertyName: string;
};

export function ListingLeadCapture({ propertyId, propertyName }: Props) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `vbnb-lead-dismiss-${propertyId}`;
    try {
      if (sessionStorage.getItem(key) === '1') return;
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => setOpen(true), 25000);
    return () => window.clearTimeout(timer);
  }, [propertyId]);

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-100">
        We&apos;ll text or email you if this stay opens up or drops in price.
      </div>
    );
  }

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          propertyId,
          source: 'listing_no_book',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Could not save');
      }
      setSaved(true);
      try {
        sessionStorage.setItem(`vbnb-lead-dismiss-${propertyId}`, '1');
      } catch {
        /* ignore */
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not save your details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-white">Not booking {propertyName} yet?</p>
          <p className="text-xs text-gray-400 mt-1">
            Leave an email or mobile number for availability alerts. No spam.
          </p>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-white text-sm"
          onClick={() => {
            setOpen(false);
            try {
              sessionStorage.setItem(`vbnb-lead-dismiss-${propertyId}`, '1');
            } catch {
              /* ignore */
            }
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
        />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Mobile for SMS (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Keep me posted'}
        </button>
      </form>
    </div>
  );
}
