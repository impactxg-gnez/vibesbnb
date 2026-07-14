'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { createClient } from '@/lib/supabase/client';
import { formatAuthErrorMessage } from '@/lib/auth/formatAuthErrorMessage';
import { normalizePhoneE164 } from '@/lib/auth/phone';
import { getFirebaseAuth, isFirebaseWebConfigured } from '@/lib/firebase/client';

const OTP_COOLDOWN_MS = 60_000;
const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';

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

function formatFirebaseAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code || '')
      : '';
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message || '')
      : '';

  if (code === 'auth/too-many-requests') {
    return 'Too many SMS attempts. Please wait a few minutes and try again.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'That phone number looks invalid. Use an international format with country code.';
  }
  if (code === 'auth/invalid-verification-code') {
    return 'Incorrect verification code. Check the SMS and try again.';
  }
  if (code === 'auth/code-expired') {
    return 'That code expired. Request a new verification code.';
  }
  if (code === 'auth/captcha-check-failed') {
    return 'Security check failed. Refresh the page and try again.';
  }
  if (message) return formatAuthErrorMessage({ message });
  return 'Could not verify phone. Please try again.';
}

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
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const useDemoOtp = !isSupabaseConfigured() || !isFirebaseWebConfigured();

  useEffect(() => {
    return () => {
      try {
        recaptchaVerifierRef.current?.clear();
      } catch {
        /* ignore */
      }
      recaptchaVerifierRef.current = null;
    };
  }, []);

  const ensureRecaptcha = async (): Promise<RecaptchaVerifier> => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }
    const auth = getFirebaseAuth();
    const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!container) {
      throw new Error('reCAPTCHA container is missing. Refresh the page and try again.');
    }
    container.innerHTML = '';
    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
      callback: () => {
        /* solved */
      },
      'expired-callback': () => {
        toast.error('Security check expired. Request a new code.');
      },
    });
    await verifier.render();
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

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
      if (useDemoOtp) {
        setNormalizedPhone(phone);
        setStep('otp');
        confirmationRef.current = null;
        lastOtpSentAtRef.current = Date.now();
        toast.success('Demo mode: enter any 6-digit code to continue.');
        return;
      }

      const verifier = await ensureRecaptcha();
      const auth = getFirebaseAuth();
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      confirmationRef.current = confirmation;
      setNormalizedPhone(phone);
      setStep('otp');
      lastOtpSentAtRef.current = Date.now();
      toast.success('Verification code sent via SMS.');
    } catch (err: unknown) {
      try {
        recaptchaVerifierRef.current?.clear();
      } catch {
        /* ignore */
      }
      recaptchaVerifierRef.current = null;
      toast.error(formatFirebaseAuthError(err));
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
      if (useDemoOtp) {
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

      const phoneCheck = normalizedPhone
        ? ({ ok: true as const, phone: normalizedPhone })
        : normalizePhoneE164(phoneInput);
      if (!phoneCheck.ok) {
        toast.error(phoneCheck.error);
        return;
      }

      const confirmation = confirmationRef.current;
      if (!confirmation) {
        toast.error('Request a new verification code, then try again.');
        setStep('phone');
        return;
      }

      const credential = await confirmation.confirm(token);
      const firebaseIdToken = await credential.user.getIdToken();

      const response = await fetch('/api/auth/confirm-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneCheck.phone,
          firebaseIdToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error || 'Failed to save verified phone'
        );
      }

      try {
        await getFirebaseAuth().signOut();
      } catch {
        /* non-fatal — Supabase remains the app session */
      }

      const supabase = createClient();
      await supabase.auth.refreshSession();

      toast.success('Phone verified!');
      onVerified?.();
    } catch (err: unknown) {
      toast.error(formatFirebaseAuthError(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div id={RECAPTCHA_CONTAINER_ID} className="hidden" aria-hidden />

      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-bold text-muted uppercase tracking-wider ml-1"
            >
              Mobile number
            </label>
            <div className="relative">
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                aria-hidden
              />
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
              Include your country code. We&apos;ll text a one-time code to confirm
              it&apos;s yours.
            </p>
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full !py-4">
            {sending ? 'Sending code…' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted text-center">
            Code sent to{' '}
            <span className="font-semibold text-white">{normalizedPhone}</span>
          </p>
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="otp"
                className="block text-sm font-bold text-muted uppercase tracking-wider ml-1"
              >
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
            <button type="submit" disabled={verifying} className="btn-primary w-full !py-4">
              {verifying ? 'Verifying…' : submitLabel}
            </button>
          </form>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                confirmationRef.current = null;
                setOtp('');
              }}
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
        </>
      )}
    </div>
  );
}
