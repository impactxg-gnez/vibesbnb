'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { AmenityIcon } from '@/lib/amenityIcons';
import {
  ALL_CATALOG_AMENITIES,
  AMENITY_CATEGORIES,
  isCatalogAmenity,
  normalizeAmenityList,
  splitAmenities,
} from '@/lib/propertyAmenityCatalog';

type Props = {
  selected: string[];
  onChange: (amenities: string[]) => void;
  className?: string;
  /** When true, hide the long intro paragraph (e.g. listing wizard step). */
  compact?: boolean;
};

export function PropertyAmenitiesPicker({
  selected,
  onChange,
  className = '',
  compact = false,
}: Props) {
  const [search, setSearch] = useState('');
  const normalizedRef = useRef<string>('');

  useEffect(() => {
    const normalized = normalizeAmenityList(selected);
    const key = normalized.join('\0');
    if (key === normalizedRef.current) return;
    const currentKey = selected.join('\0');
    if (key !== currentKey) {
      normalizedRef.current = key;
      onChange(normalized);
    } else {
      normalizedRef.current = key;
    }
  }, [selected, onChange]);

  const query = search.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!query) return AMENITY_CATEGORIES;
    return AMENITY_CATEGORIES.map((cat) => ({
      ...cat,
      amenities: cat.amenities.filter((a) => a.toLowerCase().includes(query)),
    })).filter((cat) => cat.amenities.length > 0);
  }, [query]);

  const visibleAmenityCount = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.amenities.length, 0),
    [filteredCategories],
  );

  const { legacy } = useMemo(() => splitAmenities(selected), [selected]);

  const selectedSet = useMemo(
    () => new Set(selected.map((a) => a.toLowerCase())),
    [selected],
  );

  const toggle = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (selectedSet.has(lower)) {
      onChange(selected.filter((a) => a.toLowerCase() !== lower));
    } else {
      onChange([...selected, amenity]);
    }
  };

  const removeLegacy = (amenity: string) => {
    const lower = amenity.toLowerCase();
    onChange(selected.filter((a) => a.toLowerCase() !== lower));
  };

  const countInCategory = (amenities: readonly string[]) =>
    amenities.filter((a) => selectedSet.has(a.toLowerCase())).length;

  return (
    <div className={className}>
      {!compact && (
        <p className="text-sm text-gray-400 mb-4">
          Select everything your property offers. Guests often filter by amenities when searching.
        </p>
      )}

      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all amenities..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
        <span>
          <span className="text-emerald-400 font-medium">{selected.length}</span> selected
        </span>
        <span>
          Showing{' '}
          <span className="text-white font-medium">{visibleAmenityCount}</span>
          {query ? ' matching' : ` of ${ALL_CATALOG_AMENITIES.length}`} amenities
        </span>
        <span>{AMENITY_CATEGORIES.length} categories</span>
      </div>

      <div className="space-y-8 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        {filteredCategories.map((category) => {
          const selectedCount = countInCategory(category.amenities);

          return (
            <section key={category.id}>
              <div className="flex items-center justify-between mb-3 sticky top-0 z-10 bg-gray-950/95 py-2 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  {category.title}
                </h3>
                <span className="text-xs text-gray-500">
                  {selectedCount > 0 && (
                    <span className="text-emerald-400 mr-2">{selectedCount} selected</span>
                  )}
                  {category.amenities.length} options
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {category.amenities.map((amenity) => {
                  const isSelected = selectedSet.has(amenity.toLowerCase());
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggle(amenity)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-600'
                      }`}
                    >
                      <AmenityIcon
                        label={amenity}
                        size={16}
                        className={`shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`}
                      />
                      <span className="leading-snug">{amenity}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {legacy.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Other amenities on this listing
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            These labels are not in the standard catalog (e.g. from an import). Remove if
            incorrect, or pick the matching option above.
          </p>
          <div className="flex flex-wrap gap-2">
            {legacy.map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-100 text-sm"
              >
                <AmenityIcon label={amenity} size={14} className="text-amber-300 shrink-0" />
                {amenity}
                <button
                  type="button"
                  onClick={() => removeLegacy(amenity)}
                  className="p-0.5 rounded hover:bg-amber-800/50"
                  aria-label={`Remove ${amenity}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {query && filteredCategories.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">No amenities match your search.</p>
      )}
    </div>
  );
}

/** Re-export for callers that need to check catalog membership. */
export { isCatalogAmenity, normalizeAmenityList };
