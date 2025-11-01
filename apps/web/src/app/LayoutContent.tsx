'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  // All pages are full-page (no header/footer) during coming soon phase
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}

