'use client';

import { FULL_VIBE_NAME, BALCONY_VIBE_NAME, isFully420Friendly } from '@/lib/consumptionPolicy';

export type ConsumptionPolicyEditorValue = {
  cannabisInside: boolean;
  cannabisOutside: boolean;
};

type Props = {
  value: ConsumptionPolicyEditorValue;
  onChange: (next: ConsumptionPolicyEditorValue) => void;
  className?: string;
  /** When true, Full Vibe + balcony becomes Balcony Vibe (golden glow). */
  hasBalcony?: boolean;
  /** When provided, shows a Balcony available toggle next to the 420 policy. */
  onBalconyChange?: (hasBalcony: boolean) => void;
};

/**
 * Host control: where 420 / cannabis is allowed (inside / outside).
 * Outside includes balcony, patio, and yard.
 * Selecting both marks the listing as Full Vibe (green) or Balcony Vibe (gold) for guests.
 */
export function ConsumptionPolicyEditor({
  value,
  onChange,
  className = '',
  hasBalcony = false,
  onBalconyChange,
}: Props) {
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
          inside and outside for {FULL_VIBE_NAME} (green glow)
          {hasBalcony ? `, or ${BALCONY_VIBE_NAME} with a balcony amenity (golden glow)` : ''}.
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

      {onBalconyChange ? (
        <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-bold text-white">Balcony available</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Guests see a balcony tag. With 420 inside + outside, this becomes {BALCONY_VIBE_NAME}{' '}
                (golden glow).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onBalconyChange(!hasBalcony)}
              className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                hasBalcony
                  ? 'bg-amber-500 border-amber-400 text-black'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-amber-500/40'
              }`}
            >
              {hasBalcony ? 'Yes — balcony' : 'No balcony'}
            </button>
          </div>
        </div>
      ) : null}

      {fullyFriendly ? (
        <div
          className={`rounded-xl px-4 py-3 flex items-start gap-3 border ${
            hasBalcony
              ? 'border-amber-500/50 bg-amber-950/40'
              : 'border-emerald-500/50 bg-emerald-950/50'
          }`}
          role="status"
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black ${
              hasBalcony ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            aria-hidden
          >
            ✓
          </span>
          <div>
            <p
              className={`text-sm font-semibold ${
                hasBalcony ? 'text-amber-200' : 'text-emerald-200'
              }`}
            >
              {hasBalcony ? BALCONY_VIBE_NAME : FULL_VIBE_NAME}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                hasBalcony ? 'text-amber-300/80' : 'text-emerald-300/80'
              }`}
            >
              Cannabis is allowed inside and outside
              {hasBalcony ? ' and this stay has a balcony' : ''}. Guests will see a{' '}
              {hasBalcony ? 'golden' : 'green'} glow and the {hasBalcony ? BALCONY_VIBE_NAME : FULL_VIBE_NAME}{' '}
              marker on tiles and the listing page.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Tip: turn on both Inside and Outside for {FULL_VIBE_NAME}
          {hasBalcony ? ` (or ${BALCONY_VIBE_NAME} with your balcony amenity)` : ''}.
        </p>
      )}
    </div>
  );
}
