import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ListingsService } from '../listings/listings.service';
import { CalendarService } from '../calendar/calendar.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Booking,
  BookingStatus,
  CancellationPolicy,
  PayoutStatus,
  NotificationType,
} from '@vibesbnb/shared';
import { calculateBookingPrice, getDaysBetween, calculateRefundAmount } from '@vibesbnb/shared';

@Injectable()
export class BookingsService {
  constructor(
    private firebase: FirebaseService,
    private listingsService: ListingsService,
    private calendarService: CalendarService,
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    guestId: string,
    listingId: string,
    checkIn: Date,
    checkOut: Date,
    guests: number,
    specialRequests?: string,
  ): Promise<{ booking: Booking; paymentIntent: any }> {
    // Validate listing exists
    const listing = await this.listingsService.findById(listingId);
    if (!listing) {
      throw new BadRequestException('Listing not found');
    }

    // Validate dates
    if (checkIn >= checkOut) {
      throw new BadRequestException('Invalid dates');
    }

    const nights = getDaysBetween(checkIn, checkOut);
    if (nights < listing.minNights || nights > listing.maxNights) {
      throw new BadRequestException(`Stay must be between ${listing.minNights} and ${listing.maxNights} nights`);
    }

    // Validate guests
    if (guests > listing.maxGuests) {
      throw new BadRequestException(`Maximum ${listing.maxGuests} guests allowed`);
    }

    // Check availability
    const isAvailable = await this.calendarService.isAvailable(listingId, checkIn, checkOut);
    if (!isAvailable) {
      throw new BadRequestException('Dates not available');
    }

    // Calculate pricing
    const priceBreakdown = calculateBookingPrice(
      checkIn,
      checkOut,
      listing.basePrice,
      listing.cleaningFee,
    );

    // Create booking
    const bookingId = await this.firebase.create('bookings', {
      listingId,
      guestId,
      hostId: listing.hostId,
      checkIn,
      checkOut,
      guests,
      status: listing.instantBook ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      subtotal: priceBreakdown.subtotal,
      cleaningFee: priceBreakdown.cleaningFee,
      serviceFee: priceBreakdown.serviceFee,
      taxes: priceBreakdown.taxes,
      total: priceBreakdown.total,
      currency: priceBreakdown.currency,
      payoutStatus: PayoutStatus.PENDING,
      cancellationPolicy: CancellationPolicy.MODERATE, // Default
      specialRequests,
    });

    // TODO: Create payment intent when Stripe is configured
    let paymentIntent: { clientSecret: string; paymentIntentId: string } | null = null;
    try {
      if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('dummy')) {
        paymentIntent = await this.paymentsService.createPaymentIntent(
          priceBreakdown.total,
          priceBreakdown.currency,
          {
            bookingId,
            guestId,
            hostId: listing.hostId,
            listingId,
          },
        );

        // Update booking with payment intent
        if (paymentIntent) {
          await this.firebase.update('bookings', bookingId, {
            paymentIntentId: paymentIntent.paymentIntentId,
          });
        }
      }
    } catch (error) {
      console.error('Payment intent creation failed (Stripe not configured):', error.message);
      // Continue without payment - for demo purposes
    }

    const booking = await this.findById(bookingId);
    if (!booking) {
      throw new Error('Failed to create booking');
    }

