'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
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
  'admin@vibesbnb.com': {
    password: 'Vibes123!',
    role: 'admin',
    name: 'Admin',
    email: 'admin@vibesbnb.com',
  },
  'esca@vibesbnb.com': {
    password: 'Esca123!',
    role: 'host',
    name: 'EscaManagement',
    email: 'esca@vibesbnb.com',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && 
         process.env.NEXT_PUBLIC_SUPABASE_URL !== '' &&
         process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const useSupabase = isSupabaseConfigured();

  useEffect(() => {
    if (useSupabase) {
      // Get initial session from Supabase with retry logic
      const initializeSession = async () => {
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (session && !error) {
              setSession(session);
              setUser(session?.user ?? null);
              
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
              setLoading(false);
              return;
            }
            
            if (error) {
              console.log('[AuthContext] Session error (attempt', retries + 1, '):', error.message);
            }
            
            // Wait before retry
            if (retries < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            retries++;
          } catch (error: any) {
            console.error('[AuthContext] Error initializing session:', error);
            retries++;
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // If no session after retries, set loading to false
        console.warn('[AuthContext] No session found after', maxRetries, 'attempts');
        setLoading(false);
      };
      
      initializeSession();

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
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

  const signIn = async (email: string, password: string) => {
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
      
      setUser(mockUser as any);
      localStorage.setItem('demoUser', JSON.stringify(mockUser));
      
      // Sync role to localStorage
      const rolesStr = localStorage.getItem('userRoles');
      const roles = rolesStr ? JSON.parse(rolesStr) : [];
      if (!roles.includes(demoAccount.role)) {
        roles.push(demoAccount.role);
        localStorage.setItem('userRoles', JSON.stringify(roles));
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
          message: 'Invalid email or password. Try demo@traveller.com, demo@host.com, demo@admin.com (password: password), admin@vibesbnb.com (password: Vibes123!) or esca@vibesbnb.com (password: Esca123!)' 
        } 
      };
    }
    
    // Supabase authentication for non-demo accounts
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Ensure session is properly set
      if (data.session) {
        // Session is already available from signInWithPassword
        console.log('[Auth] Session established after sign-in');
      } else {
        // If no session in response, get it explicitly
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Auth] Session retrieved after sign-in');
        }
      }
      
      // Sync roles from user metadata to localStorage after login
      if (data.user.user_metadata?.role) {
        const role = data.user.user_metadata.role;
        const rolesStr = localStorage.getItem('userRoles');
        const roles = rolesStr ? JSON.parse(rolesStr) : [];
        if (!roles.includes(role)) {
          roles.push(role);
          localStorage.setItem('userRoles', JSON.stringify(roles));
        }
        
        // Small delay to ensure session is fully propagated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect based on role
        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'host') {
          router.push('/host/properties');
        } else if (role === 'dispensary') {
          router.push('/dispensary/dashboard');
        } else {
          router.push('/');
        }
      } else {
        // No role set, default to home
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push('/');
      }
      router.refresh();
    }

    return { error };
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'traveller') => {
    // Map 'traveler' to 'traveller' for consistency
    const normalizedRole = role === 'traveler' ? 'traveller' : role;
    
    if (!useSupabase) {
      // Demo mode - just create a mock user
      const mockUser = {
        id: `demo-user-${Date.now()}`,
        email: email,
        user_metadata: {
          full_name: name,
          role: normalizedRole,
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
      } else {
        router.push('/');
      }
      router.refresh();
      return { error: null };
    }
    
    // Supabase authentication
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: normalizedRole,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
      },
    });

    if (!error && data.user) {
      // Sync role to localStorage
      const rolesStr = localStorage.getItem('userRoles');
      const roles = rolesStr ? JSON.parse(rolesStr) : [];
      if (!roles.includes(normalizedRole)) {
        roles.push(normalizedRole);
        localStorage.setItem('userRoles', JSON.stringify(roles));
      }
      
      // If host, redirect to host dashboard after email verification
      // Otherwise, redirect to verify email page
      if (normalizedRole === 'host') {
        // For hosts, we might want to redirect them directly if email is already verified
        // But typically, Supabase requires email verification first
        router.push('/verify-email');
      } else {
        router.push('/verify-email');
      }
    }

    return { error, data };
  };

  const signOut = async () => {
    if (!useSupabase) {
      // Demo mode - clear localStorage
      localStorage.removeItem('demoUser');
      setUser(null);
      setSession(null);
      router.push('/');
      router.refresh();
    } else {
      // Supabase authentication
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    }
  };

  const signInWithGoogle = async () => {
    if (!useSupabase) {
      throw new Error('OAuth is only available with Supabase. Please use demo accounts or set up Supabase.');
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithGithub = async () => {
    if (!useSupabase) {
      throw new Error('OAuth is only available with Supabase. Please use demo accounts or set up Supabase.');
    }
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGithub,
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

