import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CalendarSource } from '@vibesbnb/shared';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('listings/:id/availability')
  @ApiOperation({ summary: 'Get listing availability' })
  async getAvailability(
    @Param('id') listingId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.calendarService.getAvailability(
      listingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('listings/:id/export/:token')
  @ApiOperation({ summary: 'Export listing calendar as iCal' })
  async exportCalendar(
    @Param('id') listingId: string,
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const icalData = await this.calendarService.exportICalCalendar(listingId, token);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="listing-${listingId}.ics"`);
    res.send(icalData);
  }

  @Post('listings/:id/calendars')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add external calendar' })
  async addCalendar(
    @Param('id') listingId: string,
    @CurrentUser() user: any,
    @Body() data: { icalUrl: string },
  ) {
    return this.calendarService.createCalendar(
      listingId,
      user.userId,
      CalendarSource.ICAL,
      data.icalUrl,
    );
  }

  @Post('calendars/:id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync external calendar' })
  async syncCalendar(@Param('id') calendarId: string) {
    await this.calendarService.syncICalCalendar(calendarId);
    return { message: 'Calendar synced' };
  }

  @Post('listings/:id/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block dates' })
  async blockDates(
    @Param('id') listingId: string,
    @CurrentUser() user: any,
    @Body() data: { startDate: string; endDate: string; reason?: string },
  ) {
    await this.calendarService.blockDates(
      listingId,
      user.userId,
      new Date(data.startDate),
      new Date(data.endDate),
      data.reason,
    );
    return { message: 'Dates blocked' };
  }

  @Delete('blocks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock dates' })
  async unblockDates(
    @Param('id') blockId: string,
    @Query('listingId') listingId: string,
    @CurrentUser() user: any,
  ) {
    await this.calendarService.unblockDates(listingId, user.userId, blockId);
    return { message: 'Dates unblocked' };
  }

  @Post('listings/:id/price-override')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set price override' })
  async setPriceOverride(
    @Param('id') listingId: string,
    @CurrentUser() user: any,
    @Body() data: { date: string; nightlyPrice: number; reason?: string },
  ) {
    return this.calendarService.setPriceOverride(
      listingId,
      user.userId,
      new Date(data.date),
      data.nightlyPrice,
      data.reason,
    );
  }
}


