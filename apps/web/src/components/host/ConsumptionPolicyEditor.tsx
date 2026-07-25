'use client';

export type ConsumptionPolicyEditorValue = {
  cannabisInside: boolean;
  cannabisOutside: boolean;
  cigarettesInside: boolean;
  cigarettesOutside: boolean;
};

type Props = {
  value: ConsumptionPolicyEditorValue;
  onChange: (next: ConsumptionPolicyEditorValue) => void;
  className?: string;
};

function SubstanceRow(props: {
  title: string;
  subtitle: string;
  accentOn: string;
  accentOff: string;
  inside: boolean;
  outside: boolean;
  onToggleAllowed: () => void;
  onToggleInside: () => void;
  onToggleOutside: () => void;
}) {
  const allowed = props.inside || props.outside;
  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold text-white">{props.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{props.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={props.onToggleAllowed}
          className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition ${
            allowed ? props.accentOn : props.accentOff
          }`}
        >
          {allowed ? 'Allowed' : 'Not allowed'}
        </button>
      </div>
      {allowed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={props.onToggleInside}
            className={`px-3 py-3 rounded-lg border text-left transition ${
              props.inside
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <span className="block text-sm font-semibold">Inside</span>
            <span className="block text-[11px] text-gray-500 mt-0.5">Indoors</span>
          </button>
          <button
            type="button"
            onClick={props.onToggleOutside}
            className={`px-3 py-3 rounded-lg border text-left transition ${
              props.outside
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
  );
}

/**
 * Host control: what is allowed (420 vs cigarettes) and where (inside / outside).
 * Outside includes balcony, patio, and yard.
 */
export function ConsumptionPolicyEditor({ value, onChange, className = '' }: Props) {
  const set = (patch: Partial<ConsumptionPolicyEditorValue>) => {
    onChange({ ...value, ...patch });
  };

  const toggleCannabisAllowed = () => {
    const allowed = value.cannabisInside || value.cannabisOutside;
    if (allowed) {
      set({ cannabisInside: false, cannabisOutside: false });
    } else {
      set({ cannabisInside: false, cannabisOutside: true });
    }
  };

  const toggleCigarettesAllowed = () => {
    const allowed = value.cigarettesInside || value.cigarettesOutside;
    if (allowed) {
      set({ cigarettesInside: false, cigarettesOutside: false });
    } else {
      set({ cigarettesInside: false, cigarettesOutside: true });
    }
  };

  const toggleCannabisInside = () => {
    const nextInside = !value.cannabisInside;
    const nextOutside = value.cannabisOutside;
    if (!nextInside && !nextOutside) {
      set({ cannabisInside: false, cannabisOutside: true });
      return;
    }
    set({ cannabisInside: nextInside });
  };

  const toggleCannabisOutside = () => {
    const nextOutside = !value.cannabisOutside;
    const nextInside = value.cannabisInside;
    if (!nextInside && !nextOutside) {
      set({ cannabisInside: true, cannabisOutside: false });
      return;
    }
    set({ cannabisOutside: nextOutside });
  };

  const toggleCigarettesInside = () => {
    const nextInside = !value.cigarettesInside;
    const nextOutside = value.cigarettesOutside;
    if (!nextInside && !nextOutside) {
      set({ cigarettesInside: false, cigarettesOutside: true });
      return;
    }
    set({ cigarettesInside: nextInside });
  };

  const toggleCigarettesOutside = () => {
    const nextOutside = !value.cigarettesOutside;
    const nextInside = value.cigarettesInside;
    if (!nextInside && !nextOutside) {
      set({ cigarettesInside: true, cigarettesOutside: false });
      return;
    }
    set({ cigarettesOutside: nextOutside });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-white font-medium">Consumption &amp; smoking</h3>
        <p className="text-sm text-gray-400 mt-1">
          Pick what guests may use, and where. Outside includes balcony, patio, and yard.
        </p>
      </div>

      <SubstanceRow
        title="420 / cannabis"
        subtitle="Wellness consumption for guests"
        accentOn="bg-emerald-600 border-emerald-500 text-white"
        accentOff="bg-gray-900 border-gray-700 text-gray-400 hover:border-emerald-500/40"
        inside={value.cannabisInside}
        outside={value.cannabisOutside}
        onToggleAllowed={toggleCannabisAllowed}
        onToggleInside={toggleCannabisInside}
        onToggleOutside={toggleCannabisOutside}
      />

      <SubstanceRow
        title="Cigarettes"
        subtitle="Tobacco / cigarette smoking"
        accentOn="bg-amber-600/30 border-amber-500 text-white"
        accentOff="bg-gray-900 border-gray-700 text-gray-400 hover:border-amber-500/40"
        inside={value.cigarettesInside}
        outside={value.cigarettesOutside}
        onToggleAllowed={toggleCigarettesAllowed}
        onToggleInside={toggleCigarettesInside}
        onToggleOutside={toggleCigarettesOutside}
      />
    </div>
  );
}
