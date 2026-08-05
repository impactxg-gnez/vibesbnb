'use client';

import { isFully420Friendly } from '@/lib/consumptionPolicy';

export type ConsumptionPolicyEditorValue = {
  cannabisInside: boolean;
  cannabisOutside: boolean;
};

type Props = {
  value: ConsumptionPolicyEditorValue;
  onChange: (next: ConsumptionPolicyEditorValue) => void;
  className?: string;
};

/**
 * Host control: where 420 / cannabis is allowed (inside / outside).
 * Outside includes balcony, patio, and yard.
 * Selecting both marks the listing as fully 420-friendly (green glow for guests).
 */
export function ConsumptionPolicyEditor({ value, onChange, className = '' }: Props) {
  const set = (patch: Partial<ConsumptionPolicyEditorValue>) => {
    onChange({ ...value, ...patch });
  };

  const allowed = value.cannabisInside || value.cannabisOutside;
  const fullyFriendly = isFully420Friendly(value.cannabisInside, value.cannabisOutside);

  const toggleAllowed = () => {
    if (allowed) {
      set({ cannabisInside: false, cannabisOutside: false });
    } else {
      set({ cannabisInside: false, cannabisOutside: true });
    }
  };

  const toggleInside = () => {
    const nextInside = !value.cannabisInside;
    const nextOutside = value.cannabisOutside;
    if (!nextInside && !nextOutside) {
      set({ cannabisInside: false, cannabisOutside: true });
      return;
    }
    set({ cannabisInside: nextInside });
  };

  const toggleOutside = () => {
    const nextOutside = !value.cannabisOutside;
    const nextInside = value.cannabisInside;
    if (!nextInside && !nextOutside) {
      set({ cannabisInside: true, cannabisOutside: false });
      return;
    }
    set({ cannabisOutside: nextOutside });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-white font-medium">420 / cannabis policy</h3>
        <p className="text-sm text-gray-400 mt-1">
          Pick where guests may consume. Outside includes balcony, patio, and yard. Enable both
          inside and outside for a fully 420-friendly listing (green glow for travellers).
        </p>
      </div>

      <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-bold text-white">420 / cannabis</p>
            <p className="text-xs text-gray-400 mt-0.5">Wellness consumption for guests</p>
          </div>
          <button
            type="button"
            onClick={toggleAllowed}
            className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition ${
              allowed
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-emerald-500/40'
            }`}
          >
            {allowed ? 'Allowed' : 'Not allowed'}
          </button>
        </div>
        {allowed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleInside}
              className={`px-3 py-3 rounded-lg border text-left transition ${
                value.cannabisInside
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="block text-sm font-semibold">Inside</span>
              <span className="block text-[11px] text-gray-500 mt-0.5">Indoors</span>
            </button>
            <button
              type="button"
              onClick={toggleOutside}
              className={`px-3 py-3 rounded-lg border text-left transition ${
                value.cannabisOutside
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="block text-sm font-semibold">Outside</span>
              <span className="block text-[11px] text-gray-500 mt-0.5">
                Balcony / patio / yard
              </span>
            </button>
          </div>
        )}
      </div>

      {fullyFriendly ? (
        <div
          className="rounded-xl border border-emerald-500/50 bg-emerald-950/50 px-4 py-3 flex items-start gap-3"
          role="status"
        >
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black"
            aria-hidden
          >
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-200">Fully 420-friendly</p>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Cannabis is allowed inside and outside. Guests will see a green glow on this
              property card and listing.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Tip: turn on both Inside and Outside to mark this stay as fully 420-friendly.
        </p>
      )}
    </div>
  );
}
