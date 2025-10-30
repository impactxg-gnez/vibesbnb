import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  Metrics,
  ReportStatus,
  KYCStatus,
  ListingStatus,
  BookingStatus,
} from '@vibesbnb/shared';

@Injectable()
export class AdminService {
  constructor(private firebase: FirebaseService) {}

  async getMetrics(startDate: Date, endDate: Date): Promise<Metrics> {
    const allUsers = await this.firebase.query('users', []);
    const allListings = await this.firebase.query('listings', []);
    const allBookings = await this.firebase.query('bookings', []);

    // Filter bookings by date range
    const bookingsInRange = allBookings.filter((b) => {
      const createdAt = new Date(b.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const totalRevenue = bookingsInRange.reduce((sum, b) => {
      if ([BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT].includes(b.status)) {
        return sum + b.total;
      }
      return sum;
    }, 0);

    const gmv = bookingsInRange.reduce((sum, b) => sum + b.subtotal, 0);

    const totalHosts = allUsers.filter((u) => u.role === 'host').length;
    const totalGuests = allUsers.filter((u) => u.role === 'guest').length;
    const activeListings = allListings.filter((l) => l.status === ListingStatus.ACTIVE).length;

    const disputes = await this.firebase.query('reports', [
      { field: 'status', op: '==', value: ReportStatus.PENDING },
    ]);

    return {
      totalUsers: allUsers.length,
      totalHosts,
      totalGuests,
      activeListings,
      totalBookings: bookingsInRange.length,
      totalRevenue,
      gmv,
      averageBookingValue: bookingsInRange.length > 0 ? totalRevenue / bookingsInRange.length : 0,
      occupancyRate: 0, // TODO: Calculate based on available vs booked nights
      disputeRate: bookingsInRange.length > 0 ? disputes.length / bookingsInRange.length : 0,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  async getPendingKYC() {
    return this.firebase.query('users', [
      { field: 'kycStatus', op: '==', value: KYCStatus.PENDING },
    ]);
  }

  async getPendingListings() {
    return this.firebase.query('listings', [
      { field: 'status', op: '==', value: ListingStatus.PENDING_REVIEW },
    ]);
  }

  async approveListing(listingId: string) {
    await this.firebase.update('listings', listingId, {
      status: ListingStatus.ACTIVE,
    });

    // Log audit event
    await this.firebase.create('audit_logs', {
      actorId: 'admin',
      action: 'approve_listing',
      targetType: 'listing',
      targetId: listingId,
      metadata: {},
    });
  }

  async suspendListing(listingId: string, reason: string) {
    await this.firebase.update('listings', listingId, {
      status: ListingStatus.SUSPENDED,
    });

    await this.firebase.create('audit_logs', {
      actorId: 'admin',
      action: 'suspend_listing',
      targetType: 'listing',
      targetId: listingId,
      metadata: { reason },
    });
  }

  async approveKYC(userId: string) {
    await this.firebase.update('users', userId, {
      kycStatus: KYCStatus.APPROVED,
    });

    await this.firebase.create('audit_logs', {
      actorId: 'admin',
      action: 'approve_kyc',
      targetType: 'user',
      targetId: userId,
      metadata: {},
    });
  }

  async rejectKYC(userId: string, reason: string) {
    await this.firebase.update('users', userId, {
      kycStatus: KYCStatus.REJECTED,
    });

    await this.firebase.create('audit_logs', {
      actorId: 'admin',
      action: 'reject_kyc',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
    });
  }

  async getPendingReports() {
    return this.firebase.query('reports', [
      { field: 'status', op: 'in', value: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW] },
    ]);
  }

  async resolveReport(reportId: string, resolution: string) {
    await this.firebase.update('reports', reportId, {
      status: ReportStatus.RESOLVED,
      resolution,
      reviewedAt: new Date(),
    });
  }

  async dismissReport(reportId: string, reason: string) {
    await this.firebase.update('reports', reportId, {
      status: ReportStatus.DISMISSED,
      resolution: reason,
      reviewedAt: new Date(),
    });
  }

  async getAuditLogs(limit: number = 100) {
    return this.firebase.query(
      'audit_logs',
      [],
      { field: 'createdAt', direction: 'desc' },
      limit,
    );
  }

  async getAllUsers() {
    const users = await this.firebase.query('users', []);
    // Remove sensitive data
    return users.map((user) => {
      const { passwordHash, refreshTokenHash, ...publicUser } = user as any;
      return publicUser;
    });
  }

  async suspendUser(userId: string, reason: string) {
    await this.firebase.update('users', userId, {
      suspended: true,
      suspensionReason: reason,
    });

    await this.firebase.create('audit_logs', {
      actorId: 'admin',
      action: 'suspend_user',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
    });
  }
}


