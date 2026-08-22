'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, User, Mail, Phone, DollarSign, ToggleLeft, ToggleRight, Trash2, Eye, Download, Home, Plane, Users, Building, Pencil, ShieldBan } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { setImpersonatedHost } from '@/lib/adminHostImpersonation';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

interface UserData {
  id: string;
  email: string;
  phone: string | null;
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    userId: '',
    name: '',
    email: '',
    phone: '',
    role: 'traveller',
    enabled: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

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
  }, [user?.id]);

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
          u.role.toLowerCase().includes(query) ||
          (u.phone || '').toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }

      const response = await fetch('/api/admin/users', { headers: { ...headers } });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load users');
      }

      const usersData: UserData[] = (data.users || []).map(
        (u: UserData & { avatar_url?: string }) => ({
          id: u.id,
          email: u.email,
          phone: u.phone ?? null,
          name: u.name,
          role: u.role,
          created_at: u.created_at,
          enabled: u.enabled,
          bookings_count: u.bookings_count ?? 0,
          total_spent: u.total_spent ?? 0,
          properties_count: u.properties_count,
          total_earnings: u.total_earnings,
          avatar_url: u.avatar_url,
        })
      );

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserBookings = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, property_name, property_image, location, check_in, check_out, guests, kids, pets, total_price, status, rating, created_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUserBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    }
  };

  const patchUser = async (
    userId: string,
    patch: {
      full_name?: string;
      email?: string;
      phone?: string | null;
      role?: string;
      enabled?: boolean;
    }
  ) => {
    const headers = await getHeadersForAdminFetch();
    if (!headers.Authorization) {
      throw new Error('No valid session — please sign in again.');
    }
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Failed to update user');
    return payload.user as Partial<UserData> | undefined;
  };

  const handleToggleUser = async (userData: UserData) => {
    if (userData.role === 'admin') {
      toast.error('Cannot ban or disable admin accounts');
      return;
    }
    if (user?.id === userData.id) {
      toast.error('You cannot ban your own account');
      return;
    }

    const nextEnabled = !userData.enabled;
    const actionLabel = nextEnabled ? 'unban' : 'ban';
    if (
      !nextEnabled &&
      !confirm(`Ban ${userData.name || userData.email}? They will not be able to sign in.`)
    ) {
      return;
    }

    try {
      const updated = await patchUser(userData.id, { enabled: nextEnabled });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userData.id
            ? {
                ...u,
                enabled: updated?.enabled ?? nextEnabled,
              }
            : u
        )
      );
      toast.success(nextEnabled ? 'User unbanned' : 'User banned');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${actionLabel} user`);
    }
  };

  const openEditModal = (userData: UserData) => {
    if (userData.role === 'admin') {
      toast.error('Admin accounts cannot be edited here');
      return;
    }
    setEditForm({
      userId: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role,
      enabled: userData.enabled,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.userId) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await patchUser(editForm.userId, {
        full_name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
        enabled: editForm.enabled,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editForm.userId
            ? {
                ...u,
                name: updated?.name ?? editForm.name.trim(),
                email: updated?.email ?? editForm.email.trim(),
                phone: updated?.phone ?? (editForm.phone.trim() || null),
                role: updated?.role ?? editForm.role,
                enabled: updated?.enabled ?? editForm.enabled,
              }
            : u
        )
      );
      setShowEditModal(false);
      toast.success('User updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (userData: UserData) => {
    if (userData.role === 'admin') {
      toast.error('Cannot delete admin accounts');
      return;
    }
    if (user?.id === userData.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!confirm(`Delete ${userData.name || userData.email}? This permanently removes their account and cannot be undone.`)) {
      return;
    }

    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userData.id)}`, {
        method: 'DELETE',
        headers: { ...headers },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to delete user');

      setUsers((prev) => prev.filter((u) => u.id !== userData.id));
      toast.success('User deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
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
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
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
                            <div className="text-xs text-gray-400 font-mono">
                              {userData.id.substring(0, 8)}…
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-900">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {userData.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userData.phone ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {userData.phone}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            Missing — ask user to update profile
                          </span>
                        )}
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
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleUser(userData)}
                            disabled={userData.role === 'admin' || user?.id === userData.id}
                            className="flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
                            title={userData.enabled ? 'Ban user' : 'Unban user'}
                          >
                            {userData.enabled ? (
                              <ToggleRight className="w-6 h-6 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-red-500" />
                            )}
                          </button>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                              userData.enabled ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {userData.enabled ? 'Active' : 'Banned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditModal(userData)}
                            disabled={userData.role === 'admin'}
                            className="text-purple-600 hover:text-purple-900 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          {userData.enabled ? (
                            <button
                              type="button"
                              onClick={() => handleToggleUser(userData)}
                              disabled={userData.role === 'admin' || user?.id === userData.id}
                              className="text-orange-600 hover:text-orange-900 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ShieldBan className="w-4 h-4" />
                              Ban
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleUser(userData)}
                              disabled={userData.role === 'admin' || user?.id === userData.id}
                              className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ShieldBan className="w-4 h-4" />
                              Unban
                            </button>
                          )}
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
                            onClick={() => handleDeleteUser(userData)}
                            disabled={userData.role === 'admin' || user?.id === userData.id}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    {selectedUser.phone && (
                      <p className="text-sm text-gray-500">{selectedUser.phone}</p>
                    )}
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

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit user</h2>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="traveller">Traveller</option>
                    <option value="host">Host</option>
                    <option value="host_pending">Host pending</option>
                    <option value="dispensary">Wellness partner</option>
                    <option value="service_host">Service host</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editForm.enabled}
                    onChange={(e) => setEditForm((f) => ({ ...f, enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Account active (uncheck to ban)
                </label>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
