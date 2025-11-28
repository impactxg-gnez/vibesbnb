'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

export function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const userRole = user?.user_metadata?.role || 'traveller';
  const isHost = userRole === 'host';
  const isAdmin = userRole === 'admin';
  const isTraveller = userRole === 'traveller' || (!isHost && !isAdmin);
  
  // Check if user has host role available (from localStorage and user metadata)
  useEffect(() => {
    if (user) {
      // First, check user metadata for role (most reliable source)
      const metadataRole = user.user_metadata?.role;
      
      // Then check localStorage
      const rolesStr = localStorage.getItem('userRoles');
      let roles: string[] = [];
      
      if (rolesStr) {
        try {
          roles = JSON.parse(rolesStr) as string[];
        } catch (e) {
          // If parsing fails, start fresh
          roles = [];
        }
      }
      
      // If user metadata has a role, ensure it's in the roles array
      if (metadataRole && !roles.includes(metadataRole)) {
        roles.push(metadataRole);
        localStorage.setItem('userRoles', JSON.stringify(roles));
      }
      
      // If no roles in localStorage but user has role in metadata, use metadata
      if (roles.length === 0 && metadataRole) {
        roles = [metadataRole];
        localStorage.setItem('userRoles', JSON.stringify(roles));
      }
      
      setUserRoles(roles);
    } else {
      // Clear roles when user logs out
      setUserRoles([]);
    }
  }, [user]);
  
  const hasHostRole = userRoles.includes('host') || isHost;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const fetchUnreadMessages = async () => {
      try {
        const response = await fetch('/api/chat/unread-count');
        if (!response.ok) return;
        const data = await response.json();
        setUnreadMessages(data.count || 0);
      } catch (error) {
        console.error('Failed to load unread message count', error);
      }
    };

    if (user) {
      fetchUnreadMessages();
      interval = setInterval(fetchUnreadMessages, 20000);
    } else {
      setUnreadMessages(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const switchToTraveler = () => {
    router.push('/search');
    setShowUserMenu(false);
  };

  const switchToHost = () => {
    router.push('/host/properties');
    setShowUserMenu(false);
  };

  const registerAsHost = () => {
    router.push('/host');
    setShowUserMenu(false);
  };

  return (
    <header className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isHost ? "/host/properties" : "/"} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-xl font-semibold text-white">VibesBNB</span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    {/* Messages Shortcut */}
                    <Link
                      href="/messages"
                      className="relative p-2 text-gray-400 hover:text-white transition rounded-full border border-transparent hover:border-emerald-500"
                      title="Messages"
                    >
                      <MessageCircle size={22} />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </Link>

                    {/* Notifications */}
                    <button className="p-2 text-gray-400 hover:text-white transition">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159 c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </button>

                    {/* User Menu */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition"
                      >
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {user.email?.[0].toUpperCase()}
                          </span>
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg py-2">
                          <div className="px-4 py-2 border-b border-gray-800">
                            <p className="text-sm font-medium text-white truncate">{user.email}</p>
                          </div>
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                            onClick={() => setShowUserMenu(false)}
                          >
                            Profile
                          </Link>
                          <Link
                            href="/messages"
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                            onClick={() => setShowUserMenu(false)}
                          >
                            Messages
                          </Link>
                          {/* My Bookings - always visible for travellers */}
                          {isTraveller && (
                            <Link
                              href="/bookings"
                              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                              onClick={() => setShowUserMenu(false)}
                            >
                              My Bookings
                            </Link>
                          )}
                          {/* My Properties - only for hosts */}
                          {isHost && (
                            <Link
                              href="/host/properties"
                              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                              onClick={() => setShowUserMenu(false)}
                            >
                              My Properties
                            </Link>
                          )}
                          {/* Favorite Properties - only for travellers */}
                          {isTraveller && (
                            <Link
                              href="/favorites"
                              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                              onClick={() => setShowUserMenu(false)}
                            >
                              Favorite Properties
                            </Link>
                          )}
                          {/* Admin Panel - only for admins */}
                          {isAdmin && (
                            <Link
                              href="/admin"
                              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                              onClick={() => setShowUserMenu(false)}
                            >
                              Admin Panel
                            </Link>
                          )}
                          <div className="border-t border-gray-800 my-1"></div>
                          {/* Role switching - only show for travellers */}
                          {isTraveller && (
                            <>
                              {hasHostRole ? (
                                <button
                                  onClick={switchToHost}
                                  className="block w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-gray-800"
                                >
                                  🏠 Switch to Host
                                </button>
                              ) : (
                                <button
                                  onClick={registerAsHost}
                                  className="block w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-gray-800"
                                >
                                  🏠 Register as a Host
                                </button>
                              )}
                            </>
                          )}
                          {/* Host can switch to traveller */}
                          {isHost && (
                            <button
                              onClick={switchToTraveler}
                              className="block w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-gray-800"
                            >
                              🌍 Switch to Traveler Mode
                            </button>
                          )}
                          <div className="border-t border-gray-800 my-1"></div>
                          <button
                            onClick={() => {
                              signOut();
                              setShowUserMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                          >
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      className="text-gray-300 hover:text-white transition"
                    >
                      Log In
                    </Link>
                    <Link 
                      href="/signup" 
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
