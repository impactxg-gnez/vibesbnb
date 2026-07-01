'use client';

import { useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { formatAuthErrorMessage } from '@/lib/auth/formatAuthErrorMessage';
import { normalizePhoneE164 } from '@/lib/auth/phone';

const OTP_COOLDOWN_MS = 60_000;

const isSupabaseConfigured = () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return !!url && !!key && url !== 'https://placeholder.supabase.co';
};

type PhoneOtpVerificationProps = {
  initialPhone?: string;
  onVerified?: () => void;
  submitLabel?: string;
};

export function PhoneOtpVerification({
  initialPhone = '',
  onVerified,
  submitLabel = 'Verify & continue',
}: PhoneOtpVerificationProps) {
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [normalizedPhone, setNormalizedPhone] = useState(() => {
    if (!initialPhone) return '';
    const check = normalizePhoneE164(initialPhone);
    return check.ok ? check.phone : '';
  });
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const lastOtpSentAtRef = useRef(0);
  const otpInFlightRef = useRef(false);

  const sendOtp = async (phone: string) => {
    const now = Date.now();
    if (now - lastOtpSentAtRef.current < OTP_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - lastOtpSentAtRef.current)) / 1000);
      toast.error(`Please wait ${waitSec}s before requesting another code.`);
      return;
    }
    if (otpInFlightRef.current) return;

    otpInFlightRef.current = true;
    setSending(true);
    try {
      if (!isSupabaseConfigured()) {
        setNormalizedPhone(phone);
        setStep('otp');
        lastOtpSentAtRef.current = Date.now();
        toast.success('Demo mode: enter any 6-digit code to continue.');
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ phone });

      if (error) throw error;

      setNormalizedPhone(phone);
      setStep('otp');
      lastOtpSentAtRef.current = Date.now();
      toast.success('Verification code sent via SMS.');
    } catch (err: unknown) {
      const raw = err as { message?: string };
      toast.error(formatAuthErrorMessage(raw));
    } finally {
      otpInFlightRef.current = false;
      setSending(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = normalizePhoneE164(phoneInput);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    await sendOtp(check.phone);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.replace(/\D/g, '');
    if (token.length < 6) {
      toast.error('Enter the 6-digit code from your SMS.');
      return;
    }

    setVerifying(true);
    try {
      if (!isSupabaseConfigured()) {
        const demoRaw = localStorage.getItem('demoUser');
        if (demoRaw) {
          const demoUser = JSON.parse(demoRaw);
          const verifiedPhone = normalizedPhone || phoneInput;
          const updated = {
            ...demoUser,
            phone: verifiedPhone,
            phone_confirmed_at: new Date().toISOString(),
            user_metadata: {
              ...demoUser.user_metadata,
              phone: verifiedPhone,
              phone_verified: true,
            },
          };
          localStorage.setItem('demoUser', JSON.stringify(updated));
        }
        toast.success('Phone verified!');
        onVerified?.();
        return;
      }

      const supabase = createClient();
      const phoneCheck = normalizedPhone
        ? ({ ok: true as const, phone: normalizedPhone })
        : normalizePhoneE164(phoneInput);
      if (!phoneCheck.ok) {
        toast.error(phoneCheck.error);
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneCheck.phone,
        token,
        type: 'phone_change',
      });

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { phone: phoneCheck.phone },
      });

      await fetch('/api/profile/sync', { method: 'POST' });

      toast.success('Phone verified!');
      onVerified?.();
    } catch (err: unknown) {
      const raw = err as { message?: string };
      toast.error(formatAuthErrorMessage(raw));
    } finally {
      setVerifying(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleSendCode} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
            Mobile number
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden />
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="input !py-4 !pl-11"
              placeholder="+1 555 123 4567"
              autoComplete="tel"
              disabled={sending}
            />
          </div>
          <p className="text-xs text-muted ml-1">
            Include your country code. We&apos;ll text a one-time code to confirm it&apos;s yours.
          </p>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="btn-primary w-full !py-4"
        >
          {sending ? 'Sending code…' : 'Send verification code'}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted text-center">
        Code sent to <span className="font-semibold text-white">{normalizedPhone}</span>
      </p>
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="otp" className="block text-sm font-bold text-muted uppercase tracking-wider ml-1">
            Verification code
          </label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input !py-4 text-center text-2xl tracking-[0.4em] font-mono"
            placeholder="000000"
            disabled={verifying}
          />
        </div>
        <button
          type="submit"
          disabled={verifying}
          className="btn-primary w-full !py-4"
        >
          {verifying ? 'Verifying…' : submitLabel}
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setStep('phone')}
          className="text-muted hover:text-white transition-colors"
        >
          Change number
        </button>
        <span className="text-white/20">·</span>
        <button
          type="button"
          onClick={() => void sendOtp(normalizedPhone)}
          disabled={sending}
          className="text-primary-500 hover:text-primary-400 font-semibold disabled:opacity-50"
        >
          Resend code
        </button>
      </div>
    </div>
  );
}
