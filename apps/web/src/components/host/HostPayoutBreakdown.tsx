'use client';

import type { HostPayoutPreviewData } from '@/hooks/useHostPayoutPreview';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type HostPayoutBreakdownProps = {
  preview: HostPayoutPreviewData | null;
  loading?: boolean;
  variant?: 'dark' | 'light';
  className?: string;
};

/** Host-facing: lodging earnings minus host service fee = what they receive. */
export function HostPayoutBreakdown({
  preview,
  loading = false,
  variant = 'dark',
  className = '',
}: HostPayoutBreakdownProps) {
  const isLight = variant === 'light';
  const panel = isLight
    ? 'rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5'
    : 'rounded-lg border border-gray-700 bg-gray-800/80 p-3 space-y-1.5';
  const label = isLight ? 'text-gray-600' : 'text-gray-400';
  const value = isLight ? 'text-gray-900' : 'text-white';
  const fee = isLight ? 'text-amber-700' : 'text-amber-300';
  const payout = isLight ? 'text-emerald-800' : 'text-emerald-400';

  if (loading && !preview) {
    return (
      <div className={`${panel} ${className}`}>
        <p className={`text-xs ${label}`}>Calculating your payout…</p>
      </div>
    );
  }

  if (!preview) return null;

  const feeLabel =
    preview.hostFeePercent > 0
      ? `Host service fee (${preview.hostFeePercent}%)`
      : 'Host service fee';

  return (
    <div className={`${panel} ${className}`}>
      <div className="flex justify-between gap-3 text-sm">
        <span className={label}>Guest pays</span>
        <span className={value}>{money(preview.guestTotal)}</span>
      </div>
      <div className="flex justify-between gap-3 text-sm">
        <span className={label}>Your lodging earnings</span>
        <span className={value}>{money(preview.lodgingGross)}</span>
      </div>
      <div className="flex justify-between gap-3 text-sm">
        <span className={label}>{feeLabel}</span>
        <span className={fee}>−{money(preview.hostFee)}</span>
      </div>
      <div
        className={`flex justify-between gap-3 text-sm font-semibold pt-1.5 border-t ${
          isLight ? 'border-gray-200' : 'border-gray-700'
        }`}
      >
        <span className={payout}>You'll receive</span>
        <span className={payout}>{money(preview.hostAmount)}</span>
      </div>
      <p className={`text-[11px] leading-snug ${label}`}>
        Final payout is lodging earnings minus the host service fee. Paid after the guest
        completes payment.
      </p>
    </div>
  );
}
