'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUnreadMessageCount } from '@/lib/chat/unreadMessageCount';
import { UnreadMessageBadge } from '@/components/chat/UnreadMessageBadge';

const navItems = [
  {
    id: 'home',
    label: 'Home',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    href: '/',
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    href: '/search',
  },
  {
    id: 'map',
    label: 'Map',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    href: '/map',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    href: '/messages',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    href: '/profile',
  },
];

function itemIsActive(pathname: string, item: (typeof navItems)[number]) {
  if (item.id === 'messages') {
    return pathname === '/messages' || pathname.startsWith('/messages/') || pathname.startsWith('/host/messages');
  }
  if (item.id === 'home') return pathname === '/';
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const unread = useUnreadMessageCount();
  const [hosting, setHosting] = useState(false);
  const messagesHref = hosting ? '/host/messages' : '/messages';

  useEffect(() => {
    setHosting(
      Boolean(pathname?.startsWith('/host')) ||
        localStorage.getItem('vibesbnb_mode') === 'hosting'
    );
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom,0px)] bg-[#193F25] border-t border-[#E8C99A]/25 backdrop-blur-xl dark:bg-surface-dark/80 dark:border-white/5">
      <div className="grid grid-cols-5 h-20">
        {navItems.map((item) => {
          const href = item.id === 'messages' ? messagesHref : item.href;
          const isActive = itemIsActive(pathname || '', item);
          return (
            <Link
              key={item.id}
              href={href}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive
                  ? 'text-[#E8C99A] dark:text-primary-500'
                  : 'text-[#FAF3EA]/80 hover:text-[#FAF3EA] dark:text-muted dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px inset-x-0 mx-auto w-12 h-1 bg-primary-500 rounded-full shadow-[0_0_20px_rgba(0,230,118,0.5)]"
                />
              )}
              <div
                className={`flex flex-col items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
              >
                <span className="relative">
                  <svg
                    className={`w-6 h-6 mb-1 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.id === 'messages' ? (
                    <UnreadMessageBadge count={unread} className="dark:ring-[#193F25]" />
                  ) : null}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
