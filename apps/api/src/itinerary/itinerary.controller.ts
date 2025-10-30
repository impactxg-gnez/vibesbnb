import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateItineraryDto,
  CreateItineraryItemDto,
} from '@vibesbnb/shared';

@ApiTags('itinerary')
@Controller('itinerary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItineraryController {
  constructor(private itineraryService: ItineraryService) {}

  @Post()
  @ApiOperation({ summary: 'Create new itinerary' })
  async createItinerary(
    @CurrentUser() user: any,
    @Body() data: CreateItineraryDto,
  ) {
    return this.itineraryService.createItinerary(user.userId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all itineraries for current user' })
  async getMyItineraries(@CurrentUser() user: any) {
    return this.itineraryService.findByUserId(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get itinerary by ID' })
  async getItinerary(@Param('id') id: string) {
    return this.itineraryService.findById(id);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get itinerary by booking ID' })
  async getItineraryByBooking(@Param('bookingId') bookingId: string) {
    return this.itineraryService.findByBookingId(bookingId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update itinerary' })
  async updateItinerary(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    return this.itineraryService.updateItinerary(id, user.userId, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete itinerary' })
  async deleteItinerary(@Param('id') id: string, @CurrentUser() user: any) {
    await this.itineraryService.deleteItinerary(id, user.userId);
    return { message: 'Itinerary deleted' };
  }

  // Itinerary Items
  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to itinerary' })
  async addItem(
    @Param('id') itineraryId: string,
    @CurrentUser() user: any,
    @Body() data: CreateItineraryItemDto,
  ) {
    return this.itineraryService.addItineraryItem(itineraryId, user.userId, data);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get all items in itinerary' })
  async getItems(@Param('id') itineraryId: string) {
    return this.itineraryService.getItineraryItems(itineraryId);
  }

  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Update itinerary item' })
  async updateItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    return this.itineraryService.updateItineraryItem(itemId, user.userId, data);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Delete itinerary item' })
  async deleteItem(@Param('itemId') itemId: string, @CurrentUser() user: any) {
    await this.itineraryService.deleteItineraryItem(itemId, user.userId);
    return { message: 'Item deleted' };
  }

  // Discovery endpoints
  @Get('discover/dispensaries')
  @ApiOperation({ summary: 'Find nearby dispensaries' })
  async getNearbyDispensaries(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.itineraryService.getNearbyDispensaries(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : undefined,
    );
  }

  @Get('discover/restaurants')
  @ApiOperation({ summary: 'Find nearby restaurants' })
  async getNearbyRestaurants(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.itineraryService.getNearbyRestaurants(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : undefined,
    );
  }

  @Get('discover/activities')
  @ApiOperation({ summary: 'Find wellness activities' })
  async getWellnessActivities(
    @Query('city') city: string,
    @Query('state') state: string,
  ) {
    return this.itineraryService.getWellnessActivities(city, state);
  }
}

