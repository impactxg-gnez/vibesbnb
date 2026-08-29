import { getAccessToken } from './supabase';
import { config } from './config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${config.apiUrl}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || res.statusText || 'Request failed',
      res.status
    );
  }
  return data as T;
}

export async function syncProfile(): Promise<void> {
  await apiFetch('/api/profile/sync', { method: 'POST' });
}

export async function registerPushToken(token: string, platform: string): Promise<void> {
  await apiFetch('/api/notifications/register-device', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function fetchBrowseProperties(limit?: number) {
  const q = limit != null ? `?limit=${limit}` : '';
  return apiFetch<{ properties: BrowseProperty[] }>(`/api/properties/browse${q}`);
}

export type BrowseProperty = {
  id: string;
  name?: string;
  title?: string;
  location?: string;
  price?: number;
  images?: string[];
  rating?: number;
  reviews_count?: number;
  type?: string;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  latitude?: number;
  longitude?: number;
  wellness_consumption_indoor_allowed?: boolean;
  wellness_consumption_outdoor_allowed?: boolean;
};

export type Conversation = {
  id: string;
  property_id: string;
  last_message?: string | null;
  last_message_at?: string | null;
  host_name?: string | null;
  traveller_name?: string | null;
  host_unread_count?: number | null;
  traveller_unread_count?: number | null;
  properties?: { name?: string; location?: string; images?: string[] } | null;
};

export async function fetchConversations() {
  return apiFetch<{ conversations: Conversation[] }>('/api/chat/conversations');
}

export async function fetchMessages(conversationId: string) {
  return apiFetch<{ messages: ChatMessage[] }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`
  );
}

export type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

export async function sendMessage(conversationId: string, content: string) {
  return apiFetch<{ message: ChatMessage }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body: JSON.stringify({ content }) }
  );
}

export async function fetchHostDashboard() {
  return apiFetch<HostDashboard>('/api/host/dashboard');
}

export type HostDashboard = {
  propertyCount: number;
  activeListings: number;
  pendingApprovals: Array<Record<string, unknown>>;
  upcomingStays: Array<Record<string, unknown>>;
  pendingPayoutTotal: number;
  paidYtdTotal: number;
  pendingPayouts: Array<Record<string, unknown>>;
  migrationRequired?: boolean;
};

export async function fetchHostPayouts() {
  return apiFetch<HostPayoutsResponse>('/api/host/payouts');
}

export type HostPayoutsResponse = {
  summary: {
    pendingTotal: number;
    paidTotal: number;
    cancelledTotal: number;
    cancelledCount: number;
  };
  pending: PayoutRow[];
  paid: PayoutRow[];
  cancelled: PayoutRow[];
  migrationRequired?: boolean;
};

export type PayoutRow = {
  id: string;
  guest_total: number;
  host_fee: number;
  host_amount: number;
  property_name?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
};

export async function acceptBooking(bookingId: string) {
  return apiFetch('/api/bookings/accept', {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  });
}

export async function rejectBooking(bookingId: string, reason: string) {
  return apiFetch('/api/bookings/reject', {
    method: 'POST',
    body: JSON.stringify({ bookingId, reason }),
  });
}

export async function cancelBooking(bookingId: string, reason?: string) {
  return apiFetch('/api/bookings/cancel', {
    method: 'POST',
    body: JSON.stringify({ bookingId, reason: reason || 'Cancelled by guest' }),
  });
}

export async function fetchPlatformFees() {
  return apiFetch<{ serviceFeePercent: number; hostFeePercent: number }>(
    '/api/platform-fees'
  );
}
