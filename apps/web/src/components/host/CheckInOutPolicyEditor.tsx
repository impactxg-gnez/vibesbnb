'use client';

import {
  CHECK_IN_OUT_TIME_OPTIONS,
  type CheckInOutPolicy,
  formatHhmmLabel,
  normalizeFee,
  normalizeHhmm,
} from '@/lib/checkInOutPolicy';

type Props = {
  value: CheckInOutPolicy;
  onChange: (next: CheckInOutPolicy) => void;
  className?: string;
};

function TimeSelect({
  id,
  label,
  value,
  onChange,
  options = CHECK_IN_OUT_TIME_OPTIONS,
  allowEmpty = true,
  emptyLabel = 'Not set',
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options?: string[];
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((t) => (
          <option key={t} value={t}>
            {formatHhmmLabel(t)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Host control: standard check-in / check-out times plus optional early check-in
 * and late check-out windows with optional fees.
 */
export function CheckInOutPolicyEditor({ value, onChange, className = '' }: Props) {
  const set = (patch: Partial<CheckInOutPolicy>) => {
    onChange({ ...value, ...patch });
  };

  const earlyOptions = CHECK_IN_OUT_TIME_OPTIONS.filter((t) => {
    const checkIn = normalizeHhmm(value.checkInTime);
    if (!checkIn) return true;
    return t < checkIn;
  });

  const lateOptions = CHECK_IN_OUT_TIME_OPTIONS.filter((t) => {
    const checkOut = normalizeHhmm(value.checkOutTime);
    if (!checkOut) return true;
    return t > checkOut;
  });

  return (
    <div className={`space-y-5 ${className}`}>
      <div>
        <h3 className="text-white font-medium">Check-in & check-out times</h3>
        <p className="text-sm text-gray-400 mt-1">
          Tell guests when they can arrive and leave. You can also allow early check-in or late
          check-out with an optional fee.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TimeSelect
          id="check-in-time"
          label="Check-in time"
          value={value.checkInTime}
          onChange={(checkInTime) => set({ checkInTime })}
        />
        <TimeSelect
          id="check-out-time"
          label="Check-out time"
          value={value.checkOutTime}
          onChange={(checkOutTime) => set({ checkOutTime })}
        />
      </div>

      <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-bold text-white">Early check-in</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Let guests arrive earlier than the standard check-in time
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !value.earlyCheckInAllowed;
              set({
                earlyCheckInAllowed: next,
                earliestEarlyCheckInTime: next
                  ? value.earliestEarlyCheckInTime || earlyOptions[0] || null
                  : null,
                earlyCheckInFee: next ? value.earlyCheckInFee : 0,
              });
            }}
            className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition ${
              value.earlyCheckInAllowed
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-emerald-500/40'
            }`}
          >
            {value.earlyCheckInAllowed ? 'Allowed' : 'Not allowed'}
          </button>
        </div>
        {value.earlyCheckInAllowed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <TimeSelect
              id="earliest-early-check-in"
              label="Earliest early check-in"
              value={value.earliestEarlyCheckInTime}
              onChange={(earliestEarlyCheckInTime) => set({ earliestEarlyCheckInTime })}
              options={earlyOptions.length > 0 ? earlyOptions : CHECK_IN_OUT_TIME_OPTIONS}
              allowEmpty={false}
            />
            <div>
              <label htmlFor="early-check-in-fee" className="block text-sm text-gray-300 mb-1.5">
                Optional fee ($)
              </label>
              <input
                id="early-check-in-fee"
                type="number"
                min={0}
                step={1}
                value={value.earlyCheckInFee}
                onChange={(e) => set({ earlyCheckInFee: normalizeFee(e.target.value) })}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-bold text-white">Late check-out</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Let guests leave later than the standard check-out time
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !value.lateCheckOutAllowed;
              set({
                lateCheckOutAllowed: next,
                latestLateCheckOutTime: next
                  ? value.latestLateCheckOutTime || lateOptions[lateOptions.length - 1] || null
                  : null,
                lateCheckOutFee: next ? value.lateCheckOutFee : 0,
              });
            }}
            className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition ${
              value.lateCheckOutAllowed
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-emerald-500/40'
            }`}
          >
            {value.lateCheckOutAllowed ? 'Allowed' : 'Not allowed'}
          </button>
        </div>
        {value.lateCheckOutAllowed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <TimeSelect
              id="latest-late-check-out"
              label="Latest late check-out"
              value={value.latestLateCheckOutTime}
              onChange={(latestLateCheckOutTime) => set({ latestLateCheckOutTime })}
              options={lateOptions.length > 0 ? lateOptions : CHECK_IN_OUT_TIME_OPTIONS}
              allowEmpty={false}
            />
            <div>
              <label htmlFor="late-check-out-fee" className="block text-sm text-gray-300 mb-1.5">
                Optional fee ($)
              </label>
              <input
                id="late-check-out-fee"
                type="number"
                min={0}
                step={1}
                value={value.lateCheckOutFee}
                onChange={(e) => set({ lateCheckOutFee: normalizeFee(e.target.value) })}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
