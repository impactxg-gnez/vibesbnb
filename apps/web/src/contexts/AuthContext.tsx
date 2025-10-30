'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User, AuthTokens } from '@vibesbnb/shared';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        api.setToken(token);
        const userData = await api.get('/users/me');
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const getDashboardRoute = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'host':
        return '/host/dashboard';
      case 'guest':
      default:
        return '/dashboard';
    }
  };

  const login = async (email: string, password: string) => {
    const data: AuthTokens & { user?: User } = await api.post('/auth/login', {
      email,
      password,
    });
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    api.setToken(data.accessToken);
    
    await loadUser();
    
    // Redirect based on user role
    const userData = await api.get<User>('/users/me');
    const dashboardRoute = getDashboardRoute(userData.role);
    router.push(dashboardRoute);
  };

  const register = async (email: string, password: string, name: string) => {
    const data: AuthTokens = await api.post('/auth/register', {
      email,
      password,
      name,
    });
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    api.setToken(data.accessToken);
    
    await loadUser();
    
    // Redirect based on user role (default to guest dashboard)
    const userData = await api.get<User>('/users/me');
    const dashboardRoute = getDashboardRoute(userData.role);
    router.push(dashboardRoute);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    api.setToken(null);
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};


