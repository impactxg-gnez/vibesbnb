import {
  cannabisFriendlyProperties,
  miamiProperties,
  type SeoPropertyCard,
} from '@/lib/seo/publicProperties';
import { MIAMI_NEIGHBORHOODS } from '@/lib/seo/propertyPlace';
import { indexableLocationPaths } from '@/lib/seo/locationPages';
import { absoluteUrl } from '@/lib/seo/siteUrl';

function uniqueTypes(list: SeoPropertyCard[]): string[] {
  const set = new Set<string>();
  for (const p of list) {
    const t = (p.type || '').trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function amenityCounts(list: SeoPropertyCard[]): string[] {
  const counts = new Map<string, number>();
  for (const p of list) {
    for (const a of p.amenities) {
      counts.set(a, (counts.get(a) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([name, n]) => `${name} (${n})`);
}

export function buildLlmsTxt(all: SeoPropertyCard[]): string {
  const site = absoluteUrl('/');
  const miami = miamiProperties(all);
  const cannabis = cannabisFriendlyProperties(all);
  const miamiCannabis = cannabisFriendlyProperties(miami);
  const patio = miami.filter((p) => p.hasPatioOrBalcony);
  const outdoorCannabis = miami.filter((p) => p.cannabisOutdoor);
  const indoorCannabis = miami.filter((p) => p.cannabisIndoor);
  const locationPaths = indexableLocationPaths(all);
  const neighborhoods = MIAMI_NEIGHBORHOODS.filter((n) =>
    miami.some((p) => p.neighborhood === n.id)
  );

  const lines: string[] = [
    '# VibesBNB',
    '',
    'VibesBNB is a vacation rental marketplace for short-term stays. It is operated by AllBlack Everything LLC in Miami, Florida. Listings publish house rules, including cannabis consumption where a host has verified indoor and/or outdoor permission.',
    '',
    '## What VibesBNB is',
    '',
    '- A lodging marketplace, not a dispensary. VibesBNB does not sell cannabis.',
    '- Guests book apartments, condos, houses, and rooms through vibesbnb.com.',
    '- Each listing has its own wellness/cannabis policy. Cannabis-friendly is not assumed for the whole catalog.',
    '',
    '## Locations served',
    '',
  ];

  if (miami.length > 0) {
    lines.push(
      `- Current public inventory includes ${miami.length} active Miami-area listing${miami.length === 1 ? '' : 's'}.`
    );
    if (neighborhoods.length > 0) {
      lines.push(
        `- Neighborhoods present in stored addresses: ${neighborhoods.map((n) => n.name).join(', ')}.`
      );
    } else {
      lines.push('- Neighborhood pages are created only when a listing address includes Wynwood, Downtown Miami, or Brickell.');
    }
  } else {
    lines.push('- No Miami listings were available when this file was generated. Check /search for current inventory.');
  }

  const other = all.filter((p) => !p.isMiami);
  if (other.length > 0) {
    lines.push(`- Additional active listings outside Miami: ${other.length}.`);
  }

  lines.push(
    '',
    '## Property types',
    '',
    uniqueTypes(all).length
      ? uniqueTypes(all).map((t) => `- ${t}`).join('\n')
      : '- Types are taken from each listing’s stored type field.'
  );

  const amenities = amenityCounts(all);
  lines.push('', '## Verified amenities', '');
  if (amenities.length > 0) {
    lines.push('Amenities below are counted from active listings (not an exhaustive catalog):');
    for (const a of amenities) lines.push(`- ${a}`);
  } else {
    lines.push('- Amenity lists are stored per listing. None were available for this snapshot.');
  }

  lines.push(
    '',
    '## 420 / cannabis-friendly inventory',
    '',
    `- Catalog-wide listings with host-verified cannabis consumption (indoor and/or outdoor): ${cannabis.length} of ${all.length} active listings.`,
    `- Miami listings with that policy: ${miamiCannabis.length} of ${miami.length}.`,
    `- Miami indoor cannabis allowed: ${indoorCannabis.length}.`,
    `- Miami outdoor cannabis allowed: ${outdoorCannabis.length}.`,
    `- Miami listings with a patio or balcony amenity: ${patio.length}.`,
    '- Do not treat tobacco smoking flags, a patio, or the generic wellness-friendly flag as cannabis permission.',
    '- Full indoor+outdoor cannabis permission is a stricter subset of cannabis-friendly.',
    '',
    '## Booking information',
    '',
    '- Browse and book at https://vibesbnb.com and https://vibesbnb.com/search',
    '- Guests typically need an account. Listing pages show nightly rate, occupancy, and house rules.',
    '- Support: info@vibesbnb.com',
    '',
    '## Important property policy distinctions',
    '',
    '- cannabis indoor: properties.wellness_consumption_indoor_allowed',
    '- cannabis outdoor: properties.wellness_consumption_outdoor_allowed',
    '- tobacco indoor/outdoor: properties.smoking_inside_allowed / smoking_outside_allowed (separate from cannabis)',
    '- outdoor space: amenities such as “Patio or balcony”, backyard, and similar host-entered labels',
    '- Public pages hide street-level addresses; neighborhood/city is shown instead.',
    '',
    '## Links to important pages',
    '',
    `- ${site}`,
    `- ${absoluteUrl('/search')}`,
    `- ${absoluteUrl('/about')}`,
    `- ${absoluteUrl('/faq')}`,
    `- ${absoluteUrl('/host')}`,
    '',
    '## Location pages',
    ''
  );

  if (locationPaths.length === 0) {
    lines.push('- No location landing pages were generated because matching inventory was empty.');
  } else {
    for (const path of locationPaths) {
      lines.push(`- ${absoluteUrl(path)}`);
    }
  }

  const sample = [...miamiCannabis, ...miami.filter((p) => !p.cannabisAllowed)].slice(0, 12);
  const seen = new Set<string>();
  lines.push('', '## Representative property pages', '');
  if (sample.length === 0) {
    lines.push('- No active property URLs were available for this snapshot.');
  } else {
    for (const p of sample) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const policy = p.cannabisAllowed
        ? p.fullyCannabisFriendly
          ? 'cannabis indoors and outdoors'
          : p.cannabisIndoor
            ? 'cannabis indoors'
            : 'cannabis outdoors'
        : 'cannabis not listed as allowed';
      lines.push(
        `- ${absoluteUrl(`/listings/${p.id}`)} — ${p.name} (${p.publicLocation || 'location on listing'}; ${policy})`
      );
    }
  }

  lines.push(
    '',
    '## Source',
    '',
    'This file is generated from active rows in the VibesBNB properties table. It is not a substitute for the live listing page.'
  );

  return `${lines.join('\n')}\n`;
}
