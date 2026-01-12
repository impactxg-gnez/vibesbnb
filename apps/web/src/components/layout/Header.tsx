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
              <span className="text-lg">△</span> Mountain
            </Link>
            <Link href="/search?category=Beach" className="text-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <span>🌊</span> Beach
            </Link>
            <Link href="/search?category=Forest" className="text-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <span>🌲</span> Forest
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-6">
            <button className="text-muted hover:text-white transition-colors">
              <span className="text-lg">△</span> 
            </button>
            <button className="text-muted hover:text-white transition-colors">
               <span className="font-medium text-sm">Save</span>
            </button>
             <button className="text-muted hover:text-white transition-colors text-sm font-medium">
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
