'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plane, ShoppingCart, Wallet, Users, Settings, Star, 
  AlertCircle, Lock, FileText, LogOut, Home, Plus,
  Package, TrendingUp, Info, Wrench, MapPin, User
} from 'lucide-react';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

type UserRole = 'traveller' | 'host' | 'dispensary' | 'service_host';

interface ProfileMenuProps {
  user: {
    name: string;
    role: UserRole;
    avatar?: string;
  };
  onClose: () => void;
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  badge?: number;
}

export function ProfileMenu({ user, onClose }: ProfileMenuProps) {
  const router = useRouter();

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      traveller: 'Traveller',
      host: 'Host',
      dispensary: 'Dispensary',
      service_host: 'Service Host',
    };
    return labels[role];
  };

  const getGeneralMenuItems = (): MenuItem[] => {
    switch (user.role) {
      case 'traveller':
        return [
          { icon: Plane, label: 'My Trips', href: '/trips' },
          { icon: ShoppingCart, label: 'My Cart', href: '/cart', badge: 5 },
          { icon: Wallet, label: 'My Wallet', href: '/wallet' },
          { icon: Users, label: 'Invite Buddies', href: '/invite' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      
      case 'host':
        return [
          { icon: Package, label: 'Bookings', href: '/host/bookings', badge: 5 },
          { icon: Plus, label: 'Add a Listing', href: '/host/listings/new' },
          { icon: Home, label: 'Listings', href: '/host/listings', badge: 50 },
          { icon: Plane, label: 'My Trips', href: '/trips' },
          { icon: ShoppingCart, label: 'My Cart', href: '/cart' },
          { icon: TrendingUp, label: 'Grow Your Pot', href: '/host/analytics', badge: 21 },
          { icon: Wallet, label: 'My Wallet', href: '/wallet' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      
      case 'dispensary':
        return [
          { icon: ShoppingCart, label: 'Orders', href: '/dispensary/orders', badge: 10 },
          { icon: Package, label: 'Products', href: '/dispensary/products', badge: 45 },
          { icon: TrendingUp, label: 'Marketing Tools', href: '/dispensary/marketing' },
          { icon: Info, label: 'Business Info', href: '/dispensary/info' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      
      case 'service_host':
        return [
          { icon: Package, label: 'Bookings', href: '/service/bookings', badge: 5 },
          { icon: Wrench, label: 'Services', href: '/service/services', badge: 15 },
          { icon: MapPin, label: 'My Trips', href: '/trips' },
          { icon: ShoppingCart, label: 'My Cart', href: '/cart' },
          { icon: Users, label: 'Invite Buddies', href: '/invite' },
          { icon: User, label: 'Personal Info', href: '/profile/personal' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      
      default:
        return [];
    }
  };

  const feedbackItems: MenuItem[] = [
    { icon: Star, label: 'App Feedback', href: '/feedback' },
    { icon: AlertCircle, label: 'Report a Bug', href: '/report-bug' },
  ];

  const legalItems: MenuItem[] = [
    { icon: Lock, label: 'Privacy Policy', href: '/privacy' },
    { icon: FileText, label: 'Terms & Conditions', href: '/terms' },
  ];

  const handleLogout = () => {
    // TODO: Implement logout
    localStorage.clear();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-sm bg-[#3a4558] h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#3a4558] z-10 border-b border-gray-700/50">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* User Info */}
              <div>
                <h2 className="text-white font-semibold text-lg">{user.name}</h2>
                <p className="text-gray-400 text-sm">{getRoleLabel(user.role)}</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Role Switcher */}
          <div className="px-6 pb-4">
            <RoleSwitcher />
          </div>
        </div>

        {/* Menu Sections */}
        <div className="p-6 space-y-6">
          {/* GENERAL */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              GENERAL
            </h3>
            <nav className="space-y-1">
              {getGeneralMenuItems().map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 text-white hover:bg-gray-700/30 rounded-lg px-3 py-3 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="text-gray-400 text-sm">({item.badge})</span>
                  )}
                </Link>
              ))}
            </nav>
          </section>

          {/* FEEDBACK */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              FEEDBACK
            </h3>
            <nav className="space-y-1">
              {feedbackItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 text-white hover:bg-gray-700/30 rounded-lg px-3 py-3 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              ))}
            </nav>
          </section>

          {/* LEGAL */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              LEGAL
            </h3>
            <nav className="space-y-1">
              {legalItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 text-white hover:bg-gray-700/30 rounded-lg px-3 py-3 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              ))}
              
              {/* Log Out */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 text-white hover:bg-gray-700/30 rounded-lg px-3 py-3 transition-colors group"
              >
                <LogOut className="w-5 h-5 text-gray-300 group-hover:text-white" />
                <span className="flex-1 text-left">Log out</span>
              </button>
            </nav>
          </section>
        </div>

        {/* Bottom Indicator */}
        <div className="h-20"></div>
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="w-32 h-1.5 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

