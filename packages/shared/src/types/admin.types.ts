export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  FRAUDULENT = 'fraudulent',
  DANGEROUS = 'dangerous',
  DISCRIMINATION = 'discrimination',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'listing' | 'user' | 'review' | 'message';
  targetId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Metrics {
  totalUsers: number;
  totalHosts: number;
  totalGuests: number;
  activeListings: number;
  totalBookings: number;
  totalRevenue: number;
  gmv: number; // Gross Merchandise Value
  averageBookingValue: number;
  occupancyRate: number;
  disputeRate: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface Payout {
  id: string;
  hostId: string;
  bookingId: string;
  amount: number;
  currency: string;
  stripeTransferId?: string;
  status: PayoutStatus;
  initiatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}


