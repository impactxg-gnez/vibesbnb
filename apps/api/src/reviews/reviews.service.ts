import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { BookingsService } from '../bookings/bookings.service';
import { Review, ReviewStats, BookingStatus } from '@vibesbnb/shared';

@Injectable()
export class ReviewsService {
  constructor(
    private firebase: FirebaseService,
    private bookingsService: BookingsService,
  ) {}

  async create(
    authorId: string,
    bookingId: string,
    rating: number,
    comment: string,
    categories?: {
      cleanliness?: number;
      communication?: number;
      checkIn?: number;
      accuracy?: number;
      location?: number;
      value?: number;
    },
  ): Promise<Review> {
    // Validate booking
    const booking = await this.bookingsService.findById(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Only allow reviews after checkout
    if (booking.status !== BookingStatus.CHECKED_OUT) {
      throw new BadRequestException('Can only review after checkout');
    }

    // Check if user is part of the booking
    if (booking.guestId !== authorId && booking.hostId !== authorId) {
      throw new ForbiddenException('Not authorized');
    }

    // Check if already reviewed
    const existingReviews = await this.firebase.query('reviews', [
      { field: 'bookingId', op: '==', value: bookingId },
      { field: 'authorId', op: '==', value: authorId },
    ]);

    if (existingReviews.length > 0) {
      throw new BadRequestException('Already reviewed');
    }

    const targetUserId = authorId === booking.guestId ? booking.hostId : booking.guestId;
    const targetType = authorId === booking.guestId ? 'host' : 'guest';

    const reviewId = await this.firebase.create('reviews', {
      bookingId,
      authorId,
      targetUserId,
      targetType,
      rating,
      comment,
      categories: categories || {},
    });

    return this.firebase.get('reviews', reviewId);
  }

  async addResponse(reviewId: string, userId: string, body: string): Promise<Review> {
    const review = await this.firebase.get('reviews', reviewId);
    if (!review) {
      throw new BadRequestException('Review not found');
    }

    if (review.targetUserId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (review.response) {
      throw new BadRequestException('Already responded');
    }

    await this.firebase.update('reviews', reviewId, {
      response: {
        body,
        respondedAt: new Date(),
      },
    });

    return this.firebase.get('reviews', reviewId);
  }

  async getReviewsForUser(userId: string): Promise<Review[]> {
    return this.firebase.query('reviews', [
      { field: 'targetUserId', op: '==', value: userId },
    ]);
  }

  async getReviewsForListing(listingId: string): Promise<Review[]> {
    // Get all bookings for this listing
    const bookings = await this.firebase.query('bookings', [
      { field: 'listingId', op: '==', value: listingId },
    ]);

    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length === 0) return [];

    // Get reviews for these bookings
    const reviews: Review[] = [];
    for (const bookingId of bookingIds) {
      const bookingReviews = await this.firebase.query('reviews', [
        { field: 'bookingId', op: '==', value: bookingId },
        { field: 'targetType', op: '==', value: 'host' }, // Only host reviews (for the listing)
      ]);
      reviews.push(...bookingReviews);
    }

    return reviews;
  }

  async getReviewStats(userId: string): Promise<ReviewStats> {
    const reviews = await this.getReviewsForUser(userId);
    
    if (reviews.length === 0) {
      return {
        userId,
        averageRating: 0,
        totalReviews: 0,
        categoryAverages: {
          cleanliness: 0,
          communication: 0,
          checkIn: 0,
          accuracy: 0,
          location: 0,
          value: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const categoryTotals = {
      cleanliness: 0,
      communication: 0,
      checkIn: 0,
      accuracy: 0,
      location: 0,
      value: 0,
    };

    const categoryCounts = {
      cleanliness: 0,
      communication: 0,
      checkIn: 0,
      accuracy: 0,
      location: 0,
      value: 0,
    };

    reviews.forEach((review) => {
      if (review.categories) {
        Object.entries(review.categories).forEach(([key, value]) => {
          if (value && categoryTotals[key] !== undefined) {
            categoryTotals[key] += value as number;
            categoryCounts[key]++;
          }
        });
      }
    });

    const categoryAverages = {
      cleanliness: categoryCounts.cleanliness > 0 ? categoryTotals.cleanliness / categoryCounts.cleanliness : 0,
      communication: categoryCounts.communication > 0 ? categoryTotals.communication / categoryCounts.communication : 0,
      checkIn: categoryCounts.checkIn > 0 ? categoryTotals.checkIn / categoryCounts.checkIn : 0,
      accuracy: categoryCounts.accuracy > 0 ? categoryTotals.accuracy / categoryCounts.accuracy : 0,
      location: categoryCounts.location > 0 ? categoryTotals.location / categoryCounts.location : 0,
      value: categoryCounts.value > 0 ? categoryTotals.value / categoryCounts.value : 0,
    };

    return {
      userId,
      averageRating,
      totalReviews: reviews.length,
      categoryAverages,
    };
  }
}


