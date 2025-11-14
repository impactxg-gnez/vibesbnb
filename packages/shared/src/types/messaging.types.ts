export interface MessageThread {
  id: string;
  listingId: string;
  hostId: string;
  guestId: string;
  bookingId?: string;
  lastMessageAt: Date;
  unreadCountHost: number;
  unreadCountGuest: number;
  createdAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
  read: boolean;
  sentAt: Date;
}

export enum NotificationType {
  BOOKING_REQUEST = 'booking_request',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_DECLINED = 'booking_declined',
  BOOKING_CANCELED = 'booking_canceled',
  CHECK_IN_REMINDER = 'check_in_reminder',
  NEW_MESSAGE = 'new_message',
  REVIEW_REQUEST = 'review_request',
  PAYOUT_SENT = 'payout_sent',
  KYC_APPROVED = 'kyc_approved',
  KYC_REJECTED = 'kyc_rejected',
  LISTING_APPROVED = 'listing_approved',
  LISTING_SUSPENDED = 'listing_suspended',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}


