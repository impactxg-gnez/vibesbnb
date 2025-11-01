'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

// ONLY these routes are accessible - everything else is blocked
const ALLOWED_ROUTES = [
  '/coming-soon',
  '/early-access',
  '/thank-you',
];

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if current route is allowed
    const isAllowedRoute = ALLOWED_ROUTES.some(route => pathname.startsWith(route));

    // Redirect root to coming-soon
    if (pathname === '/') {
      router.push('/coming-soon');
      return;
    }

    // Block all other routes
    if (!isAllowedRoute) {
      router.push('/coming-soon');
    }
  }, [pathname, router, mounted]);

  // Show loading state during redirect
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if current route is allowed
  const isAllowedRoute = ALLOWED_ROUTES.some(route => pathname.startsWith(route));
  
  // Redirect root to coming-soon
  if (pathname === '/') {
    return null; // Will redirect in useEffect
  }

  // Block all other routes
  if (!isAllowedRoute) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

