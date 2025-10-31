import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1a1d2e] px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/register"
            className="text-[#4ade80] hover:text-[#22c55e] transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>

        <div className="bg-[#252838] rounded-xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, including your name, email
                address, phone number, and payment information when you create an account or
                make a booking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our services,
                process transactions, send you technical notices and support messages, and
                communicate with you about products, services, and events.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing</h2>
              <p>
                We do not share your personal information with third parties except as necessary
                to provide our services, comply with the law, or protect our rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
              <p>
                We take reasonable measures to help protect your personal information from loss,
                theft, misuse, unauthorized access, disclosure, alteration, and destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our service
                and hold certain information to improve and analyze our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal information at any
                time. You can do this by logging into your account or contacting us directly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Services</h2>
              <p>
                Our service may contain links to third-party websites or services. We are not
                responsible for the privacy practices of these third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
              <p>
                Our service is not directed to children under 18. We do not knowingly collect
                personal information from children under 18.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and maintained on servers located outside
                of your state, province, country, or other governmental jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at
                privacy@vibesbnb.com
              </p>
            </section>

            <div className="pt-8 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Last updated: October 31, 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

