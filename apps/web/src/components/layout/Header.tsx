'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getImpersonatedHostId, onImpersonationChanged } from '@/lib/adminHostImpersonation';
import { MessageCircle, Bed, Home, Building, Trees, Sparkles, Plane, Briefcase, Plus, X, Check } from 'lucide-react';

export function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const headerCategoryChip = pathname === '/search' ? searchParams.get('category') : null;
  const supabase = createClient();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<{ email: string; name: string; role: string }[]>([]);
  const [currentMode, setCurrentMode] = useState<'traveling' | 'hosting'>('traveling');
  const [mounted, setMounted] = useState(false);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [adminImpersonatingHostId, setAdminImpersonatingHostId] = useState<string | null>(null);

  // Set mounted after hydration to prevent SSR/client mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setAdminImpersonatingHostId(getImpersonatedHostId());
    sync();
    return onImpersonationChanged(sync);
  }, [mounted]);

  // Function to load saved accounts
  const loadAccounts = () => {
    const saved = localStorage.getItem('vibes_saved_accounts');
    if (saved) {
      try {
        setSavedAccounts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved accounts');
        setSavedAccounts([]);
      }
    }
  };

  // Track active account in saved accounts list
  useEffect(() => {
    if (user && user.email) {
      const saved = localStorage.getItem('vibes_saved_accounts');
      let accounts = saved ? JSON.parse(saved) : [];
      
      const existingIndex = accounts.findIndex((a: any) => a.email === user.email);
      const accountData = {
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: user.user_metadata?.role || 'traveller'
      };

      if (existingIndex !== -1) {
        accounts[existingIndex] = accountData;
      } else if (accounts.length < 5) {
        accounts.push(accountData);
      }
      
      localStorage.setItem('vibes_saved_accounts', JSON.stringify(accounts));
      setSavedAccounts(accounts);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const userRole = user?.user_metadata?.role || 'traveller';
  
  // Check both user_metadata and localStorage for roles
  const [storedRoles, setStoredRoles] = useState<string[]>([]);
  
  useEffect(() => {
    const rolesStr = localStorage.getItem('userRoles');
    if (rolesStr) {
      try {
        setStoredRoles(JSON.parse(rolesStr));
      } catch (e) {
        setStoredRoles([]);
      }
    }
  }, [user]);

  // User is a host if either user_metadata says so OR localStorage has 'host' role
  const hasHostRole = userRole === 'host' || storedRoles.includes('host');
  const isAdmin = userRole === 'admin' || storedRoles.includes('admin');
  const adminSupportingHost =
    Boolean(user && isAdminUser(user) && adminImpersonatingHostId);
  const hasHostOrSupportAccess = hasHostRole || adminSupportingHost;
  
  // Determine current mode based on URL path
  const isOnHostPage = pathname?.startsWith('/host');
  const isOnAdminPage = pathname?.startsWith('/admin');
  
  // Update current mode based on pathname
  useEffect(() => {
    if (isOnHostPage) {
      setCurrentMode('hosting');
      localStorage.setItem('vibesbnb_mode', 'hosting');
    } else if (!isOnAdminPage) {
      setCurrentMode('traveling');
      localStorage.setItem('vibesbnb_mode', 'traveling');
    }
  }, [pathname, isOnHostPage, isOnAdminPage]);
  
  // Initialize mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('vibesbnb_mode') as 'traveling' | 'hosting' | null;
    if (savedMode && (savedMode === 'traveling' || savedMode === 'hosting')) {
      setCurrentMode(savedMode);
    }
  }, []);
  
  // For menu display purposes
  const isInHostingMode = currentMode === 'hosting';
  const isTraveller = !hasHostOrSupportAccess && !isAdmin;

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
    setCurrentMode('traveling');
    localStorage.setItem('vibesbnb_mode', 'traveling');
    router.push('/search');
    setShowUserMenu(false);
  };

  const switchToHost = () => {
    setCurrentMode('hosting');
    localStorage.setItem('vibesbnb_mode', 'hosting');
    router.push('/host/properties');
    setShowUserMenu(false);
  };

  const registerAsHost = () => {
    router.push('/host');
    setShowUserMenu(false);
  };

  const handleSavedAccountSwitch = async (account: { email: string; name: string; role: string }) => {
    if (account.email === user?.email) {
      setShowAccountSwitcher(false);
      return;
    }

    try {
      setSwitchingEmail(account.email);

      const saved = localStorage.getItem('vibes_saved_sessions');
      const savedSessions = saved ? JSON.parse(saved) : {};
      const accountSession = savedSessions[account.email];

      if (accountSession?.access_token && accountSession?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: accountSession.access_token,
          refresh_token: accountSession.refresh_token,
        });

        if (!error) {
          setShowAccountSwitcher(false);
          setShowUserMenu(false);

          if (account.role === 'admin') {
            router.push('/admin');
          } else if (account.role === 'host') {
            localStorage.setItem('vibesbnb_mode', 'hosting');
            router.push('/host/properties');
          } else {
            localStorage.setItem('vibesbnb_mode', 'traveling');
            router.push('/');
          }
          router.refresh();
          return;
        }
      }

      setShowAccountSwitcher(false);
      setShowUserMenu(false);
      router.push(`/login?email=${encodeURIComponent(account.email)}&switch=true`);
    } catch (error) {
      console.error('Failed to switch saved account', error);
      setShowAccountSwitcher(false);
      setShowUserMenu(false);
      router.push(`/login?email=${encodeURIComponent(account.email)}&switch=true`);
    } finally {
      setSwitchingEmail(null);
    }
  };

  return (
    <header className="bg-surface-dark/90 backdrop-blur-xl border-b border-primary-500/10 sticky top-0 z-50 shadow-[0_4px_30px_-10px_rgba(16,185,129,0.15)]">
      <div className="container mx-auto px-3 sm:px-6 max-w-full">
        <div className="flex items-center justify-between gap-2 h-16 sm:h-20 min-w-0">
          {/* Logo */}
          <Link href={isInHostingMode ? "/host/properties" : "/"} className="flex items-center space-x-1.5 sm:space-x-2 group shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0">
              <img src="/logo.png" alt="VibesBNB Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-base min-[380px]:text-lg sm:text-2xl font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors">VibesBNB</span>
          </Link>

          {/* Centered Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-2 py-1.5 shadow-inner">
              <Link
                href="/search?category=1-bed"
                className={`px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                  headerCategoryChip === '1-bed'
                    ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 group'
                }`}
              >
                <Bed
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    headerCategoryChip === '1-bed' ? 'text-black' : 'text-gray-500'
                  }`}
                />
                1 Bed
              </Link>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <Link
                href="/search?category=2-bed"
                className={`px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                  headerCategoryChip === '2-bed'
                    ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 group'
                }`}
              >
                <Bed
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    headerCategoryChip === '2-bed' ? 'text-black' : 'text-gray-500'
                  }`}
                />
                2 Bed
              </Link>
            </div>

            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-2 py-1.5 shadow-inner">
              <Link
                href="/search?category=studios"
                className={`px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                  headerCategoryChip === 'studios'
                    ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 group'
                }`}
              >
                <Building
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    headerCategoryChip === 'studios' ? 'text-black' : 'text-gray-500'
                  }`}
                />
                Studios
              </Link>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <Link
                href="/search?category=condo"
                className={`px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                  headerCategoryChip === 'condo'
                    ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 group'
                }`}
              >
                <Home
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    headerCategoryChip === 'condo' ? 'text-black' : 'text-gray-500'
                  }`}
                />
                Condos
              </Link>
            </div>
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 md:space-x-6 shrink-0 min-w-0">
            <Link
              href="/favorites"
              className="text-gray-400 hover:text-primary-400 transition-colors duration-300 flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-semibold text-xs md:text-sm hidden sm:inline">Save</span>
            </Link>
            <Link
              href="/bookings"
              className="text-gray-400 hover:text-primary-400 transition-colors duration-300 text-xs md:text-sm font-semibold flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Calendar</span>
            </Link>
            {/* Mode switcher — mobile: compact pill; tablet+: full-width pill (same behavior) */}
            {user && mounted && (
              <>
                <div className="flex md:hidden items-center bg-white/5 border border-white/10 rounded-full p-0.5 h-8 w-[136px] shrink-0 relative">
                  <div
                    className={`absolute top-0.5 left-0.5 h-7 w-[62px] bg-primary-500 rounded-full transition-transform duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.35)] ${
                      isInHostingMode ? 'translate-x-[64px]' : 'translate-x-0'
                    }`}
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={switchToTraveler}
                    className={`flex-1 flex items-center justify-center gap-0.5 text-[9px] font-bold z-10 min-h-[28px] rounded-full transition-colors duration-300 ${
                      !isInHostingMode ? 'text-black' : 'text-gray-400 active:text-white'
                    }`}
                    aria-pressed={!isInHostingMode}
                    aria-label="Switch to traveling — browse and book"
                  >
                    <Plane size={12} className={!isInHostingMode ? 'text-black' : 'text-gray-500'} />
                    Travel
                  </button>
                  <button
                    type="button"
                    onClick={hasHostOrSupportAccess ? switchToHost : registerAsHost}
                    className={`flex-1 flex items-center justify-center gap-0.5 text-[9px] font-bold z-10 min-h-[28px] rounded-full transition-colors duration-300 ${
                      isInHostingMode ? 'text-black' : 'text-gray-400 active:text-white'
                    }`}
                    aria-pressed={isInHostingMode}
                    aria-label={
                      hasHostOrSupportAccess
                        ? 'Switch to hosting — listings and calendar'
                        : 'Become a host'
                    }
                  >
                    <Building size={12} className={isInHostingMode ? 'text-black' : 'text-gray-500'} />
                    Host
                  </button>
                </div>
                <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full p-1 h-10 w-44 relative group">
                  <div
                    className={`absolute h-[30px] w-[84px] bg-primary-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(16,185,129,0.4)] ${
                      isInHostingMode ? 'translate-x-[86px]' : 'translate-x-0'
                    }`}
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={switchToTraveler}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold z-10 transition-colors duration-300 ${
                      !isInHostingMode ? 'text-black' : 'text-gray-400 hover:text-gray-200'
                    }`}
                    aria-pressed={!isInHostingMode}
                    aria-label="Switch to traveling"
                  >
                    <Plane size={14} className={!isInHostingMode ? 'text-black' : 'text-gray-500'} />
                    Traveling
                  </button>
                  <button
                    type="button"
                    onClick={hasHostOrSupportAccess ? switchToHost : registerAsHost}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold z-10 transition-colors duration-300 ${
                      isInHostingMode ? 'text-black' : 'text-gray-400 hover:text-gray-200'
                    }`}
                    aria-pressed={isInHostingMode}
                    aria-label={hasHostOrSupportAccess ? 'Switch to hosting' : 'Become a host'}
                  >
                    <Building size={14} className={isInHostingMode ? 'text-black' : 'text-gray-500'} />
                    Hosting
                  </button>
                </div>
              </>
            )}
            {user && !mounted && (
              <>
                <div
                  className="flex md:hidden h-8 w-[136px] shrink-0 rounded-full bg-white/5 border border-white/10"
                  aria-hidden
                />
                <div
                  className="hidden md:flex h-10 w-44 rounded-full bg-white/5 border border-white/10"
                  aria-hidden
                />
              </>
            )}

            <Link
              href="/search"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary-400 transition-colors duration-300 group"
              aria-label="Search properties"
            >
              <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {!loading && (
              <>
                {user ? (
                  <>
                    {/* User Menu — max-md: fixed insets so panel stays on-screen; md+: anchored to button */}
                    <div className="relative z-[60]">
                      <button
                        type="button"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 bg-white/5 hover:bg-primary-500/10 border border-white/10 hover:border-primary-500/50 rounded-full p-1 pl-3 transition-all duration-300 group"
                        aria-expanded={showUserMenu}
                        aria-haspopup="menu"
                      >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <span className="text-black text-xs font-bold">
                            {user.email?.[0].toUpperCase()}
                          </span>
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      {showUserMenu && (
                        <div
                          role="menu"
                          className="w-full min-w-0 max-md:fixed max-md:left-3 max-md:right-3 max-md:top-[4.75rem] sm:max-md:top-24 max-md:mt-0 max-md:max-h-[min(70vh,28rem)] max-md:overflow-y-auto max-md:overscroll-contain max-md:shadow-2xl md:absolute md:top-full md:mt-2 md:right-0 md:left-auto md:max-h-none md:overflow-hidden md:w-56 bg-gray-950 border border-primary-500/20 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.4)] z-[100]"
                        >
                          <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Signed in as</p>
                            <p className="text-sm font-bold text-white truncate">{user.email}</p>
                          </div>

                          {/* Mobile: same mode switch (header can be crowded — clear choice in menu) */}
                          <div className="px-3 py-3 border-b border-white/5 md:hidden bg-black/30">
                            <p className="px-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">View as</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={switchToTraveler}
                                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-bold transition-colors ${
                                  !isInHostingMode
                                    ? 'bg-primary-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                <Plane size={14} />
                                Traveler
                              </button>
                              <button
                                type="button"
                                onClick={hasHostOrSupportAccess ? switchToHost : registerAsHost}
                                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-bold transition-colors ${
                                  isInHostingMode
                                    ? 'bg-primary-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                <Building size={14} />
                                Host
                              </button>
                            </div>
                          </div>
                          
                          <div className="py-2">
                            <Link
                              href="/profile"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              Profile
                            </Link>
                            <Link
                              href={isInHostingMode ? "/host/messages" : "/messages"}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <span>Messages</span>
                              {unreadMessages > 0 && <span className="bg-emerald-500 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-auto">{unreadMessages}</span>}
                            </Link>
                            {!isInHostingMode && (
                              <Link
                                href="/bookings"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                              >
                                My Bookings
                              </Link>
                            )}
                            {hasHostOrSupportAccess && isInHostingMode && (
                              <Link
                                href="/host/properties"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                              >
                                My Properties
                              </Link>
                            )}
                            {!isInHostingMode && (
                              <Link
                                href="/favorites"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                              >
                                Favorite Properties
                              </Link>
                            )}
                            {isAdmin && (
                              <Link
                                href="/admin"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors font-bold"
                                onClick={() => setShowUserMenu(false)}
                              >
                                Admin Panel
                              </Link>
                            )}
                          </div>

                          <div className="border-t border-white/5 pt-2 pb-2 bg-black/20">
                            <button
                              onClick={() => {
                                setShowAccountSwitcher(true);
                                setShowUserMenu(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm text-primary-400 hover:bg-primary-500/10 transition-colors"
                            >
                              <span>Switch Account</span>
                              <div className="bg-primary-500/20 text-primary-500 text-[10px] px-1.5 py-0.5 rounded border border-primary-500/30 font-bold">
                                {savedAccounts.length}/5
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                signOut();
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              Sign Out
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Account Switcher Sub-Menu */}
                      {showAccountSwitcher && (
                        <div
                          role="dialog"
                          aria-label="Switch account"
                          className="w-full min-w-0 max-md:max-w-none max-md:fixed max-md:left-3 max-md:right-3 max-md:top-[4.75rem] sm:max-md:top-24 max-md:mt-0 max-md:max-h-[min(75vh,32rem)] max-md:overflow-y-auto max-md:overscroll-contain max-md:shadow-2xl md:absolute md:top-full md:mt-2 md:right-0 md:left-auto md:max-h-none md:overflow-hidden md:w-80 md:max-w-[min(20rem,calc(100vw-1.5rem))] bg-gray-950 border border-primary-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] py-5 z-[100] transform transition-all animate-in fade-in slide-in-from-top-4 duration-300"
                        >
                          <div className="px-6 pb-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Switch Account</h3>
                            <button onClick={() => setShowAccountSwitcher(false)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-1 rounded-full">
                              <X size={16} />
                            </button>
                          </div>
                          
                          <div className="max-h-[350px] overflow-y-auto px-3 mt-4 space-y-2 custom-scrollbar">
                            {savedAccounts.map((account) => (
                              <div key={account.email} className="group relative">
                                <button
                                  onClick={() => handleSavedAccountSwitch(account)}
                                  disabled={switchingEmail === account.email}
                                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 border ${
                                    account.email === user?.email 
                                      ? 'bg-primary-500/10 border-primary-500/30' 
                                      : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                  }`}
                                >
                                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg transition-transform group-hover:scale-105 ${
                                    account.email === user?.email ? 'bg-primary-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-gray-800 text-gray-500'
                                  }`}>
                                    {account.email[0].toUpperCase()}
                                  </div>
                                  <div className="text-left overflow-hidden flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-white truncate">{account.name}</p>
                                      {account.email === user?.email && <span className="bg-primary-500 text-[8px] text-black font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Current</span>}
                                      {switchingEmail === account.email && <span className="bg-white/10 text-[8px] text-white font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Switching</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest mt-0.5 font-bold">{account.role} • {account.email}</p>
                                  </div>
                                  {account.email !== user?.email && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newAccounts = savedAccounts.filter(a => a.email !== account.email);
                                        localStorage.setItem('vibes_saved_accounts', JSON.stringify(newAccounts));
                                        setSavedAccounts(newAccounts);
                                      }}
                                      className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                      title="Remove account"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </button>
                              </div>
                            ))}
                            
                            {savedAccounts.length < 5 && (
                              <button
                                onClick={() => {
                                  setShowAccountSwitcher(false);
                                  router.push('/login');
                                }}
                                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/5 hover:bg-primary-500/5 group/add transition-all duration-300 border border-dashed border-white/20 hover:border-primary-500/40"
                              >
                                <div className="w-11 h-11 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center text-gray-500 group-hover/add:bg-primary-500 group-hover/add:text-black transition-all">
                                  <Plus size={24} />
                                </div>
                                <span className="text-sm font-bold text-gray-400 group-hover/add:text-primary-400">Add another account</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="px-6 pt-5 mt-4 border-t border-white/5">
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.1em] text-center">Device History Limit: 5 Accounts</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <Link
                      href="/login"
                      className="text-gray-300 hover:text-primary-400 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="bg-primary-500 text-black px-4 py-2 sm:px-6 rounded-full text-xs sm:text-sm font-bold hover:bg-primary-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 whitespace-nowrap"
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
