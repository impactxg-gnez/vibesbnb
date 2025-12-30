'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, User, Mail, Calendar, DollarSign, ToggleLeft, ToggleRight, Trash2, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  enabled: boolean;
  bookings_count: number;
  total_spent: number;
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.user_metadata?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email.toLowerCase().includes(query) ||
            u.name.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      
      // Get all bookings to extract unique user IDs
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('user_id, total_price, created_at');

      // Get unique user IDs and their data
      const userIds = new Set(bookingsData?.map((b) => b.user_id) || []);
      const usersData: UserData[] = [];

      // For each user, get their bookings stats
      for (const userId of userIds) {
        const userBookings = bookingsData?.filter((b) => b.user_id === userId) || [];
        const totalSpent = userBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

        // Try to get user email from auth (this might not work without service role)
        // For now, we'll use a placeholder approach
        usersData.push({
          id: userId,
          email: `user-${userId.substring(0, 8)}@example.com`, // Placeholder
          name: `User ${userId.substring(0, 8)}`,
          role: 'traveller', // Default
          created_at: userBookings[0]?.created_at || new Date().toISOString(),
          enabled: true, // Default
          bookings_count: userBookings.length,
          total_spent: totalSpent,
        });
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
      // In a real app, you'd update this in Supabase
      setUsers(users.map((u) => (u.id === userId ? { ...u, enabled: !currentStatus } : u)));
      setFilteredUsers(filteredUsers.map((u) => (u.id === userId ? { ...u, enabled: !currentStatus } : u)));
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
      // In a real app, you'd delete from Supabase
      setUsers(users.filter((u) => u.id !== userId));
      setFilteredUsers(filteredUsers.filter((u) => u.id !== userId));
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
    // In a real app, this would generate and download invoices
    toast.success('Invoices export feature coming soon');
  };

  if (loading || loadingUsers) {
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

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-mist-400 w-5 h-5" />
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

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mist-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-mist-500">
                      {loadingUsers ? 'Loading users...' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-mist-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.bookings_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${user.total_spent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleUser(user.id, user.enabled)}
                          className="flex items-center"
                        >
                          {user.enabled ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-mist-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewBookings(user)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => exportInvoices(user.id)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Invoices
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
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
                      Bookings for {selectedUser.name}
                    </h2>
                    <p className="text-sm text-mist-500">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowBookings(false);
                      setSelectedUser(null);
                      setUserBookings([]);
                    }}
                    className="text-mist-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                {userBookings.length === 0 ? (
                  <p className="text-mist-500 text-center py-8">No bookings found</p>
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
                            <p className="text-sm text-mist-500">
                              {new Date(booking.check_in).toLocaleDateString()} -{' '}
                              {new Date(booking.check_out).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-mist-500">Location: {booking.location}</p>
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

