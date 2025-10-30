'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, User, Heart, MessageCircle, Calendar, LogOut, Map } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">VibesBNB</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                {user.role === 'host' && (
                  <Link
                    href="/host/dashboard"
                    className="text-gray-700 hover:text-primary-600"
                  >
                    Host Dashboard
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-primary-600"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/bookings"
                  className="text-gray-700 hover:text-primary-600 flex items-center space-x-1"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bookings</span>
                </Link>
                <Link
                  href="/itinerary"
                  className="text-gray-700 hover:text-primary-600 flex items-center space-x-1"
                >
                  <Map className="w-4 h-4" />
                  <span>Trip Planner</span>
                </Link>
                <Link
                  href="/favorites"
                  className="text-gray-700 hover:text-primary-600 flex items-center space-x-1"
                >
                  <Heart className="w-4 h-4" />
                  <span>Favorites</span>
                </Link>
                <Link
                  href="/messages"
                  className="text-gray-700 hover:text-primary-600 flex items-center space-x-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Messages</span>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                  >
                    <User className="w-5 h-5" />
                    <span>{user.name}</span>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/account"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        Account Settings
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Login
                </Link>
                <Link href="/register" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              {user ? (
                <>
                  <Link href="/bookings" className="text-gray-700">
                    Bookings
                  </Link>
                  <Link href="/itinerary" className="text-gray-700">
                    Trip Planner
                  </Link>
                  <Link href="/favorites" className="text-gray-700">
                    Favorites
                  </Link>
                  <Link href="/messages" className="text-gray-700">
                    Messages
                  </Link>
                  {user.role === 'host' && (
                    <Link href="/host/dashboard" className="text-gray-700">
                      Host Dashboard
                    </Link>
                  )}
                  <Link href="/profile" className="text-gray-700">
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="text-left text-gray-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}


