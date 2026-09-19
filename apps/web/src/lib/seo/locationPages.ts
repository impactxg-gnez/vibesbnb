import type { Metadata } from 'next';
import {
  cannabisFriendlyProperties,
  miamiProperties,
  neighborhoodProperties,
  type SeoPropertyCard,
} from '@/lib/seo/publicProperties';
import {
  MIAMI_NEIGHBORHOODS,
  neighborhoodBySlug,
  type MiamiNeighborhoodId,
} from '@/lib/seo/propertyPlace';
import { absoluteUrl } from '@/lib/seo/siteUrl';

export type LocationPageKind = 'miami' | 'neighborhood' | 'cannabis' | 'cannabis-neighborhood';

export type LocationPageModel = {
  kind: LocationPageKind;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  properties: SeoPropertyCard[];
  neighborhood?: (typeof MIAMI_NEIGHBORHOODS)[number];
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
};

function countSentence(n: number, noun: string): string {
  if (n === 1) return `1 ${noun}`;
  return `${n} ${noun}s`;
}

function cannabisBreakdown(list: SeoPropertyCard[]): string {
  const indoorOnly = list.filter((p) => p.cannabisIndoor && !p.cannabisOutdoor).length;
  const outdoorOnly = list.filter((p) => p.cannabisOutdoor && !p.cannabisIndoor).length;
  const both = list.filter((p) => p.fullyCannabisFriendly).length;
  const parts: string[] = [];
  if (both) parts.push(`${both} indoors and outdoors`);
  if (indoorOnly) parts.push(`${indoorOnly} indoors only`);
  if (outdoorOnly) parts.push(`${outdoorOnly} outdoors only`);
  return parts.length ? parts.join(', ') : 'host-verified indoor and/or outdoor permission';
}

export function buildMiamiPage(all: SeoPropertyCard[]): LocationPageModel | null {
  const miami = miamiProperties(all);
  if (miami.length === 0) return null;

  const cannabis = cannabisFriendlyProperties(miami);
  const patio = miami.filter((p) => p.hasPatioOrBalcony);
  const outdoorCannabis = miami.filter((p) => p.cannabisOutdoor);
  const neighborhoods = MIAMI_NEIGHBORHOODS.filter(
    (n) => neighborhoodProperties(miami, n.id).length > 0
  );

  const intro = `VibesBNB is a vacation rental marketplace operated from Miami. It currently lists ${countSentence(
    miami.length,
    'active stay'
  )} in the Miami area. Cannabis use is allowed only where the host has marked indoor and/or outdoor consumption on that listing — not on every property. Tobacco smoking is stored as a separate rule and is not treated as cannabis permission.`;

  const faqs = [
    {
      q: 'Are there 420-friendly vacation rentals in Miami on VibesBNB?',
      a:
        cannabis.length > 0
          ? `Yes. ${cannabis.length} of the current Miami listings explicitly allow cannabis consumption (${cannabisBreakdown(
              cannabis
            )}). Open a listing to see the exact indoor vs outdoor rule before you book.`
          : 'VibesBNB can list cannabis-friendly stays, but none of the current Miami inventory is marked as allowing cannabis consumption. Check individual listings as inventory changes.',
    },
    {
      q: 'Which Miami neighborhoods have VibesBNB properties?',
      a:
        neighborhoods.length > 0
          ? `Current Miami listings include ${neighborhoods
              .map((n) => n.name)
              .join(', ')}. Other Miami-area addresses may appear when a host lists them.`
          : 'Current listings are in the Miami area. Neighborhood labels appear when the stored address includes a known area such as Wynwood, Downtown Miami, or Brickell.',
    },
    {
      q: 'Are all VibesBNB properties 420-friendly?',
      a: `No. Only listings whose hosts enabled indoor and/or outdoor cannabis consumption are treated as cannabis-friendly. Right now that is ${cannabis.length} of ${miami.length} Miami stays.`,
    },
    {
      q: 'Which properties have outdoor smoking or patio areas?',
      a: `${patio.length} Miami listings include a patio or balcony amenity. ${outdoorCannabis.length} listings allow cannabis consumption outdoors. Those are independent facts — a balcony does not mean cannabis is allowed.`,
    },
  ];

  const related: { href: string; label: string }[] = [
    { href: '/search?location=Miami', label: 'Search Miami stays' },
    { href: '/faq', label: 'Booking and policy FAQ' },
  ];
  if (cannabis.length > 0) {
    related.unshift({
      href: '/miami/420-friendly',
      label: 'Cannabis-friendly Miami stays',
    });
  }
  for (const n of neighborhoods) {
    related.push({ href: `/miami/${n.slug}`, label: `Stays in ${n.name}` });
  }

  return {
    kind: 'miami',
    path: '/miami',
    title: 'Miami vacation rentals',
    description: `Browse ${miami.length} VibesBNB vacation rentals in Miami, including stays with verified cannabis policies, patios, and neighborhood listings in Wynwood, Downtown, and Brickell when those addresses are in inventory.`,
    h1: 'Vacation rentals in Miami',
    intro,
    properties: miami,
    faqs,
    related,
  };
}

