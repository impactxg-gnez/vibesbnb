'use client';

import { ACCESSIBILITY_FILTER_CHIPS } from '@/lib/accessibility';

type Props = {
  amenities?: string[] | null;
  description?: string | null;
  adaptedStatus?: string | null;
};

/** Listing PDP: structured accessibility features + host narrative + Adapted badge. */
export function ListingAccessibilitySection({ amenities, description, adaptedStatus }: Props) {
  const list = (amenities || []).map((a) => String(a).trim()).filter(Boolean);
  const chips = ACCESSIBILITY_FILTER_CHIPS.filter((chip) =>
    list.some((a) => a.toLowerCase() === chip.toLowerCase())
  );
  const verified = adaptedStatus === 'verified';
  if (!chips.length && !description && !verified) return null;

  return (
    <section
      className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
      aria-labelledby="listing-a11y-heading"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <h2 id="listing-a11y-heading" className="text-xl font-bold text-white">
          Accessibility
        </h2>
        {verified ? (
          <span className="text-xs font-bold uppercase tracking-wider bg-primary-500 text-black px-3 py-1 rounded-full">
            Adapted verified
          </span>
        ) : null}
      </div>
      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="text-sm bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}
      {description ? (
        <p className="text-muted leading-relaxed whitespace-pre-wrap">{description}</p>
      ) : (
        <p className="text-muted text-sm">
          Host-stated features above. Contact the host to confirm whether this stay meets your specific needs.
        </p>
      )}
    </section>
  );
}
