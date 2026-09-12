import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | VibesBNB',
  description:
    'Frequently asked questions about VibesBNB bookings, cannabis and wellness policies, payments, cancellations, house rules, and hosting.',
};

type FaqItem = {
  q: string;
  a: string;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: '1. About VibesBNB',
    items: [
      {
        q: 'What is VibesBNB?',
        a: 'VibesBNB is a vacation rental marketplace built for travelers who want a cannabis-friendly, wellness-focused stay. We connect guests with hand-picked apartments, condos, and homes — primarily in Miami — where cannabis consumption and wellness-oriented living are welcomed, not hidden.',
      },
      {
        q: 'How is VibesBNB different from other short-term rental sites?',
        a: 'Most major platforms are cannabis-neutral at best and cannabis-hostile at worst — vague policies, host anxiety, and guests hiding what they\'re doing. VibesBNB flips that: every listing states its cannabis and wellness policy up front, so there\'s no guessing and no awkward conversations at check-in.',
      },
      {
        q: 'Where does VibesBNB operate?',
        a: 'We\'re based in Miami, FL, with our current portfolio concentrated in Downtown Miami, Brickell, and Wynwood. We\'re actively expanding through partnerships with property management companies and individual hosts, with a goal of scaling well beyond our current footprint.',
      },
      {
        q: 'Who runs VibesBNB?',
        a: 'VibesBNB is operated by AllBlack Everything LLC, based in Miami, Florida.',
      },
    ],
  },
  {
    title: '2. Booking a Stay',
    items: [
      {
        q: 'How do I book a property?',
        a: 'Browse listings on vibesbnb.com, pick your dates and guest count, and book directly through the site. You\'ll get instant confirmation details and check-in instructions by email.',
      },
      {
        q: 'Do I need to create an account to book?',
        a: 'Yes — an account lets us verify your identity, send you check-in instructions, and keep a record of your reservation for support purposes.',
      },
      {
        q: 'Is there a minimum age to book?',
        a: 'Yes. You must be at least 21 years old to book or stay at a VibesBNB property, consistent with our cannabis-friendly policy.',
      },
      {
        q: 'Can I book for someone else?',
        a: 'The person who books must also be a registered guest staying at the property and present for check-in verification. We don\'t support "gift bookings" for stays you won\'t personally attend.',
      },
      {
        q: 'How far in advance can I book?',
        a: 'This varies by listing — some open availability months out, others closer to the stay date. Check the specific property\'s calendar for exact availability.',
      },
      {
        q: 'Can I request early check-in or late check-out?',
        a: 'Yes, message the host/property directly through your reservation. It\'s granted based on turnover schedules and isn\'t guaranteed, but many of our hosts try to accommodate when possible.',
      },
    ],
  },
  {
    title: '3. Cannabis Policy',
    items: [
      {
        q: 'Can I smoke or consume cannabis inside the unit?',
        a: 'It depends on the listing. Every property\'s page clearly states its cannabis policy — some allow indoor vaping/edibles only, others provide designated outdoor smoking areas (balconies, patios), and some restrict combustible smoking entirely due to building rules. Always check the specific listing before booking if this matters to you.',
      },
      {
        q: 'Does VibesBNB sell cannabis products?',
        a: 'No. VibesBNB is strictly a lodging marketplace. We do not sell, distribute, or supply cannabis or any cannabis products. Guests are responsible for legally obtaining any products themselves in accordance with local and state law.',
      },
      {
        q: 'Is cannabis legal at your Miami properties?',
        a: 'Florida permits medical cannabis for qualified patients; recreational cannabis laws vary and are subject to change. Guests are solely responsible for understanding and complying with all applicable federal, state, and local laws regarding possession and consumption. Listing on VibesBNB does not constitute legal advice or a guarantee of legality.',
      },
      {
        q: 'What does "wellness-focused" mean if it\'s not just about cannabis?',
        a: 'Many of our properties emphasize relaxation and self-care more broadly — think blackout curtains for better sleep, proximity to spas and outdoor spaces, in-unit amenities that support unwinding, and a general low-stress, judgment-free approach to hosting.',
      },
      {
        q: 'What if I violate a property\'s cannabis policy?',
        a: 'Violating a listing\'s stated smoking/consumption rules can result in cleaning fees, loss of your security deposit, immediate removal from the property without refund, and a ban from future bookings — the same as violating any other house rule.',
      },
    ],
  },
  {
    title: '4. Payments & Pricing',
    items: [
      {
        q: 'What\'s included in the nightly rate?',
        a: 'The nightly rate covers the unit itself. Cleaning fees, taxes, and any resort/amenity fees charged by the building are listed separately at checkout before you confirm your booking.',
      },
      {
        q: 'Are there hidden fees?',
        a: 'No. All fees (cleaning, taxes, service fees) are itemized before you complete payment.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'Major credit and debit cards are accepted through our secure checkout. We do not accept cash or cryptocurrency for bookings at this time.',
      },
      {
        q: 'Do you charge a security deposit?',
        a: 'Some listings require a refundable security deposit or damage hold, which is stated on the listing page and released after checkout assuming no damage or policy violations.',
      },
      {
        q: 'When am I charged?',
        a: 'Typically your card is charged at the time of booking, though some longer stays may use a split-payment schedule. Details appear at checkout.',
      },
    ],
  },
  {
    title: '5. Cancellations & Refunds',
    items: [
      {
        q: 'What is your cancellation policy?',
        a: 'Cancellation policies are set per listing (commonly Flexible, Moderate, or Strict) and are shown on the property page before you book. Review this carefully — it governs your refund eligibility.',
      },
      {
        q: 'Under a Flexible policy, how much will I get back?',
        a: 'Typically: full refund if you cancel a set number of days before check-in (commonly 7 days), a partial refund (often 50%) if you cancel closer to check-in (commonly within 3 days), and no refund within the final cancellation window.',
      },
      {
        q: 'Can I modify my dates instead of cancelling?',
        a: 'Message us or the host as soon as possible — date changes are handled case-by-case based on availability and are not guaranteed.',
      },
      {
        q: 'What if the host cancels on me?',
        a: 'You\'ll receive a full refund, and our support team will help you find comparable alternative accommodations where possible.',
      },
      {
        q: 'What if I have an emergency and need to cancel outside the policy window?',
        a: 'Reach out to our support team with documentation. We evaluate extenuating circumstances on a case-by-case basis.',
      },
    ],
  },
  {
    title: '6. Check-In, Check-Out & House Rules',
    items: [
      {
        q: 'How does check-in work?',
        a: 'Most properties use self-check-in via smart lock or lockbox — you\'ll receive detailed instructions by email/text before your arrival window opens.',
      },
      {
        q: 'What are standard check-in/check-out times?',
        a: 'Most listings follow check-in after 3:00 PM and check-out before 11:00 AM, though this can vary by property — always confirm on your specific listing.',
      },
      {
        q: 'Are pets allowed?',
        a: 'This varies by listing. Check the individual property page — many of our buildings have no-pets policies from the building itself, separate from VibesBNB\'s own rules.',
      },
      {
        q: 'Can I host a party or event?',
        a: 'No. Parties and events are prohibited across VibesBNB listings to protect our relationships with buildings, neighbors, and hosts.',
      },
      {
        q: 'What\'s the maximum number of guests?',
        a: 'Each listing specifies its own guest cap based on sleeping arrangements (beds/sofa beds). Exceeding the stated limit can result in additional charges or cancellation without refund.',
      },
      {
        q: 'Is smoking (tobacco) allowed?',
        a: 'Standard tobacco smoking indoors is prohibited at most properties, separate from the cannabis policy specific to each listing. Check individual listing rules.',
      },
    ],
  },
  {
    title: '7. Safety & Trust',
    items: [
      {
        q: 'Are properties verified?',
        a: 'Yes. VibesBNB reviews listings before they go live, and our team works directly with hosts and property managers to confirm details like amenities, photos, and policies are accurate.',
      },
      {
        q: 'What safety features are in the units?',
        a: 'Standard safety measures include smoke and carbon monoxide detectors, clearly marked emergency exits, and first-aid kits on-site. Many of our buildings also offer 24/7 security.',
      },
      {
        q: 'Is my personal information secure?',
        a: 'Yes. Payment processing and personal data are handled through secure, encrypted systems, and we do not sell guest data to third parties.',
      },
      {
        q: 'What if something goes wrong during my stay?',
        a: 'Contact our support team immediately — we\'re available to help resolve issues in real time, from maintenance problems to access issues.',
      },
      {
        q: 'Do you verify guest identities?',
        a: 'Yes, as part of our booking and check-in process, to protect hosts, buildings, and fellow guests.',
      },
    ],
  },
  {
    title: '8. For Property Owners & Hosts',
    items: [
      {
        q: 'How do I list my property on VibesBNB?',
        a: 'Reach out through our "List Your Property" page or contact our team directly. Listing is free — we don\'t charge hosts upfront fees to join the platform.',
      },
      {
        q: 'Do I need to allow cannabis use to list my property?',
        a: 'No — you set your own policy. Some hosts allow full indoor use, others restrict to designated outdoor areas or vaping/edibles only, and some choose not to allow it at all while still benefiting from our wellness-focused audience.',
      },
      {
        q: 'What do you charge hosts?',
        a: 'We operate on a commission/service-fee model taken from completed bookings rather than upfront listing costs. Reach out to our team for current rate details.',
      },
      {
        q: 'Can property management companies list multiple units at once?',
        a: 'Yes — we actively partner with property management companies to onboard portfolios of units, not just individual hosts, with bulk onboarding support.',
      },
      {
        q: 'How do payouts work for hosts?',
        a: 'Payouts are processed after guest check-in/checkout confirmation, following the schedule outlined in your host agreement.',
      },
      {
        q: 'What support do hosts get?',
        a: 'Our team assists with listing optimization, photography guidance, guest communication support, and general onboarding to make sure your property is positioned well.',
      },
    ],
  },
  {
    title: '9. Traveler Experience',
    items: [
      {
        q: 'What kind of properties does VibesBNB offer?',
        a: 'Primarily upscale apartments and condos in well-located buildings — think Downtown Miami high-rises with pools, gyms, coworking spaces, and skyline views — alongside a growing variety of styles and locations.',
      },
      {
        q: 'Is VibesBNB good for couples, groups, or solo travelers?',
        a: 'All of the above. Our listings range from cozy studios for two to multi-bed units suited for small groups.',
      },
      {
        q: 'Do you offer any travel partnerships or perks?',
        a: 'We partner with travel agencies and affiliates on select promotions — check our site or social channels for current offers.',
      },
      {
        q: 'Can international travelers book?',
        a: 'Yes, though guests should independently confirm their home country\'s and destination\'s laws around cannabis before booking a cannabis-friendly listing, as legality varies significantly by jurisdiction.',
      },
    ],
  },
  {
    title: '10. Contact & Support',
    items: [
      {
        q: 'How do I contact VibesBNB support?',
        a: 'Reach out through the contact/support option on vibesbnb.com, or email info@vibesbnb.com. Our team typically responds within one business day.',
      },
      {
        q: 'I\'m a host and have an urgent issue with a guest — who do I call?',
        a: 'Contact our support line directly; urgent host issues are prioritized. You can also email info@vibesbnb.com.',
      },
      {
        q: 'Where is VibesBNB legally based?',
        a: 'VibesBNB is operated by AllBlack Everything LLC, headquartered in Miami, Florida.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-emerald-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>

        <article className="bg-gray-900 rounded-xl p-6 sm:p-8 text-white border border-gray-800 space-y-10">
          <header>
            <p className="text-primary-500 text-xs font-bold uppercase tracking-widest mb-3">
              Cannabis-friendly, wellness-focused vacation rentals
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Frequently Asked Questions</h1>
            <p className="text-muted text-lg">
              Answers about booking, cannabis and wellness policies, payments, cancellations, house rules,
              and hosting on VibesBNB.
            </p>
          </header>

          <nav aria-label="FAQ sections" className="flex flex-wrap gap-2">
            {FAQ_SECTIONS.map((section) => {
              const id = section.title.replace(/[^\w]+/g, '-').toLowerCase();
              return (
                <a
                  key={section.title}
                  href={`#${id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:border-primary-500/40 hover:text-primary-400 transition-colors"
                >
                  {section.title.replace(/^\d+\.\s*/, '')}
                </a>
              );
            })}
          </nav>

          {FAQ_SECTIONS.map((section) => {
            const id = section.title.replace(/[^\w]+/g, '-').toLowerCase();
            return (
              <section key={section.title} id={id} className="scroll-mt-28">
                <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-white/10 bg-white/5 open:border-primary-500/30"
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-white flex items-start justify-between gap-3">
                        <span>{item.q}</span>
                        <span className="text-primary-500 shrink-0 group-open:rotate-45 transition-transform" aria-hidden>
                          +
                        </span>
                      </summary>
                      <p className="px-4 pb-4 text-gray-300 leading-relaxed">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}

          <p className="text-sm text-muted leading-relaxed border-t border-white/10 pt-6">
            This FAQ is a general guide. Specific policies (cannabis rules, pet policies, cancellation terms,
            fees) vary by individual listing — always review the property page before booking. VibesBNB does
            not provide legal advice regarding cannabis laws; guests and hosts are responsible for
            understanding and complying with applicable laws in their jurisdiction.
          </p>
        </article>
      </div>
    </div>
  );
}