export function buildNeighborhoodPage(
  all: SeoPropertyCard[],
  slug: string
): LocationPageModel | null {
  const neighborhood = neighborhoodBySlug(slug);
  if (!neighborhood) return null;
  const miami = miamiProperties(all);
  const list = neighborhoodProperties(miami, neighborhood.id);
  if (list.length === 0) return null;

  const cannabis = cannabisFriendlyProperties(list);
  const patio = list.filter((p) => p.hasPatioOrBalcony);

  return {
    kind: 'neighborhood',
    path: `/miami/${neighborhood.slug}`,
    title: `${neighborhood.name} vacation rentals`,
    description: `${list.length} VibesBNB ${
      list.length === 1 ? 'stay' : 'stays'
    } in ${neighborhood.name}, Miami. Each listing publishes its own cannabis, outdoor-space, and house rules.`,
    h1: `Vacation rentals in ${neighborhood.name}`,
    intro: `VibesBNB currently lists ${countSentence(
      list.length,
      'active stay'
    )} whose stored location includes ${neighborhood.name}. ${
      cannabis.length
        ? `${cannabis.length} of those listings explicitly allow cannabis consumption.`
        : 'None of these listings are currently marked cannabis-friendly.'
    } ${
      patio.length
        ? `${patio.length} list a patio or balcony.`
        : 'Patio or balcony amenities appear only when the host added them.'
    }`,
    properties: list,
    neighborhood,
    faqs: [
      {
        q: `Does VibesBNB have stays in ${neighborhood.name}?`,
        a: `Yes. There ${list.length === 1 ? 'is 1 active listing' : `are ${list.length} active listings`} whose address includes ${neighborhood.name}.`,
      },
      {
        q: `Are ${neighborhood.name} listings cannabis-friendly?`,
        a:
          cannabis.length > 0
            ? `${cannabis.length} of ${list.length} ${neighborhood.name} listings allow cannabis indoors and/or outdoors. The others do not.`
            : `None of the current ${neighborhood.name} listings are marked as allowing cannabis consumption.`,
      },
    ],
    related: [
      { href: '/miami', label: 'All Miami vacation rentals' },
      ...(cannabis.length > 0
        ? [
            {
              href: `/miami/420-friendly/${neighborhood.slug}`,
              label: `Cannabis-friendly stays in ${neighborhood.name}`,
            },
          ]
        : []),
      { href: `/search?location=${encodeURIComponent(neighborhood.name)}`, label: `Search ${neighborhood.name}` },
    ],
  };
}

