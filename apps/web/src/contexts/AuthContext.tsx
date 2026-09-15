'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  buildDemoAdminSession,
  isDemoAdminPersistedUser,
  rememberAdminAuthSession,
  getHeadersForAdminFetch,
} from '@/lib/supabase/adminSession';
import { useRouter } from 'next/navigation';
import { formatAuthErrorMessage } from '@/lib/auth/formatAuthErrorMessage';
import { safeInternalReturnPath } from '@/lib/auth/safeReturnPath';
import { isDemoAuthEmail, requiresEmailVerification } from '@/lib/auth/emailVerification';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { validateSignupEmail } from '@/lib/auth/validateSignupEmail';
import { getAuthRedirectOrigin } from '@/lib/supabase/authRedirect';
import {
  authUserPhoneClaimsChanged,
  hasVerifiedPhone,
  travellerNeedsPhoneVerification,
} from '@/lib/auth/hasVerifiedPhone';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
    options?: { returnTo?: string | null }
  ) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: string,
    phone?: string
  ) => Promise<{ error: any; data?: any }>;
  signOut: (options?: { preserveSavedAccounts?: boolean }) => Promise<void>;
  signInWithGoogle: (returnTo?: string | null) => Promise<void>;
}

// Demo accounts for testing
const DEMO_ACCOUNTS = {
  'demo@traveller.com': {
    password: 'password',
    role: 'traveller',
    name: 'Demo Traveller',
    email: 'demo@traveller.com',
  },
  'demo@host.com': {
    password: 'password',
    role: 'host',
    name: 'Demo Host',
    email: 'demo@host.com',
  },
  'demo@admin.com': {
    password: 'password',
    role: 'admin',
    name: 'Demo Admin',
    email: 'demo@admin.com',
  },
  // admin@vibesbnb.com is not a demo shortcut when Supabase is configured — use real
  // sign-in so the browser gets a JWT (required for Realtime postgres_changes).
  'esca@vibesbnb.com': {
    password: 'Esca123!',
    role: 'host',
    name: 'EscaManagement',
    email: 'esca@vibesbnb.com',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SAVED_SESSIONS_KEY = 'vibes_saved_sessions';

// Match createClient(): need real URL + anon key (both are inlined at build time for NEXT_PUBLIC_*).
const isSupabaseConfigured = () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return (
    !!url &&
    !!key &&
    url !== 'https://placeholder.supabase.co'
  );
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const useSupabase = isSupabaseConfigured();
  const signUpInFlightRef = useRef(false);
  /** Auto-promote legacy host_pending → host in JWT (no admin approval). */
  const hostPendingPromotedRef = useRef(false);
  const profileSyncedRef = useRef(false);
  const hydratingSessionRef = useRef(true);
  /** Bumped to cancel in-flight session recovery when the user signs in. */
  const sessionInitGenRef = useRef(0);
  const recoverInFlightRef = useRef<Promise<unknown> | null>(null);
  const ignoreSignedOutRef = useRef(false);

  const gateUnverifiedSession = async (sessionUser: User) => {
    if (!requiresEmailVerification(sessionUser)) return true;
    if (isAdminUser(sessionUser)) return true;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const allowed =
      path.startsWith('/verify-email') ||
      path.startsWith('/auth/') ||
      path.startsWith('/admin') ||
      path === '/signup' ||
      path === '/login' ||
      path === '/forgot-password' ||
      path.startsWith('/reset-password');
    if (allowed) return true;
    await supabase.auth.signOut({ scope: 'local' });
    router.push(
      `/verify-email?email=${encodeURIComponent(sessionUser.email ?? '')}&reason=unverified`
    );
    return false;
  };

  const syncProfileContact = async () => {
    if (profileSyncedRef.current || typeof window === 'undefined') return;
    profileSyncedRef.current = true;
    try {
      const headers = await getHeadersForAdminFetch();
      await fetch('/api/profile/sync', { method: 'POST', headers });
    } catch {
      profileSyncedRef.current = false;
    }
  };

  const persistSavedSession = (session: Session | null) => {
    rememberAdminAuthSession(session);
    if (!session?.user?.email || typeof window === 'undefined') return;
    if (requiresEmailVerification(session.user)) return;

    try {
      const saved = localStorage.getItem(SAVED_SESSIONS_KEY);
      const sessions = saved ? JSON.parse(saved) : {};

      sessions[session.user.email] = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      };

      localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('[AuthContext] Failed to persist saved session', error);
    }
  };

  useEffect(() => {
    if (useSupabase) {
      // Get initial session from Supabase with retry logic
      const isInvalidRefreshError = (message?: string) =>
        Boolean(message && /refresh token/i.test(message));

      const initializeSession = async () => {
        const initId = sessionInitGenRef.current;
        const run = (async () => {
          let retries = 0;
          const maxRetries = 3;
          let sawInvalidRefresh = false;

          while (retries < maxRetries) {
            if (initId !== sessionInitGenRef.current) return;
            try {
              const {
                data: { session },
                error,
              } = await supabase.auth.getSession();
              if (initId !== sessionInitGenRef.current) return;

              if (error && isInvalidRefreshError(error.message)) {
                console.log(
                  '[AuthContext] Session error (attempt',
                  retries + 1,
                  '):',
                  error.message
                );
                sawInvalidRefresh = true;
                break;
              }

              if (session && !error) {
                if (session.user && !(await gateUnverifiedSession(session.user))) {
                  if (initId !== sessionInitGenRef.current) return;
                  setSession(null);
                  setUser(null);
                  hydratingSessionRef.current = false;
                  setLoading(false);
                  return;
                }
                let resolvedUser = session.user;
                // JWTs can lag behind admin phone confirmation; fetch the live user
                // before showing the verify-phone banner.
                if (travellerNeedsPhoneVerification(resolvedUser)) {
                  const { data: fresh, error: freshError } = await supabase.auth.getUser();
                  if (!freshError && fresh.user) {
                    resolvedUser = fresh.user;
                  }
                }
                if (initId !== sessionInitGenRef.current) return;
                setSession(
                  resolvedUser && resolvedUser !== session.user
                    ? { ...session, user: resolvedUser }
                    : session
                );
                setUser(resolvedUser);
                persistSavedSession(session);

                // Sync roles from user metadata to localStorage
                if (session?.user?.user_metadata?.role) {
                  const role = session.user.user_metadata.role;
                  const rolesStr = localStorage.getItem('userRoles');
                  const roles = rolesStr ? JSON.parse(rolesStr) : [];
                  if (!roles.includes(role)) {
                    roles.push(role);
                    localStorage.setItem('userRoles', JSON.stringify(roles));
                  }
                }

                console.log('[AuthContext] Session initialized:', session.user?.id);
                void syncProfileContact();
                hydratingSessionRef.current = false;
                setLoading(false);
                return;
              }

              if (error) {
                console.log(
                  '[AuthContext] Session error (attempt',
                  retries + 1,
                  '):',
                  error.message
                );
              }

              // Cookies in a brand-new tab can lag a tick; retry briefly.
              // Don't wait a full second when there is simply no session.
              if (retries < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, error ? 1000 : 250));
              }
              retries++;
            } catch (error: any) {
              console.error('[AuthContext] Error initializing session:', error);
              retries++;
              if (retries < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          }

          if (initId !== sessionInitGenRef.current) return;

          if (sawInvalidRefresh) {
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch {
              /* broken cookies are already unusable */
            }
            if (initId !== sessionInitGenRef.current) return;
          } else {
            // Cookies can land after getSession() missed them (full load of /admin).
            try {
              const { data: late } = await supabase.auth.getUser();
              if (initId !== sessionInitGenRef.current) return;
              if (late.user) {
                if (!(await gateUnverifiedSession(late.user))) {
                  if (initId !== sessionInitGenRef.current) return;
                  setSession(null);
                  setUser(null);
                  hydratingSessionRef.current = false;
                  setLoading(false);
                  return;
                }
                const { data: lateSession } = await supabase.auth.getSession();
                if (initId !== sessionInitGenRef.current) return;
                setSession(lateSession.session);
                setUser(late.user);
                persistSavedSession(lateSession.session);
                void syncProfileContact();
                hydratingSessionRef.current = false;
                setLoading(false);
                return;
              }
            } catch (e) {
              console.warn('[AuthContext] getUser after session miss:', e);
            }
          }

          if (initId !== sessionInitGenRef.current) return;

          // If no session after retries, set loading to false
          console.warn('[AuthContext] No session found after', maxRetries, 'attempts');

        const demoRaw =
          typeof window !== 'undefined' ? localStorage.getItem('demoUser') : null;
        if (demoRaw) {
          try {
            const parsedUser = JSON.parse(demoRaw);
            setUser(parsedUser as User);
            if (isDemoAdminPersistedUser(parsedUser)) {
              setSession(buildDemoAdminSession(parsedUser));
            } else {
              setSession(null);
            }
            if (parsedUser.user_metadata?.role) {
              const role = parsedUser.user_metadata.role;
              const rolesStr = localStorage.getItem('userRoles');
              const roles = rolesStr ? JSON.parse(rolesStr) : [];
              if (!roles.includes(role)) {
                roles.push(role);
                localStorage.setItem('userRoles', JSON.stringify(roles));
              }
            }
          } catch {
            localStorage.removeItem('demoUser');
          }
        }

          hydratingSessionRef.current = false;
          setLoading(false);
        })();
        recoverInFlightRef.current = run;
        try {
          await run;
        } finally {
          if (recoverInFlightRef.current === run) {
            recoverInFlightRef.current = null;
          }
        }
      };
      
      void initializeSession();

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, session?.user?.id);

        // A new tab from an email link often emits INITIAL_SESSION with no user
        // before cookies are read. Treating that as signed-out sends travellers
        // to /login even though another tab is already authenticated.
        if (event === 'INITIAL_SESSION' && !session?.user) {
          return;
        }
        // Admin pages used to call refreshSession on mount; a miss during
        // hydration (or an in-flight recover of a broken cookie) can emit
        // SIGNED_OUT. Ignore until recovery finishes so a successful sign-in
        // is not wiped by that stale refresh.
        if (
          event === 'SIGNED_OUT' &&
          (hydratingSessionRef.current ||
            recoverInFlightRef.current ||
            ignoreSignedOutRef.current)
        ) {
          return;
        }

        if (session?.user) {
          hydratingSessionRef.current = false;
          if (!(await gateUnverifiedSession(session.user))) {
            setSession(null);
            setUser(null);
            return;
          }
          setSession(session);
          // Tab focus often emits TOKEN_REFRESHED / SIGNED_IN with a new user object.
          // Keep a stable reference for the same id so host/admin forms do not refetch
          // and wipe unsaved edits. Still apply phone / role claim updates so the
          // verify-phone banner hides after OTP confirmation.
          setUser((prev) => {
            if (!prev || prev.id !== session.user.id) {
              return session.user;
            }
            // getUser() can confirm a phone before the JWT includes it.
            // Don't let INITIAL_SESSION / TOKEN_REFRESHED revert that.
            if (hasVerifiedPhone(prev) && !hasVerifiedPhone(session.user)) {
              return prev;
            }
            if (
              (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
              prev.user_metadata?.role === session.user.user_metadata?.role &&
              !authUserPhoneClaimsChanged(prev, session.user)
            ) {
              return prev;
            }
            return session.user;
          });
          persistSavedSession(session);
          void syncProfileContact();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('demoUser');
          }
          if (session.user.user_metadata?.role) {
            const role = session.user.user_metadata.role;
            const rolesStr = localStorage.getItem('userRoles');
            const roles = rolesStr ? JSON.parse(rolesStr) : [];
            if (!roles.includes(role)) {
              roles.push(role);
              localStorage.setItem('userRoles', JSON.stringify(roles));
            }
          }
        } else {
          const demoRaw =
            typeof window !== 'undefined' ? localStorage.getItem('demoUser') : null;
          if (demoRaw) {
            try {
              const parsedUser = JSON.parse(demoRaw) as User;
              setUser(parsedUser);
              if (isDemoAdminPersistedUser(parsedUser)) {
                setSession(buildDemoAdminSession(parsedUser));
              } else {
                setSession(null);
              }
              if (parsedUser.user_metadata?.role) {
                const role = parsedUser.user_metadata.role;
                const rolesStr = localStorage.getItem('userRoles');
                const roles = rolesStr ? JSON.parse(rolesStr) : [];
                if (!roles.includes(role)) {
                  roles.push(role);
                  localStorage.setItem('userRoles', JSON.stringify(roles));
                }
              }
            } catch {
              localStorage.removeItem('demoUser');
              setUser(null);
              setSession(null);
            }
          } else {
            setUser(null);
            setSession(null);
          }
        }

        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Use demo authentication with localStorage
      const demoUser = localStorage.getItem('demoUser');
      if (demoUser) {
        try {
          const parsedUser = JSON.parse(demoUser);
          setUser(parsedUser as any);
          if (isDemoAdminPersistedUser(parsedUser)) {
            setSession(buildDemoAdminSession(parsedUser));
          }

          // Sync roles from demo user metadata to localStorage
          if (parsedUser.user_metadata?.role) {
            const role = parsedUser.user_metadata.role;
            const rolesStr = localStorage.getItem('userRoles');
            const roles = rolesStr ? JSON.parse(rolesStr) : [];
            if (!roles.includes(role)) {
              roles.push(role);
              localStorage.setItem('userRoles', JSON.stringify(roles));
            }
          }
        } catch (e) {
          localStorage.removeItem('demoUser');
        }
      }
      setLoading(false);
    }
  }, [supabase, useSupabase]);

  // Auto-promote legacy host_pending → host in the session (pairs with syncProfileFromAuthUser on the server).
  useEffect(() => {
    if (!user?.id) {
      hostPendingPromotedRef.current = false;
      return;
    }
    if (!useSupabase || user.user_metadata?.role !== 'host_pending') return;
    if (hostPendingPromotedRef.current) return;
    hostPendingPromotedRef.current = true;

    const meta = user.user_metadata || {};
    void supabase.auth
      .updateUser({ data: { ...meta, role: 'host' } })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[AuthContext] host_pending promote:', error.message);
          hostPendingPromotedRef.current = false;
          return;
        }
        if (data.user) {
          setUser(data.user);
          setSession((prev) => (prev ? { ...prev, user: data.user! } : prev));
        }
      });
  }, [useSupabase, supabase, user?.id, user?.user_metadata?.role]);

  useEffect(() => {
    if (loading) return;
    rememberAdminAuthSession(session);
  }, [session, loading]);

  const signIn = async (
    email: string,
    password: string,
    options?: { returnTo?: string | null }
  ) => {
    sessionInitGenRef.current += 1;
    hydratingSessionRef.current = false;
    ignoreSignedOutRef.current = true;
    try {
    if (recoverInFlightRef.current) {
      try {
        await recoverInFlightRef.current;
      } catch {
        /* stale recover may reject after we cancelled it */
      }
    }

    // Check if this is a demo account first (even if Supabase is configured)
    const demoAccount = DEMO_ACCOUNTS[email as keyof typeof DEMO_ACCOUNTS];
    
    if (demoAccount && demoAccount.password === password) {
      // Generate unique ID based on email to ensure each account has unique properties
      const emailHash = demoAccount.email.replace(/[@.]/g, '-');
      const mockUser = {
        id: `demo-${emailHash}`,
        email: demoAccount.email,
        user_metadata: {
          full_name: demoAccount.name,
          role: demoAccount.role,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Persist demo identity before clearing Supabase so the auth listener can restore it
      localStorage.setItem('demoUser', JSON.stringify(mockUser));
      // With Supabase env present, a leftover JWT makes getUser() return the *previous* account.
      // Host tools scope by that id, while listings live under demo-*/localStorage → empty dashboard.
      if (useSupabase) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          console.warn('[AuthContext] Demo sign-in: could not clear Supabase session', e);
        }
      }

      setUser(mockUser as any);
      if (isDemoAdminPersistedUser(mockUser)) {
        const demoSession = buildDemoAdminSession(mockUser);
        setSession(demoSession);
        rememberAdminAuthSession(demoSession);
      } else {
        setSession(null);
      }

      // Sync role to localStorage
      const rolesStr = localStorage.getItem('userRoles');
      const roles = rolesStr ? JSON.parse(rolesStr) : [];
      if (!roles.includes(demoAccount.role)) {
        roles.push(demoAccount.role);
        localStorage.setItem('userRoles', JSON.stringify(roles));
      }

      const bookingReturn = safeInternalReturnPath(options?.returnTo);
      if (bookingReturn) {
        router.push(bookingReturn);
        router.refresh();
        return { error: null };
      }

      // Redirect based on role
      if (demoAccount.role === 'admin') {
        router.push('/admin');
      } else if (demoAccount.role === 'host') {
        router.push('/host/properties');
      } else {
        router.push('/');
      }
      router.refresh();
      return { error: null };
    }
    
    // If not a demo account and Supabase is not configured, show error
    if (!useSupabase) {
      return {
        error: {
          message:
            'This build is missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY). Add them in Vercel → Project → Environment Variables for Production (and Preview), set Root Directory to apps/web if this is the monorepo, then redeploy—editing env alone does not update the live JS bundle. Or use demo@traveller.com / demo@host.com / demo@admin.com with password: password.',
        },
      };
    }
    
    // Sign in replaces the browser session. Do not signOut first — that races
    // and can delete the new tokens before cookies are written.
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!error && data.user) {
      if (requiresEmailVerification(data.user) && !isDemoAuthEmail(data.user.email)) {
        await supabase.auth.signOut({ scope: 'local' });
        return {
          error: {
            message:
              'Please verify your email before signing in. Check your inbox for the confirmation link.',
            code: 'email_not_confirmed',
          },
        };
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('demoUser');
      }

      if (data.session) {
        rememberAdminAuthSession(data.session);
        setSession(data.session);
        setUser(data.user);
        persistSavedSession(data.session);
        console.log('[Auth] Session established after sign-in');
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          persistSavedSession(session);
          console.log('[Auth] Session retrieved after sign-in');
        }
      }

      if (data.user.user_metadata?.role) {
        const role = data.user.user_metadata.role;
        const rolesStr = localStorage.getItem('userRoles');
        const roles = rolesStr ? JSON.parse(rolesStr) : [];
        if (!roles.includes(role)) {
          roles.push(role);
          localStorage.setItem('userRoles', JSON.stringify(roles));
        }
      }

      // Small delay to ensure session is fully propagated
      await new Promise((resolve) => setTimeout(resolve, 100));

      const bookingReturn = safeInternalReturnPath(options?.returnTo);
      if (bookingReturn) {
        router.push(bookingReturn);
        router.refresh();
        return { error: null };
      }

      const role = data.user.user_metadata?.role;
      if (isAdminUser(data.user)) {
        router.push('/admin');
      } else if (role === 'host') {
        router.push('/host/properties');
      } else if (role === 'dispensary') {
        router.push('/dispensary/dashboard');
      } else {
        router.push('/');
      }
      router.refresh();
      return { error: null };
    }

    return { error };
    } finally {
      window.setTimeout(() => {
        ignoreSignedOutRef.current = false;
      }, 500);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: string = 'traveller',
    phone?: string
  ) => {
    // Map 'traveler' to 'traveller' for consistency
    const normalizedRole = role === 'traveler' ? 'traveller' : role;

    const emailCheck = validateSignupEmail(email);
    if (!emailCheck.ok) {
      return { error: { message: emailCheck.error } };
    }
    const normalizedEmail = emailCheck.email;
    
    if (!useSupabase) {
      // Demo mode - just create a mock user
      const mockUser = {
        id: `demo-user-${Date.now()}`,
        email: email,
        user_metadata: {
          full_name: name,
          role: normalizedRole,
          phone: phone || null,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      
      setUser(mockUser as any);
      localStorage.setItem('demoUser', JSON.stringify(mockUser));
      
      // Sync role to localStorage
      const rolesStr = localStorage.getItem('userRoles');
      const roles = rolesStr ? JSON.parse(rolesStr) : [];
      if (!roles.includes(normalizedRole)) {
        roles.push(normalizedRole);
        localStorage.setItem('userRoles', JSON.stringify(roles));
      }
      
      // Redirect based on role
      if (normalizedRole === 'host') {
        router.push('/host/properties');
      } else if (normalizedRole !== 'dispensary') {
        router.push(phone ? '/verify-phone' : '/');
      }
      
      router.refresh();
      return { error: null, data: { user: mockUser } };
    }
    
    if (signUpInFlightRef.current) {
      return { error: { message: 'Signup is already in progress. Please wait a moment.' } };
    }
    signUpInFlightRef.current = true;

    let signUpResult: { error: any; data: any };
    try {
      signUpResult = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name,
            role: normalizedRole,
            ...(phone ? { phone } : {}),
          },
          emailRedirectTo: `${getAuthRedirectOrigin()}/auth/callback?type=signup`,
        },
      });
    } finally {
      signUpInFlightRef.current = false;
    }

    const { error: rawError, data } = signUpResult;
    const error = rawError
      ? { ...rawError, message: formatAuthErrorMessage(rawError) }
      : null;

    if (!error && data.user) {
      // Supabase often returns a user with empty identities when the email is already registered
      // (and does not send a confirmation email). Surface that clearly instead of "check your inbox".
      const identities = data.user.identities ?? [];
      if (identities.length === 0) {
        return {
          error: {
            message:
              'An account with this email already exists. Sign in, or use Forgot password if you need access.',
          },
          data,
        };
      }

      // Do not keep a session until the inbox link is confirmed (when Supabase returns one).
      if (data.session && requiresEmailVerification(data.user)) {
        await supabase.auth.signOut({ scope: 'local' });
      }

      // Deliver confirm link via Resend (reliable). Supabase built-in Auth mailer is a backup only.
      if (requiresEmailVerification(data.user)) {
        try {
          await fetch('/api/auth/send-verification-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              origin: getAuthRedirectOrigin(),
              fullName: name,
              role: normalizedRole,
            }),
          });
        } catch (sendErr) {
          console.warn('[signUp] Resend verification email failed:', sendErr);
        }
      }

      const rolesStr = localStorage.getItem('userRoles');
      const roles = rolesStr ? JSON.parse(rolesStr) : [];
      if (!roles.includes(normalizedRole)) {
        roles.push(normalizedRole);
        localStorage.setItem('userRoles', JSON.stringify(roles));
      }

      if (normalizedRole !== 'dispensary') {
        if (data.session && !requiresEmailVerification(data.user) && phone) {
          router.push('/verify-phone');
        } else {
          const verifyPhoneParam = phone ? `&phone=${encodeURIComponent(phone)}` : '';
          router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}${verifyPhoneParam}`);
        }
      }
    }

    return { error, data };
  };

  const signOut = async (options?: { preserveSavedAccounts?: boolean }) => {
    const preserveAccounts = options?.preserveSavedAccounts ?? false;
    rememberAdminAuthSession(null);
    
    if (!useSupabase) {
      // Demo mode - clear localStorage
      localStorage.removeItem('demoUser');
      if (!preserveAccounts) {
        localStorage.removeItem('userRoles');
      }
      setUser(null);
      setSession(null);
      router.push('/');
      router.refresh();
    } else {
      // Supabase authentication - use local scope to only sign out this browser
      localStorage.removeItem('demoUser');
      await supabase.auth.signOut({ scope: 'local' });
      if (!preserveAccounts) {
        localStorage.removeItem('userRoles');
      }
      router.push('/');
      router.refresh();
    }
  };

  const signInWithGoogle = async (returnTo?: string | null) => {
    if (!useSupabase) {
      throw new Error('OAuth is only available with Supabase. Please use demo accounts or set up Supabase.');
    }
    const origin = getAuthRedirectOrigin();
    if (!origin) {
      throw new Error('Could not determine app URL for Google sign-in.');
    }
    const safe = safeInternalReturnPath(returnTo ?? null);
    const q = safe ? `?next=${encodeURIComponent(safe)}` : '';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback${q}`,
      },
    });
    if (error) {
      throw new Error(
        error.message ||
          'Google sign-in failed. Enable Google under Supabase Dashboard → Authentication → Providers.'
      );
    }
    if (data?.url) {
      window.location.assign(data.url);
    } else {
      throw new Error(
        'Google sign-in could not start. Enable Google in Supabase and add your callback URL to Redirect URLs.'
      );
    }
  };

  const refreshUser = async () => {
    if (!useSupabase) {
      if (typeof window === 'undefined') return;
      const demoRaw = localStorage.getItem('demoUser');
      if (!demoRaw) return;
      try {
        const parsedUser = JSON.parse(demoRaw) as User;
        setUser(parsedUser);
        if (isDemoAdminPersistedUser(parsedUser)) {
          setSession(buildDemoAdminSession(parsedUser));
        }
      } catch {
        /* ignore malformed demo session */
      }
      return;
    }

    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    if (current?.refresh_token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) {
        setSession(refreshed.session);
        setUser(refreshed.session.user);
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      setUser(data.user);
    }
  };

  const value = {
    user,
    session,
    loading,
    refreshUser,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

