'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // Check if user is admin
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage properties and platform settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bulk Upload Card */}
          <Link
            href="/admin/bulk-upload"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition group"
          >
            <div className="text-4xl mb-4">📤</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-500 transition">
              Bulk Upload Properties
            </h3>
            <p className="text-gray-400 text-sm">
              Upload multiple properties at once with images and details
            </p>
          </Link>

          {/* Manage Properties Card */}
          <Link
            href="/admin/properties"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition group"
          >
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-500 transition">
              Manage Properties
            </h3>
            <p className="text-gray-400 text-sm">
              View, edit, and delete existing properties
            </p>
          </Link>

          {/* Users Card */}
          <Link
            href="/admin/users"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition group"
          >
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-500 transition">
              Manage Users
            </h3>
            <p className="text-gray-400 text-sm">
              View and manage user accounts
            </p>
          </Link>

          {/* Bookings Card */}
          <Link
            href="/admin/bookings"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition group"
          >
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-500 transition">
              Manage Bookings
            </h3>
            <p className="text-gray-400 text-sm">
              View and manage all bookings
            </p>
          </Link>

          {/* Analytics Card */}
          <Link
            href="/admin/analytics"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition group"
          >
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-500 transition">
              Analytics
            </h3>
            <p className="text-gray-400 text-sm">
              View platform statistics and insights
            </p>
          </Link>

          {/* Settings Card */}
          <Link
            href="/admin/settings"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition group"
          >
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-500 transition">
              Settings
            </h3>
            <p className="text-gray-400 text-sm">
              Configure platform settings
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

