'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, User, Mail, Calendar, DollarSign, ToggleLeft, ToggleRight, Trash2, Eye, Download, Home, Plane, Users, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { setImpersonatedHost } from '@/lib/adminHostImpersonation';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  enabled: boolean;
  bookings_count: number;
  total_spent: number;
  properties_count?: number;
  total_earnings?: number;
  avatar_url?: string;
}

interface Booking {
  id: string;
  property_name: string;
  property_image?: string;
  location: string;
  check_in: string;
  check_out: string;
  guests: number;
  kids?: number;
  pets?: number;
  total_price: number;
  status: string;
  rating?: number;
  created_at: string;
}

export default function ManageUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [showBookings, setShowBookings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'hosts' | 'travellers'>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdminUser(user)) {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, activeTab]);

  const filterUsers = () => {
    let filtered = users;

    // Filter by role/tab
    if (activeTab === 'hosts') {
      filtered = filtered.filter(u => u.role === 'host');
    } else if (activeTab === 'travellers') {
      filtered = filtered.filter(u => u.role === 'traveller' || u.role === 'user');
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.name.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      
      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles error:', profilesError);
      }

      // Get all bookings to calculate stats
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('user_id, total_price, host_id');

      // Get all properties to calculate host stats
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('host_id, id');

      // Build user data from profiles
      const usersData: UserData[] = [];
      const seenIds = new Set<string>();

      // Add users from profiles
      if (profilesData) {
        for (const profile of profilesData) {
          if (seenIds.has(profile.id)) continue;
          seenIds.add(profile.id);

          const userBookings = bookingsData?.filter((b) => b.user_id === profile.id) || [];
          const totalSpent = userBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

          const userProperties = propertiesData?.filter((p) => p.host_id === profile.id) || [];
          const hostEarnings = bookingsData?.filter((b) => b.host_id === profile.id)
            .reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

          usersData.push({
            id: profile.id,
            email: profile.email || `user-${profile.id.substring(0, 8)}`,
            name: profile.full_name || profile.name || 'Anonymous User',
            role: profile.role || 'traveller',
            created_at: profile.created_at || new Date().toISOString(),
            enabled: profile.enabled !== false,
            bookings_count: userBookings.length,
            total_spent: totalSpent,
            properties_count: userProperties.length,
            total_earnings: hostEarnings,
            avatar_url: profile.avatar_url,
          });
        }
      }

      // Also check for users with bookings who might not have profiles
      if (bookingsData) {
        const bookingUserIds = new Set(bookingsData.map(b => b.user_id).filter(Boolean));
        for (const userId of bookingUserIds) {
          if (seenIds.has(userId)) continue;
          seenIds.add(userId);

          const userBookingsList = bookingsData.filter((b) => b.user_id === userId);
          const totalSpent = userBookingsList.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

          usersData.push({
            id: userId,
            email: `user-${userId.substring(0, 8)}`,
            name: `User ${userId.substring(0, 8)}`,
            role: 'traveller',
            created_at: new Date().toISOString(),
            enabled: true,
            bookings_count: userBookingsList.length,
            total_spent: totalSpent,
          });
        }
      }

      // Check for hosts from properties who might not have profiles
      if (propertiesData) {
        const hostIds = new Set(propertiesData.map(p => p.host_id).filter(Boolean));
        for (const hostId of hostIds) {
          if (seenIds.has(hostId)) continue;
          seenIds.add(hostId);

          const hostProperties = propertiesData.filter((p) => p.host_id === hostId);
          const hostEarnings = bookingsData?.filter((b) => b.host_id === hostId)
            .reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;

          usersData.push({
            id: hostId,
            email: `host-${hostId.substring(0, 8)}`,
            name: `Host ${hostId.substring(0, 8)}`,
            role: 'host',
            created_at: new Date().toISOString(),
            enabled: true,
            bookings_count: 0,
            total_spent: 0,
            properties_count: hostProperties.length,
            total_earnings: hostEarnings,
          });
        }
      }

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserBookings = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    }
  };

  const handleToggleUser = async (userId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({ enabled: !currentStatus })
        .eq('id', userId);

      setUsers(users.map((u) => (u.id === userId ? { ...u, enabled: !currentStatus } : u)));
      toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      await supabase.from('profiles').delete().eq('id', userId);
      
      setUsers(users.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleViewBookings = async (user: UserData) => {
    setSelectedUser(user);
    setShowBookings(true);
    await loadUserBookings(user.id);
  };

  const exportInvoices = (userId: string) => {
    toast.success('Invoices export feature coming soon');
  };

  // Stats
  const hostCount = users.filter(u => u.role === 'host').length;
  const travellerCount = users.filter(u => u.role === 'traveller' || u.role === 'user').length;
  const totalBookings = users.reduce((sum, u) => sum + u.bookings_count, 0);
  const totalRevenue = users.reduce((sum, u) => sum + u.total_spent, 0);

  if (loading || loadingUsers) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdminUser(user)) {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-sm text-gray-500 mt-1">
              Hosts: use <span className="font-semibold text-emerald-700">Host view</span> to open their dashboard and
              edit listings while signed in as admin.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hosts</p>
                <p className="text-xl font-bold text-gray-900">{hostCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Travellers</p>
                <p className="text-xl font-bold text-gray-900">{travellerCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('hosts')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'hosts'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Building className="w-4 h-4" />
            Hosts ({hostCount})
          </button>
          <button
            onClick={() => setActiveTab('travellers')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'travellers'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Plane className="w-4 h-4" />
            Travellers ({travellerCount})
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  {activeTab !== 'hosts' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                    </>
                  )}
                  {activeTab !== 'travellers' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Properties
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Earnings
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {loadingUsers ? 'Loading users...' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userData) => (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden">
                            {userData.avatar_url ? (
                              <img src={userData.avatar_url} alt={userData.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                            <div className="text-sm text-gray-500">{userData.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          userData.role === 'host' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : userData.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {userData.role === 'host' && <Building className="w-3 h-3 mr-1" />}
                          {(userData.role === 'traveller' || userData.role === 'user') && <Plane className="w-3 h-3 mr-1" />}
                          {userData.role}
                        </span>
                      </td>
                      {activeTab !== 'hosts' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {userData.bookings_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${userData.total_spent.toFixed(2)}
                          </td>
                        </>
                      )}
                      {activeTab !== 'travellers' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {userData.properties_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(userData.total_earnings || 0).toFixed(2)}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleUser(userData.id, userData.enabled)}
                          className="flex items-center"
                        >
                          {userData.enabled ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(userData.role === 'host' || (userData.properties_count ?? 0) > 0) && (
                            <button
                              type="button"
                              onClick={() => {
                                setImpersonatedHost(userData.id, userData.email || userData.name);
                                router.push('/host/properties');
                              }}
                              className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1 font-semibold"
                            >
                              <Home className="w-4 h-4" />
                              Host view
                            </button>
                          )}
                          <button
                            onClick={() => handleViewBookings(userData)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => exportInvoices(userData.id)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Invoices
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bookings Modal */}
        {showBookings && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedUser.role === 'host' ? 'Properties & Bookings' : 'Bookings'} for {selectedUser.name}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowBookings(false);
                      setSelectedUser(null);
                      setUserBookings([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                {userBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No bookings found</p>
                ) : (
                  <div className="space-y-4">
                    {userBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{booking.property_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(booking.check_in).toLocaleDateString()} -{' '}
                              {new Date(booking.check_out).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">Location: {booking.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${booking.total_price}</p>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                booking.status === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : booking.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
