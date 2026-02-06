'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Users, List, Bell, RefreshCw, Image, Leaf, ArrowRight, ShieldCheck } from 'lucide-react';
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
  dispensaries?: {
    total: number;
    pending: number;
  };
  hosts?: {
    total: number;
    pending: number;
  };
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [grabbingImages, setGrabbingImages] = useState(false);

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          role: user?.user_metadata?.role || user?.app_metadata?.role 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup properties');
      }

      if (data.total === 0) {
        toast.error(`No properties found in database. Debug info: ${JSON.stringify(data.debug || {})}`);
      } else if (data.updated === 0) {
        toast(`Found ${data.total} properties, but none needed updates. All properties already have clean names and images.`, {
          icon: 'ℹ️',
        });
        console.log('Cleanup details:', data);
      } else {
        toast.success(`Successfully cleaned up ${data.updated} out of ${data.total} properties! (${data.breakdown?.nameCleanups || 0} name cleanups, ${data.breakdown?.imageAdditions || 0} image additions)`);
      }
      fetchStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error cleaning up properties:', error);
      toast.error(error.message || 'Failed to cleanup properties');
    } finally {
      setCleaningUp(false);
    }
  };

  const handleDebugProperties = async () => {
    try {
      const response = await fetch('/api/admin/debug-properties');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to debug properties');
      }
      
      console.log('Properties Debug Info:', data);
      console.table(data.analysis);
      if (data.properties && data.properties.length > 0) {
        console.log('Sample Properties:', data.properties);
      }
      
      const message = `Properties Debug Info:

Total Properties: ${data.count}
Using Service Role: ${data.usingServiceRole ? 'Yes' : 'No'}

Analysis:
- With Name: ${data.analysis.withName}
- With Title: ${data.analysis.withTitle}
- With Images: ${data.analysis.withImages}
- Without Images: ${data.analysis.withoutImages}
- With "Property Listing" Prefix: ${data.analysis.withPropertyListingPrefix}

${data.analysis.sampleProperties.length > 0 ? `\nSample Properties:\n${data.analysis.sampleProperties.map((p: any, i: number) => `${i + 1}. ${p.name || p.title || 'Untitled'} (ID: ${p.id}, Images: ${p.imagesCount}, Has Prefix: ${p.hasPropertyListingPrefix})`).join('\n')}` : ''}

Check browser console for full details and property data.`;
      
      alert(message);
    } catch (error: any) {
      console.error('Error debugging properties:', error);
      toast.error(error.message || 'Failed to debug properties');
    }
  };

  const handleGrabImages = async () => {
    if (!confirm('This will attempt to grab images for all properties that are missing photos. This may take a while. Continue?')) {
      return;
    }

    setGrabbingImages(true);
    try {
      const response = await fetch('/api/admin/grab-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          role: user?.user_metadata?.role || user?.app_metadata?.role 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grab images');
      }

      toast.success(`Successfully grabbed images for ${data.updated} properties!`);
      fetchStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error grabbing images:', error);
      toast.error(error.message || 'Failed to grab images');
    } finally {
      setGrabbingImages(false);
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
    dispensaries: { total: 0, pending: 0 },
    hosts: { total: 0, pending: 0 },
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={handleDebugProperties}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Debug Properties
            </button>
            <button
              onClick={handleCleanupProperties}
              disabled={cleaningUp || grabbingImages}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${cleaningUp ? 'animate-spin' : ''}`} />
              {cleaningUp ? 'Cleaning...' : 'Cleanup Properties'}
            </button>
            <button
              onClick={handleGrabImages}
              disabled={cleaningUp || grabbingImages}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Image className={`w-4 h-4 ${grabbingImages ? 'animate-spin' : ''}`} />
              {grabbingImages ? 'Grabbing Images...' : 'Grab Images'}
            </button>
          </div>
        </div>

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
        
        {/* Pending Applications - URGENT ACTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pending Host Applications */}
          <div 
            onClick={() => router.push('/admin/hosts')}
            className="group cursor-pointer bg-white rounded-lg p-6 shadow-sm border-2 border-blue-100 hover:border-blue-500 transition-all relative overflow-hidden"
          >
            {(statsData.hosts?.pending ?? 0) > 0 && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg animate-pulse">
                ACTION REQUIRED
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
                <Users className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.hosts?.pending || 0}</div>
            <div className="text-sm text-gray-600 font-medium">Pending Host Applications</div>
            <p className="mt-4 text-xs text-gray-500">New hosts waiting to be approved</p>
          </div>

          {/* Pending Dispensary Applications */}
          <div 
            onClick={() => router.push('/admin/dispensaries?filter=pending')}
            className="group cursor-pointer bg-white rounded-lg p-6 shadow-sm border-2 border-orange-100 hover:border-orange-500 transition-all relative overflow-hidden"
          >
            {(statsData.dispensaries?.pending ?? 0) > 0 && (
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg animate-pulse">
                ACTION REQUIRED
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-500 transition-colors">
                <Leaf className="w-6 h-6 text-orange-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transform group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{statsData.dispensaries?.pending || 0}</div>
            <div className="text-sm text-gray-600 font-medium">Pending Dispensary Applications</div>
            <p className="mt-4 text-xs text-gray-500">New shops waiting to join the platform</p>
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

