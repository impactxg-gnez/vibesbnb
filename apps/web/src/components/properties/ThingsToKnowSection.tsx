'use client';

import {
  getCancellationPolicyOption,
  type CancellationPolicyId,
  type SafetyFlags,
  cancellationPolicyGuestBlurb,
} from '@/lib/cancellationPolicy';
import { formatHhmmLabel } from '@/lib/checkInOutPolicy';
import { Check, Ban } from 'lucide-react';

type Props = {
  checkInTime: string | null;
  checkOutTime: string | null;
  guests: number;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  cancellationPolicy: CancellationPolicyId;
  nightsHint?: number;
  safety: SafetyFlags;
};

export function ThingsToKnowSection({
  checkInTime,
  checkOutTime,
  guests,
  petsAllowed,
  smokingAllowed,
  partiesAllowed,
  cancellationPolicy,
  nightsHint,
  safety,
}: Props) {
  const policy = getCancellationPolicyOption(cancellationPolicy);
  const safetyItems = [
    safety.smokeCoDetectors ? 'Smoke and CO detectors' : null,
    safety.firstAidKit ? 'First aid kit' : null,
    safety.emergencyExits ? 'Emergency exits' : null,
    safety.buildingSecurity ? 'Building security' : null,
  ].filter(Boolean) as string[];

  const houseRules: { ok: boolean; text: string }[] = [
    {
      ok: true,
      text: checkInTime
        ? `Check-in after ${formatHhmmLabel(checkInTime)}`
        : 'Check-in time shared after booking',
    },
    {
      ok: true,
      text: checkOutTime
        ? `Checkout before ${formatHhmmLabel(checkOutTime)}`
        : 'Checkout time shared after booking',
    },
    { ok: true, text: `${guests} guests maximum` },
    { ok: petsAllowed, text: petsAllowed ? 'Pets allowed' : 'No pets' },
    {
      ok: smokingAllowed,
      text: smokingAllowed ? 'Smoking / wellness consumption allowed' : 'No smoking',
    },
    {
      ok: partiesAllowed,
      text: partiesAllowed ? 'Parties allowed' : 'No parties or events',
    },
  ];

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8">
      <h2 className="text-2xl font-bold text-white mb-8">Things to know</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">House rules</h3>
          <ul className="space-y-3">
            {houseRules.map((r) => (
              <li key={r.text} className="flex items-start gap-2.5 text-sm text-gray-300">
                {r.ok ? (
                  <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Ban size={16} className="text-gray-500 shrink-0 mt-0.5" />
                )}
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Cancellation policy</h3>
          <p className="text-white font-medium mb-2">{policy.name}</p>
          <p className="text-sm text-gray-400 mb-4">
            {cancellationPolicyGuestBlurb(cancellationPolicy, nightsHint)}
          </p>
          <details className="text-sm text-gray-400">
            <summary className="cursor-pointer text-emerald-400 hover:text-emerald-300 font-medium">
              Full policy details
            </summary>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              {policy.detailLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>Within 24 hours of booking (and booked 7+ days before check-in): full refund.</li>
            </ul>
          </details>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Health &amp; safety</h3>
          {safetyItems.length > 0 ? (
            <ul className="space-y-3">
              {safetyItems.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Host has not listed safety features yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
