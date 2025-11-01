'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface LayoutContentProps {
  children: React.ReactNode;
}

// Routes that should not show header/footer
const FULL_PAGE_ROUTES = [
  '/welcome',
  '/login',
  '/register',
  '/select-role',
  '/forgot-password',
];

export function LayoutContent({ children }: LayoutContentProps) {
  const pathname = usePathname();
  
  const isFullPageRoute = FULL_PAGE_ROUTES.some(route => pathname.startsWith(route));

  if (isFullPageRoute) {
    return (
      <AuthGuard>
        {children}
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </AuthGuard>
  );
}

