'use client';

import {
  CANCELLATION_POLICY_OPTIONS,
  type CancellationPolicyId,
  type SafetyFlags,
} from '@/lib/cancellationPolicy';

type Props = {
  cancellationPolicy: CancellationPolicyId;
  partiesAllowed: boolean;
  safety: SafetyFlags;
  onChange: (next: {
    cancellationPolicy: CancellationPolicyId;
    partiesAllowed: boolean;
    safety: SafetyFlags;
  }) => void;
  className?: string;
};

/**
 * Host: Airbnb-style cancellation policy + house parties toggle + health & safety.
 */
export function CancellationSafetyEditor({
  cancellationPolicy,
  partiesAllowed,
  safety,
  onChange,
  className = '',
}: Props) {
  const setPolicy = (id: CancellationPolicyId) =>
    onChange({ cancellationPolicy: id, partiesAllowed, safety });
  const setParties = (v: boolean) =>
    onChange({ cancellationPolicy, partiesAllowed: v, safety });
  const setSafety = (patch: Partial<SafetyFlags>) =>
    onChange({ cancellationPolicy, partiesAllowed, safety: { ...safety, ...patch } });

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-white font-medium">Cancellation policy</h3>
        <p className="text-sm text-gray-400 mt-1">
          Guests see this on your listing. Rules follow Airbnb-style short-stay and long-term (28+
          nights) refunds.
        </p>
        <div className="mt-4 space-y-2">
          {CANCELLATION_POLICY_OPTIONS.map((opt) => {
            const active = cancellationPolicy === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  active
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="cancellation-policy"
                  className="mt-1 accent-emerald-500"
                  checked={active}
                  onChange={() => setPolicy(opt.id)}
                />
                <span className="min-w-0">
                  <span className="block text-white font-semibold">{opt.name}</span>
                  <span className="block text-sm text-gray-400 mt-0.5">{opt.shortDescription}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium">House rules</h3>
        <label className="mt-3 flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-600 accent-emerald-500"
            checked={partiesAllowed}
            onChange={(e) => setParties(e.target.checked)}
          />
          Parties or events allowed
        </label>
      </div>

      <div>
        <h3 className="text-white font-medium">Health &amp; safety</h3>
        <p className="text-sm text-gray-400 mt-1">Shown under Things to know on your listing.</p>
        <div className="mt-3 space-y-2">
          {(
            [
              ['smokeCoDetectors', 'Smoke and carbon monoxide detectors'],
              ['firstAidKit', 'First aid kit'],
              ['emergencyExits', 'Emergency exits'],
              ['buildingSecurity', 'Building security'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                className="rounded border-gray-600 accent-emerald-500"
                checked={safety[key]}
                onChange={(e) => setSafety({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
