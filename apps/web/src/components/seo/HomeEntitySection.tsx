import Link from 'next/link';
import {
  cannabisFriendlyProperties,
  miamiProperties,
  type SeoPropertyCard,
} from '@/lib/seo/publicProperties';
import { MIAMI_NEIGHBORHOODS } from '@/lib/seo/propertyPlace';

type Props = {
  properties: SeoPropertyCard[];
};

export function HomeEntitySection({ properties }: Props) {
  const miami = miamiProperties(properties);
  const cannabis = cannabisFriendlyProperties(miami);
  const neighborhoods = MIAMI_NEIGHBORHOODS.filter((n) =>
    miami.some((p) => p.neighborhood === n.id)
  );

  if (miami.length === 0 && properties.length === 0) {
    return (
      <section className="container mx-auto px-4 sm:px-6 pb-24 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          A vacation rental marketplace
        </h2>
        <p className="text-muted leading-relaxed max-w-3xl">
          VibesBNB is a short-term rental platform for apartments, condos, and homes. Listings
          publish their own house rules, including cannabis consumption where a host has verified
          indoor or outdoor permission. Inventory is shown on each live listing page.
        </p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 sm:px-6 pb-24 max-w-5xl">
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
        Miami vacation rentals on VibesBNB
      </h2>
      <div className="space-y-4 text-muted leading-relaxed max-w-3xl">
        <p>
          VibesBNB is a vacation rental marketplace for short-term stays, with current inventory
          concentrated in Miami. It is not a hotel chain and it does not sell cannabis. Guests book
          individual listings whose hosts set occupancy, amenities, and consumption rules.
        </p>
        <p>
          {miami.length > 0
            ? `There ${miami.length === 1 ? 'is currently 1 active Miami listing' : `are currently ${miami.length} active Miami listings`}. ${
                cannabis.length
                  ? `${cannabis.length} of those stays explicitly allow cannabis consumption indoors and/or outdoors.`
                  : 'None of the current Miami listings are marked cannabis-friendly.'
              } ${
                neighborhoods.length
                  ? `Addresses in inventory include ${neighborhoods.map((n) => n.name).join(', ')}.`
                  : ''
              }`
            : 'Browse the live catalog for the current set of stays.'}
        </p>
      </div>
      <nav aria-label="Miami stays" className="mt-8 flex flex-wrap gap-3">
        {miami.length > 0 ? (
          <Link
            href="/miami"
            className="text-sm font-semibold px-4 py-2 rounded-full border border-white/10 text-white hover:border-primary-500/40 hover:text-primary-400"
          >
            Miami vacation rentals
          </Link>
        ) : null}
        {cannabis.length > 0 ? (
          <Link
            href="/miami/420-friendly"
            className="text-sm font-semibold px-4 py-2 rounded-full border border-white/10 text-white hover:border-primary-500/40 hover:text-primary-400"
          >
            Cannabis-friendly Miami stays
          </Link>
        ) : null}
        {neighborhoods.map((n) => (
          <Link
            key={n.id}
            href={`/miami/${n.slug}`}
            className="text-sm font-semibold px-4 py-2 rounded-full border border-white/10 text-white hover:border-primary-500/40 hover:text-primary-400"
          >
            {n.name} stays
          </Link>
        ))}
        <Link
          href="/search"
          className="text-sm font-semibold px-4 py-2 rounded-full border border-white/10 text-white hover:border-primary-500/40 hover:text-primary-400"
        >
          Search all listings
        </Link>
      </nav>
    </section>
  );
}
