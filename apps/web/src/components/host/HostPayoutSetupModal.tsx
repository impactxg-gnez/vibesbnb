'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Landmark, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export type PayoutMethod = 'us_bank' | 'paypal';

export type HostPayoutInfo = {
  method?: PayoutMethod;
  account_holder_name?: string;
  bank_name?: string;
  account_number_masked?: string;
  routing_number_masked?: string;
  account_type?: string;
  currency?: string;
  paypal_email?: string;
  paypal_email_masked?: string;
  updated_at?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Existing payout_info from user metadata (if any). */
  initial?: HostPayoutInfo | null;
  /** Called after a successful save with the new masked payout_info. */
  onSaved: (info: HostPayoutInfo) => void;
};

const emptyBank = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  routingNumber: '',
  accountType: 'checking' as 'checking' | 'savings',
};

const emptyPaypal = {
  accountHolderName: '',
  paypalEmail: '',
  confirmPaypalEmail: '',
};

function isLikelyMasked(value: string) {
  return value.includes('*');
}

function maskLast4(value: string) {
  const digits = value.replace(/\s/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

function maskEmail(email: string) {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 1) return '****';
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}

export function HostPayoutSetupModal({ open, onClose, initial, onSaved }: Props) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>(
    initial?.method === 'paypal' ? 'paypal' : 'us_bank'
  );
  const [bank, setBank] = useState(emptyBank);
  const [paypal, setPaypal] = useState(emptyPaypal);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const nextMethod: PayoutMethod =
      initial?.method === 'paypal' || (!!initial?.paypal_email && !initial?.account_number_masked)
        ? 'paypal'
        : 'us_bank';
    setMethod(nextMethod);
    setBank({
      accountHolderName: initial?.account_holder_name || '',
      bankName: initial?.bank_name && initial.bank_name !== 'PayPal' ? initial.bank_name : '',
      accountNumber: '',
      confirmAccountNumber: '',
      routingNumber: '',
      accountType:
        initial?.account_type === 'savings' ? 'savings' : 'checking',
    });
    setPaypal({
      accountHolderName: initial?.account_holder_name || '',
      paypalEmail: '',
      confirmPaypalEmail: '',
    });
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!mounted || !open) return null;

  const saveBank = async () => {
    if (!bank.accountHolderName.trim()) {
      toast.error('Account holder name is required');
      return;
    }
    if (!bank.bankName.trim()) {
      toast.error('Bank name is required');
      return;
    }
    if (!bank.accountNumber.trim() || isLikelyMasked(bank.accountNumber)) {
      toast.error('Enter your full US bank account number');
      return;
    }
    if (bank.accountNumber !== bank.confirmAccountNumber) {
      toast.error('Account numbers do not match');
      return;
    }
    const routing = bank.routingNumber.replace(/\D/g, '');
    if (routing.length !== 9) {
      toast.error('US routing number must be 9 digits');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      const payoutInfo: HostPayoutInfo = {
        method: 'us_bank',
        account_holder_name: bank.accountHolderName.trim(),
        bank_name: bank.bankName.trim(),
        account_number_masked: maskLast4(bank.accountNumber),
        routing_number_masked: maskLast4(routing),
        account_type: bank.accountType,
        currency: 'USD',
        updated_at: new Date().toISOString(),
      };

      if (supabaseUser) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...supabaseUser.user_metadata,
            payout_info: payoutInfo,
          },
        });
        if (updateError) throw updateError;

        const { error: payoutError } = await supabase.from('payout_accounts').upsert(
          {
            user_id: supabaseUser.id,
            account_holder_name: bank.accountHolderName.trim(),
            bank_name: bank.bankName.trim(),
            account_number_encrypted: bank.accountNumber.replace(/\s/g, ''),
            routing_number_encrypted: routing,
            account_type: bank.accountType,
            currency: 'USD',
            status: 'pending_verification',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (payoutError) {
          console.warn('[HostPayoutSetupModal] payout_accounts:', payoutError.message);
        }
      } else {
        localStorage.setItem('payoutInfo', JSON.stringify(payoutInfo));
      }

      toast.success('US bank payout details saved');
      onSaved(payoutInfo);
      onClose();
    } catch (e: unknown) {
      console.error('[HostPayoutSetupModal] bank save', e);
      toast.error(e instanceof Error ? e.message : 'Failed to save payout details');
    } finally {
      setSaving(false);
    }
  };

  const savePaypal = async () => {
    const email = paypal.paypalEmail.trim().toLowerCase();
    const confirm = paypal.confirmPaypalEmail.trim().toLowerCase();
    if (!paypal.accountHolderName.trim()) {
      toast.error('Name on the PayPal account is required');
      return;
    }
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid PayPal email');
      return;
    }
    if (email !== confirm) {
      toast.error('PayPal emails do not match');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      const payoutInfo: HostPayoutInfo = {
        method: 'paypal',
        account_holder_name: paypal.accountHolderName.trim(),
        paypal_email: email,
        paypal_email_masked: maskEmail(email),
        bank_name: 'PayPal',
        currency: 'USD',
        updated_at: new Date().toISOString(),
      };

      if (supabaseUser) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...supabaseUser.user_metadata,
            payout_info: payoutInfo,
          },
        });
        if (updateError) throw updateError;

        const { error: payoutError } = await supabase.from('payout_accounts').upsert(
          {
            user_id: supabaseUser.id,
            account_holder_name: paypal.accountHolderName.trim(),
            bank_name: 'PayPal',
            account_number_encrypted: email,
            routing_number_encrypted: 'PAYPAL',
            account_type: 'checking',
            currency: 'USD',
            status: 'pending_verification',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (payoutError) {
          console.warn('[HostPayoutSetupModal] payout_accounts:', payoutError.message);
        }
      } else {
        localStorage.setItem('payoutInfo', JSON.stringify(payoutInfo));
      }

      toast.success('PayPal payout details saved');
      onSaved(payoutInfo);
      onClose();
    } catch (e: unknown) {
      console.error('[HostPayoutSetupModal] paypal save', e);
      toast.error(e instanceof Error ? e.message : 'Failed to save payout details');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'us_bank') void saveBank();
    else void savePaypal();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-payout-setup-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        disabled={saving}
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/5 bg-gray-900/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 id="host-payout-setup-title" className="text-lg font-bold text-white">
              Set up payouts
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Choose how VibesBNB should send your earnings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-800/80 border border-gray-700">
            <button
              type="button"
              onClick={() => setMethod('us_bank')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                method === 'us_bank'
                  ? 'bg-primary-500 text-black'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <Landmark className="w-4 h-4" />
              US bank
            </button>
            <button
              type="button"
              onClick={() => setMethod('paypal')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                method === 'paypal'
                  ? 'bg-primary-500 text-black'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              PayPal
            </button>
          </div>

          {method === 'us_bank' ? (
            <div className="space-y-4">
              <Field
                label="Account holder name"
                required
                value={bank.accountHolderName}
                onChange={(v) => setBank((p) => ({ ...p, accountHolderName: v }))}
                placeholder="Name on the US bank account"
              />
              <Field
                label="Bank name"
                required
                value={bank.bankName}
                onChange={(v) => setBank((p) => ({ ...p, bankName: v }))}
                placeholder="e.g. Chase, Bank of America, Wells Fargo"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Account number"
                  required
                  type="password"
                  autoComplete="off"
                  value={bank.accountNumber}
                  onChange={(v) => setBank((p) => ({ ...p, accountNumber: v }))}
                  placeholder="Full account number"
                />
                <Field
                  label="Confirm account number"
                  required
                  type="password"
                  autoComplete="off"
                  value={bank.confirmAccountNumber}
                  onChange={(v) => setBank((p) => ({ ...p, confirmAccountNumber: v }))}
                  placeholder="Re-enter account number"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Routing number"
                  required
                  inputMode="numeric"
                  value={bank.routingNumber}
                  onChange={(v) => setBank((p) => ({ ...p, routingNumber: v }))}
                  placeholder="9-digit ABA routing number"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account type
                  </label>
                  <select
                    value={bank.accountType}
                    onChange={(e) =>
                      setBank((p) => ({
                        ...p,
                        accountType: e.target.value === 'savings' ? 'savings' : 'checking',
                      }))
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field
                label="Name on PayPal account"
                required
                value={paypal.accountHolderName}
                onChange={(v) => setPaypal((p) => ({ ...p, accountHolderName: v }))}
                placeholder="Full name on your PayPal profile"
              />
              <Field
                label="PayPal email"
                required
                type="email"
                autoComplete="email"
                value={paypal.paypalEmail}
                onChange={(v) => setPaypal((p) => ({ ...p, paypalEmail: v }))}
                placeholder="you@example.com"
              />
              <Field
                label="Confirm PayPal email"
                required
                type="email"
                autoComplete="off"
                value={paypal.confirmPaypalEmail}
                onChange={(v) => setPaypal((p) => ({ ...p, confirmPaypalEmail: v }))}
                placeholder="Re-enter PayPal email"
              />
              <p className="text-xs text-gray-500">
                We&apos;ll send host payouts to this PayPal address. Make sure it can receive
                payments.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl bg-primary-500 text-black font-bold hover:bg-primary-400 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save payout details'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}
