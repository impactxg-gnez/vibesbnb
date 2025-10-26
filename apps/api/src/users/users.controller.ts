import { Controller, Get, Put, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findById(user.userId);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUserProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('me/profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateCurrentUserProfile(
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    await this.usersService.updateProfile(user.userId, data);
    return this.usersService.getProfile(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (user) {
      // Don't expose sensitive data
      const { passwordHash, refreshTokenHash, ...publicUser } = user as any;
      return publicUser;
    }
    return null;
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get user profile by user ID' })
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}


