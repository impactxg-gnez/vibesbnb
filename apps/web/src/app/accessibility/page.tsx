import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility | VibesBNB',
  description:
    'VibesBNB accessibility commitment: WCAG 2.2 Level AA, accessible lodging filters, and Adapted listings.',
};

export default function AccessibilityPage() {
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

        <article className="bg-gray-900 rounded-xl p-8 text-white border border-gray-800 space-y-8">
          <header>
            <h1 className="text-3xl font-bold mb-3">Accessibility</h1>
            <p className="text-muted text-lg">
              VibesBNB aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA for our
              website and mobile WebView experience, and to support travelers with disability-related
              lodging needs under DOJ Title III–aligned reservation practices.
            </p>
          </header>

          <section>
            <h2 className="text-xl font-semibold mb-3">Digital accessibility</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Keyboard access to search, filters, date pickers, booking controls, and map listing lists</li>
              <li>Screen reader–friendly labels, landmarks, and dialogs</li>
              <li>Color contrast targets of at least 4.5:1 for normal text and 3:1 for large text / UI chrome</li>
              <li>Descriptive alternative text for listing photos (host-provided or AI-assisted fallback)</li>
              <li>Captions and transcripts required for any future video or audio content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Accessible lodging features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>
                Search filters for features such as step-free guest entrance, lit path to entrance, roll-in
                shower, and wide doorways
              </li>
              <li>Host-authored accessibility descriptions on listings</li>
              <li>Inventory holds that lock the specific unit/nights when a booking is requested or confirmed</li>
              <li>
                Adapted verification program: hosts may submit proof photos of accessibility claims for review;
                verified listings can display an Adapted badge
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Feedback</h2>
            <p className="text-gray-300">
              If you encounter a barrier on VibesBNB, email{' '}
              <a className="text-primary-500 underline" href="mailto:info@vibesbnb.com">
                info@vibesbnb.com
              </a>{' '}
              with the page URL and a short description. We take these reports seriously and prioritize fixes.
            </p>
          </section>

          <p className="text-sm text-muted">
            This page describes our engineering and product targets. It is not a formal VPAT or legal advice.
          </p>
        </article>
      </div>
    </div>
  );
}
