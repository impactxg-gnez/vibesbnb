'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Home,
  Calendar,
  Star,
  FileText,
  MessageSquare,
  Settings,
  Search,
  Lock,
  ChevronDown,
  ChevronRight,
  LogOut,
  Globe,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Manage Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Manage listings', href: '/admin/listings', icon: <Home className="w-5 h-5" /> },
    { label: 'Manage Reservations', href: '/admin/reservations', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Reviews Management', href: '/admin/reviews', icon: <Star className="w-5 h-5" /> },
    {
      label: 'Admin Reviews',
      icon: <Star className="w-5 h-5" />,
      children: [
        { label: 'All Reviews', href: '/admin/reviews/all', icon: <Star className="w-4 h-4" /> },
        { label: 'Pending Reviews', href: '/admin/reviews/pending', icon: <Star className="w-4 h-4" /> },
      ],
    },
    { label: 'Manage Service Fee', href: '/admin/service-fee', icon: <Settings className="w-5 h-5" /> },
    { label: 'Document Verification', href: '/admin/verification', icon: <FileText className="w-5 h-5" /> },
    { label: 'Messages', href: '/admin/messages', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Report Management', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
    { label: 'Manage Payout', href: '/admin/payouts', icon: <Settings className="w-5 h-5" /> },
    { label: 'Search Settings', href: '/admin/search-settings', icon: <Search className="w-5 h-5" /> },
    { label: 'Change Password', href: '/admin/change-password', icon: <Lock className="w-5 h-5" /> },
  ];

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#5B21B6] text-white flex flex-col fixed h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-purple-700">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold text-xl">V</span>
            </div>
            <div>
              <div className="text-lg font-bold">Vibesbnb</div>
              <div className="text-xs text-purple-200">Catch a vibe</div>
            </div>
          </Link>
        </div>

        {/* Welcome Section */}
        <div className="p-4 border-b border-purple-700">
          <div className="text-sm text-purple-200">Welcome, Admin</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-700 transition ${
                      expandedItems.includes(item.label) ? 'bg-purple-700' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {expandedItems.includes(item.label) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {expandedItems.includes(item.label) && (
                    <div className="bg-purple-800">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href || '#'}
                          className={`flex items-center space-x-3 px-4 py-2 pl-12 text-sm hover:bg-purple-700 transition ${
                            isActive(child.href) ? 'bg-purple-700' : ''
                          }`}
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href || '#'}
                  className={`flex items-center space-x-3 px-4 py-3 hover:bg-purple-700 transition ${
                    isActive(item.href) ? 'bg-purple-700 border-r-2 border-white' : ''
                  }`}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900 flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span className="text-sm">Go To Main Site</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <select className="text-sm border border-gray-300 rounded px-3 py-1 text-gray-700">
                <option>English</option>
              </select>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <p className="text-sm text-gray-500 text-center">
            Copyright © Vibesbnb. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