export function buildCannabisMiamiPage(all: SeoPropertyCard[]): LocationPageModel | null {
  const miami = miamiProperties(all);
  const list = cannabisFriendlyProperties(miami);
  if (list.length === 0) return null;

  const outdoor = list.filter((p) => p.cannabisOutdoor);
  const indoor = list.filter((p) => p.cannabisIndoor);
  const patio = list.filter((p) => p.hasPatioOrBalcony);

  return {
    kind: 'cannabis',
    path: '/miami/420-friendly',
    title: '420-friendly vacation rentals in Miami',
    description: `${list.length} VibesBNB Miami listings with a host-verified cannabis consumption policy — indoor, outdoor, or both. Tobacco smoking is listed separately.`,
    h1: 'Cannabis-friendly vacation rentals in Miami',
    intro: `These ${list.length} Miami listings are the ones whose hosts turned on cannabis consumption indoors, outdoors, or both. That is not the full VibesBNB catalog: listings without those flags are omitted here. Indoor permission (${indoor.length}) and outdoor permission (${outdoor.length}) are stored separately, and a patio (${patio.length} of these listings) does not by itself mean cannabis is allowed.`,
    properties: list,
    faqs: [
      {
        q: 'How can I find a cannabis-friendly property on VibesBNB?',
        a: 'Use this page, the search filter for cannabis-friendly stays, or open a listing and read the wellness policy. Only properties with indoor and/or outdoor cannabis flags are included.',
      },
      {
        q: 'Is smoking allowed indoors?',
        a: `${indoor.length} of these listings allow cannabis consumption indoors. Tobacco smoking is a different field and is not assumed from cannabis permission. Always read the listing.`,
      },
      {
        q: 'Are outdoor smoking areas available?',
        a: `${outdoor.length} of these listings allow cannabis outdoors. ${patio.length} also list a patio or balcony. Outdoor cannabis permission and outdoor amenities are recorded separately.`,
      },
    ],
    related: [
      { href: '/miami', label: 'All Miami vacation rentals' },
      { href: '/search?location=Miami&cannabis=1', label: 'Search cannabis-friendly Miami stays' },
      { href: '/faq', label: 'Cannabis and booking FAQ' },
    ],
  };
}

export function buildCannabisNeighborhoodPage(
  all: SeoPropertyCard[],
  slug: string
): LocationPageModel | null {
  const neighborhood = neighborhoodBySlug(slug);
  if (!neighborhood) return null;
  const list = cannabisFriendlyProperties(
    neighborhoodProperties(miamiProperties(all), neighborhood.id)
  );
  if (list.length === 0) return null;

  return {
    kind: 'cannabis-neighborhood',
    path: `/miami/420-friendly/${neighborhood.slug}`,
    title: `420-friendly stays in ${neighborhood.name}`,
    description: `${list.length} VibesBNB listings in ${neighborhood.name}, Miami with a host-verified cannabis consumption policy.`,
    h1: `Cannabis-friendly stays in ${neighborhood.name}`,
    intro: `These ${list.length} listings are in ${neighborhood.name} and allow cannabis consumption indoors and/or outdoors according to the host-set flags. Listings in ${neighborhood.name} without those flags are not shown here.`,
    properties: list,
    neighborhood,
    faqs: [
      {
        q: `Which ${neighborhood.name} properties allow cannabis use?`,
        a: `VibesBNB currently has ${list.length} ${neighborhood.name} ${
          list.length === 1 ? 'listing' : 'listings'
        } with a verified cannabis policy. Indoor and outdoor permission can differ by listing.`,
      },
    ],
    related: [
      { href: `/miami/${neighborhood.slug}`, label: `All ${neighborhood.name} stays` },
      { href: '/miami/420-friendly', label: 'Cannabis-friendly Miami stays' },
      { href: '/miami', label: 'Miami vacation rentals' },
    ],
  };
}

export function locationMetadata(model: LocationPageModel): Metadata {
  const url = absoluteUrl(model.path);
  return {
    title: model.title,
    description: model.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${model.title} | VibesBNB`,
      description: model.description,
      siteName: 'VibesBNB',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: model.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${model.title} | VibesBNB`,
      description: model.description,
      images: ['/opengraph-image'],
    },
  };
}

export function indexableLocationPaths(all: SeoPropertyCard[]): string[] {
  const paths: string[] = [];
  if (buildMiamiPage(all)) paths.push('/miami');
  if (buildCannabisMiamiPage(all)) paths.push('/miami/420-friendly');
  for (const n of MIAMI_NEIGHBORHOODS) {
    if (buildNeighborhoodPage(all, n.slug)) paths.push(`/miami/${n.slug}`);
    if (buildCannabisNeighborhoodPage(all, n.slug)) {
      paths.push(`/miami/420-friendly/${n.slug}`);
    }
  }
  return paths;
}
