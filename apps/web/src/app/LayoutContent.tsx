'use client';

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  // All pages are full-page (no header/footer) during signup phase
  return <>{children}</>;
}

