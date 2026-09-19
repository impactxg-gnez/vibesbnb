import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoListingCard } from '@/components/seo/SeoListingCard';
import { faqPageJsonLd } from '@/lib/seo/jsonLd';
import type { LocationPageModel } from '@/lib/seo/locationPages';

type Props = {
  model: LocationPageModel;
};

export function LocationLanding({ model }: Props) {
  const patioCount = model.properties.filter((p) => p.hasPatioOrBalcony).length;
  const outdoorCannabis = model.properties.filter((p) => p.cannabisOutdoor).length;
  const cannabisCount = model.properties.filter((p) => p.cannabisAllowed).length;
  const faqLd = faqPageJsonLd(model.faqs);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {faqLd ? <JsonLd data={faqLd} /> : null}
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-400 mb-6 flex flex-wrap gap-2">
          <Link href="/" className="hover:text-primary-400">
            VibesBNB
          </Link>
          <span aria-hidden>/</span>
          {model.kind === 'miami' ? (
            <span className="text-white">Miami</span>
          ) : (
            <>
              <Link href="/miami" className="hover:text-primary-400">
                Miami
              </Link>
              {model.kind !== 'neighborhood' ? (
                <>
                  <span aria-hidden>/</span>
                  <Link href="/miami/420-friendly" className="hover:text-primary-400">
                    Cannabis-friendly
                  </Link>
                </>
              ) : null}
              {model.neighborhood ? (
                <>
                  <span aria-hidden>/</span>
                  <span className="text-white">{model.neighborhood.name}</span>
                </>
              ) : model.kind === 'cannabis' ? (
                <>
                  <span aria-hidden>/</span>
                  <span className="text-white">Cannabis-friendly</span>
                </>
              ) : null}
            </>
          )}
        </nav>

        <header className="max-w-3xl mb-10">
          <p className="text-primary-500 text-xs font-bold uppercase tracking-widest mb-3">
            Vacation rentals
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">{model.h1}</h1>
          <p className="text-gray-300 text-lg leading-relaxed">{model.intro}</p>
        </header>

        <section className="grid sm:grid-cols-3 gap-4 mb-12">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-bold text-white">{model.properties.length}</p>
            <p className="text-sm text-gray-400 mt-1">Active listings on this page</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-bold text-white">{cannabisCount}</p>
            <p className="text-sm text-gray-400 mt-1">Host-verified cannabis-friendly</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-bold text-white">{patioCount}</p>
            <p className="text-sm text-gray-400 mt-1">Patio or balcony listed</p>
          </div>
        </section>

        <section className="mb-12 max-w-3xl space-y-4">
          <h2 className="text-2xl font-bold">What this page includes</h2>
          <p className="text-gray-300 leading-relaxed">
            Cards below are live VibesBNB inventory, not a directory of every Miami rental. Cannabis
            claims come from each listing&apos;s indoor/outdoor consumption flags. Outdoor cannabis
            permission ({outdoorCannabis} on this page) is separate from having a patio.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-6">Available properties</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {model.properties.map((property) => (
              <SeoListingCard key={property.id} property={property} />
            ))}
          </div>
        </section>

        {model.faqs.length > 0 ? (
          <section className="mb-14 max-w-3xl">
            <h2 className="text-2xl font-bold mb-6">Questions</h2>
            <div className="space-y-3">
              {model.faqs.map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-white/10 bg-white/5 open:border-primary-500/30"
                >
                  <summary className="cursor-pointer px-4 py-3 font-semibold">{item.q}</summary>
                  <p className="px-4 pb-4 text-gray-300 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {model.related.length > 0 ? (
          <nav aria-label="Related pages" className="flex flex-wrap gap-3">
            {model.related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold px-4 py-2 rounded-full border border-white/10 text-gray-200 hover:border-primary-500/40 hover:text-primary-400"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
