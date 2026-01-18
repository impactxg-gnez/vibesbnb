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
    <header className="bg-surface-dark/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href={isHost ? "/host/properties" : "/"} className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-black font-extrabold text-2xl">V</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">VibesBNB</span>
          </Link>

          {/* Centered Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/search?category=Mountain" className="text-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Mountain
            </Link>
            <Link href="/search?category=Beach" className="text-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Beach
            </Link>
            <Link href="/search?category=Forest" className="text-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Forest
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-6">
            <button className="text-muted hover:text-white transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-medium text-sm">Save</span>
            </button>
             <button className="text-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-muted hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {!loading && (
              <>
                {user ? (
                  <>
                    {/* User Menu */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full p-1 pl-3 transition-all"
                      >
                        <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">
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
                                  className="block w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-gray-800 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                  Switch to Host
                                </button>
                              ) : (
                                <button
                                  onClick={registerAsHost}
                                  className="block w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-gray-800 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                  Register as a Host
                                </button>
                              )}
                            </>
                          )}
                          {/* Host can switch to traveller */}
                          {isHost && (
                            <button
                              onClick={switchToTraveler}
                              className="block w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-gray-800 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Switch to Traveler Mode
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
                  <div className="flex items-center space-x-4">
                    <Link 
                      href="/login" 
                      className="text-muted hover:text-white transition-colors text-sm font-medium"
                    >
                      Log In
                    </Link>
                    <Link 
                      href="/signup" 
                      className="bg-primary-500 text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-primary-400 transition-all shadow-[0_0_20px_rgba(0,230,118,0.2)]"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
