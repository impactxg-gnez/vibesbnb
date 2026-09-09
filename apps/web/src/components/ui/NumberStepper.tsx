'use client';

import { Minus, Plus } from 'lucide-react';

type NumberStepperProps = {
  id?: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
};

/** Accessible increment/decrement control for guests, rooms, etc. */
export function NumberStepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  className = '',
}: NumberStepperProps) {
  const liveId = id ? `${id}-value` : undefined;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <span id={id} className="font-medium text-white">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-2 rounded-full border border-white/20 hover:bg-white/10 disabled:opacity-40"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus size={18} aria-hidden />
        </button>
        <span
          id={liveId}
          className="min-w-[2ch] text-center font-bold tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </span>
        <button
          type="button"
          className="p-2 rounded-full border border-white/20 hover:bg-white/10 disabled:opacity-40"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
