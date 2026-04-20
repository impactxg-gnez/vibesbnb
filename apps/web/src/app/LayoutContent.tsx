'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HostPendingBrowseModal } from '@/components/auth/HostPendingBrowseModal';

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <HostPendingBrowseModal />
      <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200">
        <div className="container mx-auto px-4 py-2 text-xs md:text-sm font-semibold text-center">
          This site is currently in beta — some features might not work.
        </div>
      </div>
      <Header />
      <main className="flex-grow pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}

