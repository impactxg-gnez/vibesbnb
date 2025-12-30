'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, DollarSign, Check, X, Eye, CreditCard, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Booking {
  id: string;
  property_id: string;
  property_name: string;
  property_image?: string;
  location: string;
  check_in: string;
  check_out: string;
  guests: number;
  kids: number;
  pets: number;
  total_price: number;
  status: 'pending_approval' | 'accepted' | 'rejected' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  guest_name: string;
  guest_email: string;
  special_requests?: string;
  created_at: string;
  host_approved_at?: string;
  host_rejected_at?: string;
  rejection_reason?: string;
}

export default function HostBookingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_approval' | 'accepted' | 'rejected' | 'confirmed' | 'cancelled'>('all');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'host') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.user_metadata?.role === 'host') {
      loadBookings();
      loadNotifications();

      const supabase = createClient();
      const channel = supabase
        .channel(`host-bookings-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings', filter: `host_id=eq.${user.id}` },
          () => {
            loadBookings();
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (!supabaseUser) {
        toast.error('Please log in');
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('host_id', supabaseUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (!supabaseUser) return;

      setLoadingNotifications(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, created_at, read')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
        setUnreadNotifications(data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST' });
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark notifications read:', error);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const response = await fetch('/api/bookings/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept booking');
      }

      toast.success('Booking accepted! Guest has been notified.');
      loadBookings();
      loadNotifications();
    } catch (error: any) {
      console.error('Error accepting booking:', error);
      toast.error(error.message || 'Failed to accept booking');
    }
  };

  const handleRejectBooking = async (bookingId: string, reason?: string) => {
    if (!reason || reason.trim() === '') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await fetch('/api/bookings/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject booking');
      }

      toast.success('Booking rejected. Guest has been notified.');
      loadBookings();
      loadNotifications();
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      toast.error(error.message || 'Failed to reject booking');
    }
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Bookings</h1>
            <p className="text-mist-400">Manage your property bookings</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-charcoal-800 text-white rounded-lg">
            <Bell size={20} />
            <span>{unreadNotifications} unread</span>
            <button
              onClick={markNotificationsRead}
              className="text-xs underline text-emerald-300"
              disabled={loadingNotifications || unreadNotifications === 0}
            >
              Mark read
            </button>
          </div>
        </div>

        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Notifications</h2>
            <button
              onClick={loadNotifications}
              className="text-sm text-mist-400 hover:text-white"
              disabled={loadingNotifications}
            >
              {loadingNotifications ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-mist-500 text-sm">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read ? 'border-charcoal-800' : 'border-emerald-600'
                  }`}
                >
                  <p className="text-sm text-mist-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                  <p className="text-white font-semibold">{notification.title}</p>
                  <p className="text-mist-300 text-sm">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending_approval', 'accepted', 'confirmed', 'rejected', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition ${
                filter === status
                  ? 'bg-earth-600 text-white'
                  : 'bg-charcoal-800 text-mist-300 hover:bg-charcoal-700'
              }`}
            >
              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-12 text-center">
            <p className="text-mist-400 text-lg">No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 hover:border-charcoal-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      {booking.property_image && (
                        <img
                          src={booking.property_image}
                          alt={booking.property_name}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/200x200/1a1a1a/ffffff?text=No+Image';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{booking.property_name}</h3>
                        <p className="text-mist-400 text-sm mb-2">{booking.location}</p>
                        <div className="flex items-center gap-4 text-sm text-mist-300">
                          <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            <span>
                              {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users size={16} />
                            <span>{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
                            {booking.kids > 0 && <span>, {booking.kids} kid{booking.kids !== 1 ? 's' : ''}</span>}
                            {booking.pets > 0 && <span>, {booking.pets} pet{booking.pets !== 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-mist-400 mb-1">Guest</p>
                        <p className="text-white font-medium">{booking.guest_name}</p>
                        <p className="text-mist-400 text-sm">{booking.guest_email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-mist-400 mb-1">Total Price</p>
                        <p className="text-white font-bold text-lg">${Number(booking.total_price).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-mist-400 mb-1">Status</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-mist-400 mb-1">Payment</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                          {booking.payment_status.replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <div className="mb-4 p-3 bg-charcoal-800 rounded-lg">
                        <p className="text-sm text-mist-400 mb-1">Special Requests</p>
                        <p className="text-white text-sm">{booking.special_requests}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {(booking.status === 'pending_approval' || (booking.status as string) === 'pending') && (
                      <>
                        <button
                          onClick={() => handleAcceptBooking(booking.id)}
                          className="px-4 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition flex items-center gap-2"
                        >
                          <Check size={18} />
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Please provide a reason for rejection:');
                            if (reason) {
                              handleRejectBooking(booking.id, reason);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                        >
                          <X size={18} />
                          Reject
                        </button>
                      </>
                    )}
                    {booking.status === 'accepted' && booking.payment_status === 'pending' && (
                      <div className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm text-center">
                        Awaiting Payment
                      </div>
                    )}
                    {booking.status === 'confirmed' && booking.payment_status === 'paid' && (
                      <div className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm text-center">
                        Confirmed & Paid
                      </div>
                    )}
                    <Link
                      href={`/listings/${booking.property_id}`}
                      target="_blank"
                      className="px-4 py-2 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-700 transition flex items-center gap-2"
                    >
                      <Eye size={18} />
                      View Property
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}








