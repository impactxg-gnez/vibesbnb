/**
 * GEO invariants: cannabis is never inferred from tobacco/smoking/patio flags.
 * Run: npx tsx scripts/validate-geo.ts
 */
import { amenityFeaturesFromListing } from '../src/lib/seo/amenityFeatures';
import { vacationRentalJsonLd } from '../src/lib/seo/jsonLd';
import { buildLlmsTxt } from '../src/lib/seo/llmsTxt';
import { buildCannabisMiamiPage, buildMiamiPage } from '../src/lib/seo/locationPages';
import { parsePropertyPlace } from '../src/lib/seo/propertyPlace';
import { mapSeoPropertyRow } from '../src/lib/seo/publicProperties';
import { resolvePropertyStayPolicies } from '../src/lib/seo/propertyStayPolicies';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const tobaccoOnly = resolvePropertyStayPolicies({
  smoking_inside_allowed: true,
  smoking_outside_allowed: true,
  smoke_friendly: true,
  wellness_consumption_indoor_allowed: false,
  wellness_consumption_outdoor_allowed: false,
  amenities: ['Patio or balcony'],
});
assert(!tobaccoOnly.cannabisAllowed, 'tobacco/patio must not imply cannabis-friendly');
assert(tobaccoOnly.tobaccoAllowed, 'tobacco flags should still be read');
assert(tobaccoOnly.hasPatioOrBalcony, 'patio amenity should be detected');

const cannabisOutdoor = resolvePropertyStayPolicies({
  wellness_consumption_outdoor_allowed: true,
  wellness_consumption_indoor_allowed: false,
});
assert(cannabisOutdoor.cannabisAllowed, 'outdoor cannabis flag should be cannabis-friendly');
assert(!cannabisOutdoor.fullyCannabisFriendly, 'outdoor-only is not fully 420');

const wynwood = parsePropertyPlace('123 Fake St, Wynwood, Miami, FL 33127');
assert(wynwood.isMiami, 'Wynwood address should count as Miami');
assert(wynwood.neighborhood === 'wynwood', 'Wynwood neighborhood should parse');
assert(!wynwood.publicLocation.includes('123'), 'street number must stay private');

const cannabisRow = mapSeoPropertyRow({
  id: 'p-yes',
  name: 'Cannabis loft',
  location: 'Wynwood, Miami, FL',
  status: 'active',
  wellness_consumption_indoor_allowed: true,
  wellness_consumption_outdoor_allowed: true,
  amenities: ['WiFi'],
  guests: 4,
  bedrooms: 2,
  bathrooms: 1,
  rating: 4.8,
  reviews_count: 3,
});
const tobaccoRow = mapSeoPropertyRow({
  id: 'p-no',
  name: 'No cannabis condo',
  location: 'Downtown Miami, FL',
  status: 'active',
  wellness_consumption_indoor_allowed: false,
  wellness_consumption_outdoor_allowed: false,
  smoking_outside_allowed: true,
  amenities: ['Patio or balcony'],
  guests: 2,
  bedrooms: 1,
  bathrooms: 1,
});
assert(cannabisRow && tobaccoRow, 'rows should map');
assert(cannabisRow!.cannabisAllowed && tobaccoRow && !tobaccoRow.cannabisAllowed, 'only flagged listing is 420');

const jsonLdYes = vacationRentalJsonLd(cannabisRow!);
const jsonLdNo = vacationRentalJsonLd(tobaccoRow!);
assert(jsonLdYes['@type'] === 'VacationRental', 'eligible listing JSON-LD type');
assert(jsonLdNo['@type'] === 'VacationRental', 'non-420 listing still a VacationRental');
const featuresNo = amenityFeaturesFromListing({
  amenities: tobaccoRow!.amenities,
  policies: resolvePropertyStayPolicies({
    amenities: tobaccoRow!.amenities,
    wellness_consumption_indoor_allowed: false,
    wellness_consumption_outdoor_allowed: false,
    smoking_outside_allowed: true,
  }),
});
assert(
  featuresNo.some((f) => f.name === 'Cannabis consumption allowed' && f.value === false),
  'non-420 listing must not claim cannabis'
);
assert(
  !JSON.stringify(jsonLdNo).includes('"Cannabis consumption allowed":true'),
  'non-420 JSON-LD must not claim cannabis allowed'
);

const miami = buildMiamiPage([cannabisRow!, tobaccoRow!]);
const cannabisPage = buildCannabisMiamiPage([cannabisRow!, tobaccoRow!]);
assert(miami?.properties.length === 2, 'Miami page includes all Miami inventory');
assert(cannabisPage?.properties.length === 1, '420 page includes only verified cannabis listings');
assert(cannabisPage?.properties[0].id === 'p-yes', '420 page listing id');

const llms = buildLlmsTxt([cannabisRow!, tobaccoRow!]);
assert(llms.includes('# VibesBNB'), 'llms.txt heading');
assert(llms.includes('/listings/p-yes'), 'llms.txt includes real property URL');
assert(!llms.includes('p-missing'), 'llms.txt does not invent ids');
assert(llms.includes('cannabis not listed as allowed') || llms.includes('/listings/p-no'), 'non-420 listing can appear with honest policy');

console.log('GEO invariants passed');
