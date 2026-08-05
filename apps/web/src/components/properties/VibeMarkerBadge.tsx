import {
  BALCONY_VIBE_NAME,
  FULL_VIBE_NAME,
  type VibeMarker,
} from '@/lib/consumptionPolicy';

type Props = {
  marker: VibeMarker;
  className?: string;
  /** Compact size for image overlays */
  size?: 'sm' | 'md';
};

/** Named guest-facing vibe marker: Full Vibe (green) or Balcony Vibe (gold). */
export function VibeMarkerBadge({ marker, className = '', size = 'md' }: Props) {
  const isBalcony = marker.kind === 'balcony_vibe';
  const pad = size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';
  const colors = isBalcony
    ? 'border-amber-400/50 bg-amber-500/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
    : 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.45)]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold tracking-wide uppercase ${pad} ${colors} ${className}`}
      title={
        isBalcony
          ? `${BALCONY_VIBE_NAME}: balcony + 420 allowed inside and outside`
          : `${FULL_VIBE_NAME}: 420 allowed inside and outside`
      }
    >
      <span aria-hidden>{isBalcony ? '✨' : '🌿'}</span>
      {marker.name}
    </span>
  );
}