    return { booking, paymentIntent };
  }

  async confirmBooking(bookingId: string): Promise<Booking> {
    const booking = await this.findById(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Verify payment was successful
    if (!booking.paymentIntentId) {
      throw new BadRequestException('Payment intent not found');
    }
    
    const paymentConfirmed = await this.paymentsService.confirmPayment(
      booking.paymentIntentId,
    );
    if (!paymentConfirmed) {
      throw new BadRequestException('Payment not confirmed');
    }

    // Double-check availability
    const isAvailable = await this.calendarService.isAvailable(
      booking.listingId,
      new Date(booking.checkIn),
      new Date(booking.checkOut),
    );
    if (!isAvailable) {
      // Refund payment
      if (booking.paymentIntentId) {
        await this.paymentsService.refundPayment(booking.paymentIntentId);
      }
      throw new BadRequestException('Listing no longer available');
    }

    // Block dates in calendar
    await this.firebase.create('availability_blocks', {
      listingId: booking.listingId,
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      isAvailable: false,
      reason: 'booking',
      source: 'internal',
      sourceId: bookingId,
    });

    // Update booking status
    const newStatus = await this.firebase.get('listings', booking.listingId).then(listing => 
      listing.instantBook ? BookingStatus.CONFIRMED : BookingStatus.PENDING
    );

    await this.firebase.update('bookings', bookingId, {
      status: newStatus,
    });

    // Send notifications
    const listing = await this.listingsService.findById(booking.listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    
    const guest = await this.firebase.get('users', booking.guestId);
    const host = await this.firebase.get('users', booking.hostId);

    if (newStatus === BookingStatus.CONFIRMED) {
      await this.notificationsService.sendBookingConfirmation(
        guest.email,
        bookingId,
        listing.title,
        new Date(booking.checkIn),
        new Date(booking.checkOut),
      );
    } else {
      await this.notificationsService.sendBookingRequest(
        host.email,
        bookingId,
        guest.name,
        listing.title,
      );
    }

    await this.notificationsService.createNotification(
      booking.hostId,
      NotificationType.BOOKING_REQUEST,
      'New Booking Request',
      `${guest.name} wants to book ${listing.title}`,
      { bookingId },
    );

    const confirmedBooking = await this.findById(bookingId);
    if (!confirmedBooking) {
      throw new Error('Failed to confirm booking');
    }
    return confirmedBooking;
  }

  async acceptBooking(bookingId: string, hostId: string): Promise<Booking> {
    const booking = await this.findById(bookingId);
    if (!booking || booking.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking not pending');
    }

    await this.firebase.update('bookings', bookingId, {
      status: BookingStatus.CONFIRMED,
    });

    const guest = await this.firebase.get('users', booking.guestId);
    const listing = await this.listingsService.findById(booking.listingId);
    
    if (!listing) {
      throw new Error('Listing not found');
    }

    await this.notificationsService.sendBookingConfirmation(
      guest.email,
      bookingId,
      listing.title,
      new Date(booking.checkIn),
      new Date(booking.checkOut),
    );

    await this.notificationsService.createNotification(
      booking.guestId,
      NotificationType.BOOKING_CONFIRMED,
      'Booking Confirmed',
      `Your booking for ${listing.title} has been confirmed!`,
      { bookingId },
    );

    const confirmedBooking = await this.findById(bookingId);
    if (!confirmedBooking) {
      throw new Error('Failed to confirm booking');
    }
    return confirmedBooking;
  }

  async declineBooking(bookingId: string, hostId: string, reason?: string): Promise<void> {
    const booking = await this.findById(bookingId);
    if (!booking || booking.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking not pending');
    }

    // Refund guest
    if (booking.paymentIntentId) {
      await this.paymentsService.refundPayment(booking.paymentIntentId, undefined, 'requested_by_customer');
    }

    await this.firebase.update('bookings', bookingId, {
      status: BookingStatus.DECLINED,
    });

    // Unblock dates
    const blocks = await this.firebase.query('availability_blocks', [
      { field: 'sourceId', op: '==', value: bookingId },
    ]);
    for (const block of blocks) {
      await this.firebase.delete('availability_blocks', block.id);
    }

    const guest = await this.firebase.get('users', booking.guestId);
    const listing = await this.listingsService.findById(booking.listingId);
    
    if (!listing) {
      throw new Error('Listing not found');
    }

    await this.notificationsService.createNotification(
      booking.guestId,
      NotificationType.BOOKING_DECLINED,
      'Booking Declined',
      `Your booking for ${listing.title} was declined`,
      { bookingId, reason },
    );
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<void> {
    const booking = await this.findById(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.guestId !== userId && booking.hostId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (![BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status)) {
      throw new BadRequestException('Cannot cancel booking');
    }

    // Calculate refund amount
    const daysUntilCheckIn = getDaysBetween(new Date(), new Date(booking.checkIn));
    const refundAmount = calculateRefundAmount(
      booking.total,
      daysUntilCheckIn,
      booking.cancellationPolicy,
    );

    if (refundAmount > 0 && booking.paymentIntentId) {
      await this.paymentsService.refundPayment(
        booking.paymentIntentId,
        refundAmount,
        'requested_by_customer',
      );
    }

    await this.firebase.update('bookings', bookingId, {
      status: BookingStatus.CANCELED,
    });

    // Unblock dates
    const blocks = await this.firebase.query('availability_blocks', [
      { field: 'sourceId', op: '==', value: bookingId },
    ]);
    for (const block of blocks) {
      await this.firebase.delete('availability_blocks', block.id);
    }

    const notifyUserId = userId === booking.guestId ? booking.hostId : booking.guestId;
    await this.notificationsService.createNotification(
      notifyUserId,
      NotificationType.BOOKING_CANCELED,
      'Booking Canceled',
      `Booking ${bookingId} was canceled`,
      { bookingId, refundAmount },
    );
  }

  async findById(id: string): Promise<Booking | null> {
    return this.firebase.get('bookings', id);
  }

  async getGuestBookings(guestId: string): Promise<Booking[]> {
    return this.firebase.query('bookings', [
      { field: 'guestId', op: '==', value: guestId },
    ]);
  }

  async getHostBookings(hostId: string): Promise<Booking[]> {
    return this.firebase.query('bookings', [
      { field: 'hostId', op: '==', value: hostId },
    ]);
  }

  async processPayout(bookingId: string): Promise<void> {
    const booking = await this.findById(bookingId);
    if (!booking || booking.status !== BookingStatus.CHECKED_OUT) {
      return;
    }

    if (booking.payoutStatus !== PayoutStatus.PENDING) {
      return;
    }

    const host = await this.firebase.get('users', booking.hostId);
    if (!host.stripeConnectId) {
      console.error(`Host ${booking.hostId} has no Stripe Connect account`);
      return;
    }

    // Calculate host payout (subtract platform fee)
    const platformFee = Math.round(booking.subtotal * 0.1); // 10% fee
    const hostPayout = booking.subtotal + booking.cleaningFee - platformFee;

    try {
      await this.paymentsService.createTransfer(
        host.stripeConnectId,
        hostPayout,
        booking.currency,
        bookingId,
      );

      await this.firebase.update('bookings', bookingId, {
        payoutStatus: PayoutStatus.COMPLETED,
      });

      await this.notificationsService.sendPayoutNotification(
        host.email,
        hostPayout,
        booking.currency,
      );

      await this.notificationsService.createNotification(
        booking.hostId,
        NotificationType.PAYOUT_SENT,
        'Payout Sent',
        `Your payout of ${(hostPayout / 100).toFixed(2)} ${booking.currency} has been sent`,
        { bookingId },
      );
    } catch (error) {
      console.error('Payout failed:', error);
      await this.firebase.update('bookings', bookingId, {
        payoutStatus: PayoutStatus.FAILED,
      });
    }
  }
}


