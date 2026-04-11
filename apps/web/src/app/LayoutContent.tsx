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
      <Header />
      <main className="flex-grow pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}

