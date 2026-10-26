'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PhoneReminderBanner } from '@/components/layout/PhoneReminderBanner';
import { Footer } from '@/components/layout/Footer';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { AppVersionStamp } from '@/components/layout/AppVersionStamp';
import { HostPendingBrowseModal } from '@/components/auth/HostPendingBrowseModal';

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const pathname = usePathname();
  const isMessages =
    pathname === '/messages' || pathname === '/host/messages';

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <HostPendingBrowseModal />
      <div className="border-b bg-gold/20 border-gold/40 text-espresso dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200">
        <div className="container mx-auto px-4 py-2 text-xs md:text-sm font-semibold text-center">
          This site is currently in beta — some features might not work.
        </div>
      </div>
      <Header />
      <PhoneReminderBanner />
      <main
        id="main-content"
        tabIndex={-1}
        className={
          isMessages
            ? 'flex-grow outline-none pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0 max-lg:h-[calc(100dvh-7.5rem)] max-lg:overflow-hidden max-lg:flex max-lg:flex-col'
            : 'flex-grow outline-none pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
        }
      >
        {children}
      </main>
      {!isMessages && <Footer />}
      <MobileTabBar />
      <AppVersionStamp />
    </div>
  );
}
