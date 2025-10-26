import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">About VibesBNB</h3>
            <p className="text-sm">
              The premier marketplace for wellness and 420-friendly travel.
              Find your perfect retreat.
            </p>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-bold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="hover:text-white">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/safety" className="hover:text-white">
                  Safety Information
                </Link>
              </li>
              <li>
                <Link href="/cancellation" className="hover:text-white">
                  Cancellation Options
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Hosting */}
          <div>
            <h3 className="text-white font-bold mb-4">Hosting</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/host/signup" className="hover:text-white">
                  Become a Host
                </Link>
              </li>
              <li>
                <Link href="/host/resources" className="hover:text-white">
                  Host Resources
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-white">
                  Community Forum
                </Link>
              </li>
              <li>
                <Link href="/host/insurance" className="hover:text-white">
                  Host Insurance
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/compliance" className="hover:text-white">
                  Compliance
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-white">
                  Legal Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
          <p>
            &copy; {new Date().getFullYear()} VibesBNB. All rights reserved.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            This platform does not facilitate illegal activity. All users must
            comply with local, state, and federal laws.
          </p>
        </div>
      </div>
    </footer>
  );
}


