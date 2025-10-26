import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create booking' })
  async create(
    @CurrentUser() user: any,
    @Body() data: {
      listingId: string;
      checkIn: string;
      checkOut: string;
      guests: number;
      specialRequests?: string;
    },
  ) {
    return this.bookingsService.create(
      user.userId,
      data.listingId,
      new Date(data.checkIn),
      new Date(data.checkOut),
      data.guests,
      data.specialRequests,
    );
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking after payment' })
  async confirm(@Param('id') id: string) {
    return this.bookingsService.confirmBooking(id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept booking (host)' })
  async accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.acceptBooking(id, user.userId);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline booking (host)' })
  async decline(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: { reason?: string },
  ) {
    await this.bookingsService.declineBooking(id, user.userId, data.reason);
    return { message: 'Booking declined' };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: { reason?: string },
  ) {
    await this.bookingsService.cancelBooking(id, user.userId, data.reason);
    return { message: 'Booking canceled' };
  }

  @Get('guest')
  @ApiOperation({ summary: 'Get guest bookings' })
  async getGuestBookings(@CurrentUser() user: any) {
    return this.bookingsService.getGuestBookings(user.userId);
  }

  @Get('host')
  @ApiOperation({ summary: 'Get host bookings' })
  async getHostBookings(@CurrentUser() user: any) {
    return this.bookingsService.getHostBookings(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async getById(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }
}


