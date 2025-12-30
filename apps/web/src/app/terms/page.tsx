import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-charcoal-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-earth-500 hover:text-earth-400 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>

        <div className="bg-charcoal-900 rounded-xl p-8 text-white border border-charcoal-800">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          
          <div className="space-y-6 text-mist-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using VibesBNB, you accept and agree to be bound by the terms
                and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily access the materials on VibesBNB for
                personal, non-commercial transitory viewing only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and
                password and for restricting access to your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Booking Terms</h2>
              <p>
                All bookings are subject to availability and confirmation. Payment terms and
                cancellation policies apply as specified at the time of booking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Host Responsibilities</h2>
              <p>
                Hosts must provide accurate descriptions of their properties and maintain the
                quality standards expected by guests.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
              <p>
                VibesBNB shall not be liable for any damages arising out of the use or
                inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the
                service constitutes acceptance of modified terms.
              </p>
            </section>

            <div className="pt-8 border-t border-charcoal-800">
              <p className="text-sm text-mist-500">
                Last updated: October 31, 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
