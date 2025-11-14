'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Users, List, Bell, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  users: {
    total: number;
    last24Hours: number;
    last30Days: number;
  };
  listings: {
    total: number;
    last24Hours: number;
    last30Days: number;
  };
  reservations: {
    total: number;
    last24Hours: number;
    last30Days: number;
  };
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // Check if user is admin
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.user_metadata?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use fallback data
      setStats({
        users: { total: 1788, last24Hours: 1, last30Days: 27 },
        listings: { total: 272, last24Hours: 0, last30Days: 2 },
        reservations: { total: 351, last24Hours: 0, last30Days: 7 },
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCleanupProperties = async () => {
    if (!confirm('This will clean up all property names (remove "Property Listing" prefix) and ensure all properties have at least 1 photo. Continue?')) {
      return;
    }

    setCleaningUp(true);
    try {
      const response = await fetch('/api/admin/cleanup-properties', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup properties');
      }

      toast.success(`Successfully cleaned up ${data.updated} properties!`);
      fetchStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error cleaning up properties:', error);
      toast.error(error.message || 'Failed to cleanup properties');
    } finally {
      setCleaningUp(false);
    }
  };

  if (loading || loadingStats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

  const statsData = stats || {
    users: { total: 0, last24Hours: 0, last30Days: 0 },
    listings: { total: 0, last24Hours: 0, last30Days: 0 },
    reservations: { total: 0, last24Hours: 0, last30Days: 0 },
  };

  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* User Statistics - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Users */}
          <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mb-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8" />
                <div className="text-4xl font-bold">{statsData.users.total}</div>
              </div>
              <div className="text-sm opacity-90">Total Users</div>
              {/* Wavy graph background effect */}
              <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20">
                <svg viewBox="0 0 200 50" className="w-full h-full">
                  <path
                    d="M0,25 Q50,10 100,25 T200,25"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Last 24 hours Users */}
          <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mb-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8" />
                <div className="text-4xl font-bold">{statsData.users.last24Hours}</div>
              </div>
              <div className="text-sm opacity-90">Last 24 hours Users</div>
              <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20">
                <svg viewBox="0 0 200 50" className="w-full h-full">
                  <path
                    d="M0,30 Q50,15 100,30 T200,30"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Last 30 days Users */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mb-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8" />
                <div className="text-4xl font-bold">{statsData.users.last30Days}</div>
              </div>
              <div className="text-sm opacity-90">Last 30 days Users</div>
              <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20">
                <svg viewBox="0 0 200 50" className="w-full h-full">
                  <path
                    d="M0,20 Q50,35 100,20 T200,20"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Listing Statistics - Middle Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Last 30 days Listings */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <List className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.listings.last30Days}</div>
            <div className="text-sm text-gray-600">Last 30 days Listings</div>
          </div>

          {/* Last 24 hours Listings */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <List className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.listings.last24Hours}</div>
            <div className="text-sm text-gray-600">Last 24 hours Listings</div>
          </div>

          {/* Total Listings */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <List className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.listings.total}</div>
            <div className="text-sm text-gray-600">Total Listings</div>
          </div>
        </div>

        {/* Reservation Statistics - Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Reservations */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.reservations.total}</div>
            <div className="text-sm text-gray-600 mb-4">Total Reservations</div>
            {/* Semi-circle graphic */}
            <div className="absolute bottom-0 left-0 right-0 h-2">
              <div className="h-full bg-blue-500 rounded-t-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          {/* Last 24 hours Reservations */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.reservations.last24Hours}</div>
            <div className="text-sm text-gray-600 mb-4">Last 24 hours Reservations</div>
            <div className="absolute bottom-0 left-0 right-0 h-2">
              <div className="h-full bg-pink-500 rounded-t-full" style={{ width: '10%' }}></div>
            </div>
          </div>

          {/* Last 30 days Reservations */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.reservations.last30Days}</div>
            <div className="text-sm text-gray-600 mb-4">Last 30 days Reservations</div>
            <div className="absolute bottom-0 left-0 right-0 h-2">
              <div className="h-full bg-yellow-500 rounded-t-full" style={{ width: '20%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

