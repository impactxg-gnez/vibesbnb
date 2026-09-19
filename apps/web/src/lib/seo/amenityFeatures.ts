import { canonicalizeAmenity } from '@/lib/propertyAmenityCatalog';
import type { PropertyStayPolicies } from '@/lib/seo/propertyStayPolicies';

/** Google VacationRental amenityFeature names we can map from catalog labels. */
const GOOGLE_AMENITY_BY_CATALOG: Record<string, string> = {
  'Air conditioning': 'ac',
  'Patio or balcony': 'balcony',
  'Beach access': 'beachAccess',
  Crib: 'crib',
  Elevator: 'elevator',
  'Indoor fireplace': 'fireplace',
  'Indoor fireplace: electric': 'fireplace',
  'Breakfast provided': 'freeBreakfast',
  Gym: 'gymFitnessEquipment',
  'Exercise equipment': 'gymFitnessEquipment',
  Heating: 'heating',
  'Hot tub': 'hotTub',
  Iron: 'iron',
  Kitchen: 'kitchenKitchenette',
  Microwave: 'microwave',
  'BBQ grill': 'outdoorGrill',
  Oven: 'ovenStove',
  Stove: 'ovenStove',
  'Pets allowed': 'petsAllowed',
  Pool: 'pool',
  'Self check-in': 'selfCheckinCheckout',
  TV: 'tv',
  Washer: 'washerDryer',
  Dryer: 'washerDryer',
  WiFi: 'wifi',
  'Step-free guest entrance': 'wheelchairAccessible',
};

export type AmenityFeatureNode = {
  '@type': 'LocationFeatureSpecification';
  name: string;
  value: boolean;
};

export function amenityFeaturesFromListing(opts: {
  amenities: string[];
  policies: PropertyStayPolicies;
}): AmenityFeatureNode[] {
  const features = new Map<string, AmenityFeatureNode>();

  const add = (name: string, value: boolean) => {
    if (!name) return;
    features.set(name, {
      '@type': 'LocationFeatureSpecification',
      name,
      value,
    });
  };

  for (const raw of opts.amenities) {
    const canonical = canonicalizeAmenity(raw) || raw.trim();
    const google = GOOGLE_AMENITY_BY_CATALOG[canonical];
    if (google) add(google, true);
  }

  if (opts.policies.hasPatioOrBalcony) {
    add('balcony', true);
    add('patio', true);
  }

  add('smokingAllowed', opts.policies.tobaccoAllowed);

  if (opts.policies.cannabisAllowed) {
    add('Cannabis consumption allowed', true);
    if (opts.policies.cannabisIndoor) add('Cannabis consumption allowed indoors', true);
    if (opts.policies.cannabisOutdoor) add('Cannabis consumption allowed outdoors', true);
  } else {
    add('Cannabis consumption allowed', false);
  }

  return [...features.values()];
}
