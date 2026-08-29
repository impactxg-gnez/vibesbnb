import type { BrowseProperty } from '@/src/lib/api';

export type SearchFilters = {
  location: string;
  guests: number;
  category: string;
  sort: 'high-low' | 'low-high' | 'rating';
  wellnessOnly: boolean;
};

export function filterProperties(
  properties: BrowseProperty[],
  filters: SearchFilters
): BrowseProperty[] {
  let rows = [...properties];
  const q = filters.location.trim().toLowerCase();

  if (q) {
    rows = rows.filter((p) => {
      const loc = (p.location || '').toLowerCase();
      const name = (p.name || p.title || '').toLowerCase();
      return loc.includes(q) || name.includes(q);
    });
  }

  if (filters.category) {
    const cat = filters.category.toLowerCase();
    rows = rows.filter((p) => (p.type || '').toLowerCase().includes(cat));
  }

  if (filters.wellnessOnly) {
    rows = rows.filter(
      (p) =>
        (p as { wellness_consumption_indoor_allowed?: boolean }).wellness_consumption_indoor_allowed ||
        (p as { wellness_consumption_outdoor_allowed?: boolean }).wellness_consumption_outdoor_allowed
    );
  }

  if (filters.guests > 1) {
    rows = rows.filter((p) => (p.guests || 1) >= filters.guests);
  }

  rows.sort((a, b) => {
    if (filters.sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    const pa = Number(a.price) || 0;
    const pb = Number(b.price) || 0;
    return filters.sort === 'low-high' ? pa - pb : pb - pa;
  });

  return rows;
}

export const CATEGORY_CHIPS = [
  { id: '', label: 'All' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'beach', label: 'Beach' },
  { id: 'city', label: 'City' },
  { id: 'Entire House', label: 'Entire house' },
  { id: 'Condo', label: 'Condo' },
];
