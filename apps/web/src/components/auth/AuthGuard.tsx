'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/welcome',
  '/login',
  '/register',
  '/select-role',
  '/forgot-password',
  '/terms',
  '/privacy',
];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

    // If not logged in and trying to access protected route, redirect to welcome
    if (!user && !isPublicRoute) {
      router.push('/welcome');
    }

    // If logged in and trying to access welcome page, redirect to home
    if (user && pathname === '/welcome') {
      router.push('/');
    }
  }, [user, isLoading, pathname, router, mounted]);

  // Show loading state while checking authentication
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // For public routes, always show content
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, only show if authenticated
  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

