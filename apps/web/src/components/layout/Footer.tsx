'use client';

import Link from 'next/link';
import { COMPANY_LINKS } from '@/lib/companyLinks';

export function Footer() {
  return (
    <footer className="bg-surface-dark border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="text-white font-bold text-lg group-hover:text-primary-400 transition-colors">
                VibesBNB
              </span>
            </Link>
            <p className="text-muted text-sm mt-3 max-w-sm">
              Cannabis-friendly, wellness-focused vacation rentals.
            </p>
          </div>

          <nav aria-label="Company" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {COMPANY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-gray-300 hover:text-primary-400 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} AllBlack Everything LLC. All rights reserved.</p>
          <a href="mailto:info@vibesbnb.com" className="hover:text-primary-400 transition-colors">
            info@vibesbnb.com
          </a>
        </div>
      </div>
    </footer>
  );
}
