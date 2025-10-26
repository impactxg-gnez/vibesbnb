import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ListingsService } from '../listings/listings.service';
import {
  Calendar,
  CalendarSource,
  AvailabilityBlock,
  PriceOverride,
  DateAvailability,
} from '@vibesbnb/shared';
import { addDays, dateRange, formatDate } from '@vibesbnb/shared';
import ical from 'ical-generator';
import * as nodeIcal from 'node-ical';
import axios from 'axios';
import { randomBytes } from 'crypto';

@Injectable()
export class CalendarService {
  constructor(
    private firebase: FirebaseService,
    private listingsService: ListingsService,
  ) {}

  async createCalendar(
    listingId: string,
    hostId: string,
    source: CalendarSource,
    icalUrl?: string,
  ): Promise<Calendar> {
    const listing = await this.listingsService.findById(listingId);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    const calendarId = await this.firebase.create('calendars', {
      listingId,
      source,
      icalUrl,
      icalExportToken: source === CalendarSource.INTERNAL ? randomBytes(32).toString('hex') : null,
      syncEnabled: true,
    });

    // If iCal URL provided, trigger initial sync
    if (icalUrl) {
      await this.syncICalCalendar(calendarId);
    }

    return this.firebase.get('calendars', calendarId);
  }

  async syncICalCalendar(calendarId: string): Promise<void> {
    const calendar = await this.firebase.get('calendars', calendarId);
    if (!calendar || !calendar.icalUrl) {
      throw new BadRequestException('Invalid calendar');
    }

    try {
      const response = await axios.get(calendar.icalUrl);
      const events = await nodeIcal.async.parseICS(response.data);

      // Remove old blocks from this calendar
      const oldBlocks = await this.firebase.query('availability_blocks', [
        { field: 'listingId', op: '==', value: calendar.listingId },
        { field: 'sourceId', op: '==', value: calendarId },
      ]);

      for (const block of oldBlocks) {
        await this.firebase.delete('availability_blocks', block.id);
      }

      // Create new blocks from iCal events
      for (const [, event] of Object.entries(events)) {
        if (event.type === 'VEVENT' && event.start && event.end) {
          await this.firebase.create('availability_blocks', {
            listingId: calendar.listingId,
            startDate: event.start,
            endDate: event.end,
            isAvailable: false,
            reason: 'ical_blocked',
            source: CalendarSource.ICAL,
            sourceId: calendarId,
          });
        }
      }

      await this.firebase.update('calendars', calendarId, {
        lastSyncAt: new Date(),
      });
    } catch (error) {
      console.error('iCal sync error:', error);
      throw new BadRequestException('Failed to sync iCal calendar');
    }
  }

  async exportICalCalendar(listingId: string, exportToken: string): Promise<string> {
    const calendars = await this.firebase.query('calendars', [
      { field: 'listingId', op: '==', value: listingId },
      { field: 'icalExportToken', op: '==', value: exportToken },
    ]);

    if (calendars.length === 0) {
      throw new BadRequestException('Invalid export token');
    }

    const listing = await this.listingsService.findById(listingId);
    
    if (!listing) {
      throw new Error('Listing not found');
    }
    
    const blocks = await this.firebase.query('availability_blocks', [
      { field: 'listingId', op: '==', value: listingId },
      { field: 'isAvailable', op: '==', value: false },
    ]);

    const calendar = ical({ name: listing.title });

    for (const block of blocks) {
      calendar.createEvent({
        start: block.startDate.toDate ? block.startDate.toDate() : new Date(block.startDate),
        end: block.endDate.toDate ? block.endDate.toDate() : new Date(block.endDate),
        summary: `Blocked - ${listing.title}`,
        description: block.reason || 'Unavailable',
      });
    }

    return calendar.toString();
  }

  async blockDates(
    listingId: string,
    hostId: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ): Promise<void> {
    const listing = await this.listingsService.findById(listingId);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    // Check for existing bookings
    const existingBookings = await this.firebase.query('bookings', [
      { field: 'listingId', op: '==', value: listingId },
      { field: 'status', op: 'in', value: ['confirmed', 'checked_in'] },
    ]);

    for (const booking of existingBookings) {
      const bookingStart = new Date(booking.checkIn);
      const bookingEnd = new Date(booking.checkOut);
      if (this.datesOverlap(startDate, endDate, bookingStart, bookingEnd)) {
        throw new BadRequestException('Cannot block dates with existing bookings');
      }
    }

    await this.firebase.create('availability_blocks', {
      listingId,
      startDate,
      endDate,
      isAvailable: false,
      reason: reason || 'host_blocked',
      source: CalendarSource.INTERNAL,
    });
  }

  async unblockDates(listingId: string, hostId: string, blockId: string): Promise<void> {
    const listing = await this.listingsService.findById(listingId);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    const block = await this.firebase.get('availability_blocks', blockId);
    if (!block || block.listingId !== listingId) {
      throw new BadRequestException('Block not found');
    }

    if (block.reason === 'booking') {
      throw new BadRequestException('Cannot unblock booking reservations');
    }

    await this.firebase.delete('availability_blocks', blockId);
  }

  async setPriceOverride(
    listingId: string,
    hostId: string,
    date: Date,
    nightlyPrice: number,
    reason?: string,
  ): Promise<PriceOverride> {
    const listing = await this.listingsService.findById(listingId);
    if (!listing || listing.hostId !== hostId) {
      throw new ForbiddenException('Not authorized');
    }

    const overrideId = await this.firebase.create('price_overrides', {
      listingId,
      date,
      nightlyPrice,
      reason,
    });

    return this.firebase.get('price_overrides', overrideId);
  }

  async getAvailability(
    listingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DateAvailability[]> {
    const listing = await this.listingsService.findById(listingId);
    if (!listing) {
      throw new BadRequestException('Listing not found');
    }

    const dates = dateRange(startDate, endDate);
    const blocks = await this.firebase.query('availability_blocks', [
      { field: 'listingId', op: '==', value: listingId },
    ]);

    const priceOverrides = await this.firebase.query('price_overrides', [
      { field: 'listingId', op: '==', value: listingId },
    ]);

    const priceMap = new Map();
    priceOverrides.forEach((override) => {
      const dateKey = formatDate(new Date(override.date));
      priceMap.set(dateKey, override.nightlyPrice);
    });

    return dates.map((date) => {
      const dateKey = formatDate(date);
      const price = priceMap.get(dateKey) || listing.basePrice;
      
      const isBlocked = blocks.some((block) => {
        const blockStart = new Date(block.startDate);
        const blockEnd = new Date(block.endDate);
        return !block.isAvailable && date >= blockStart && date < blockEnd;
      });

      return {
        date,
        available: !isBlocked,
        price,
        minNights: listing.minNights || 1,
      };
    });
  }

  async isAvailable(
    listingId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<boolean> {
    const availability = await this.getAvailability(listingId, checkIn, addDays(checkOut, -1));
    return availability.every((day) => day.available);
  }

  private datesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    return start1 < end2 && start2 < end1;
  }
}


