'use client';

import Link from 'next/link';
import { Instagram } from 'lucide-react';
import { COMPANY_LINKS } from '@/lib/companyLinks';
import { InstagramFooterStrip } from '@/components/social/InstagramFooterStrip';
import { INSTAGRAM_PROFILE } from '@/lib/instagram';

export function Footer() {
  return (
    <footer className="bg-surface-dark border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl">
        {/* Instagram Feed Strip */}
        <InstagramFooterStrip />

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="text-white font-bold text-lg group-hover:text-primary-400 transition-colors">
                VibesBNB
              </span>
            </Link>
            <p className="text-muted text-sm mt-3 max-w-sm">
              Miami vacation rentals with listing-level cannabis and wellness policies.
            </p>
            <div className="mt-4">
              <a
                href={INSTAGRAM_PROFILE.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-pink-400 transition-colors group"
                aria-label="VibesBNB on Instagram"
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-pink-500/40 group-hover:bg-pink-500/10 transition-colors">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <span>@{INSTAGRAM_PROFILE.handle}</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <nav aria-label="Explore stays" className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Explore</p>
              <Link href="/miami" className="text-sm font-semibold text-gray-300 hover:text-primary-400 transition-colors">
                Miami vacation rentals
              </Link>
              <Link href="/miami/420-friendly" className="text-sm font-semibold text-gray-300 hover:text-primary-400 transition-colors">
                Cannabis-friendly Miami stays
              </Link>
              <Link href="/search" className="text-sm font-semibold text-gray-300 hover:text-primary-400 transition-colors">
                Search listings
              </Link>
            </nav>
            <nav aria-label="Company" className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
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
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} AllBlack Everything LLC. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href={INSTAGRAM_PROFILE.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-400 transition-colors flex items-center gap-1.5"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>Instagram</span>
            </a>
            <span>•</span>
            <a href="mailto:info@vibesbnb.com" className="hover:text-primary-400 transition-colors">
              info@vibesbnb.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
