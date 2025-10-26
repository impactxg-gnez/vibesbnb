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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, SearchFilters } from '@vibesbnb/shared';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'Search listings' })
  async search(@Query() filters: SearchFilters) {
    return this.listingsService.search(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  async getById(@Param('id') id: string) {
    return this.listingsService.findById(id);
  }

  @Get(':id/media')
  @ApiOperation({ summary: 'Get listing media' })
  async getMedia(@Param('id') id: string) {
    return this.listingsService.getMedia(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create listing' })
  async create(@CurrentUser() user: any, @Body() data: any) {
    return this.listingsService.create(user.userId, data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    return this.listingsService.update(id, user.userId, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.listingsService.delete(id, user.userId);
    return { message: 'Listing deleted' };
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish listing' })
  async publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.listingsService.publish(id, user.userId);
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload listing media' })
  async uploadMedia(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: any,
  ) {
    return this.listingsService.uploadMedia(id, user.userId, file.buffer);
  }
}


