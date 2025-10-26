import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review' })
  async create(
    @CurrentUser() user: any,
    @Body() data: {
      bookingId: string;
      rating: number;
      comment: string;
      categories?: any;
    },
  ) {
    return this.reviewsService.create(
      user.userId,
      data.bookingId,
      data.rating,
      data.comment,
      data.categories,
    );
  }

  @Post(':id/response')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add response to review' })
  async addResponse(
    @Param('id') reviewId: string,
    @CurrentUser() user: any,
    @Body() data: { body: string },
  ) {
    return this.reviewsService.addResponse(reviewId, user.userId, data.body);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for user' })
  async getForUser(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsForUser(userId);
  }

  @Get('user/:userId/stats')
  @ApiOperation({ summary: 'Get review stats for user' })
  async getStats(@Param('userId') userId: string) {
    return this.reviewsService.getReviewStats(userId);
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get reviews for listing' })
  async getForListing(@Param('listingId') listingId: string) {
    return this.reviewsService.getReviewsForListing(listingId);
  }
}


