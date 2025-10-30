import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@vibesbnb/shared';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform metrics' })
  async getMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getMetrics(
      new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now()),
    );
  }

  @Get('kyc/pending')
  @ApiOperation({ summary: 'Get pending KYC verifications' })
  async getPendingKYC() {
    return this.adminService.getPendingKYC();
  }

  @Post('kyc/:userId/approve')
  @ApiOperation({ summary: 'Approve KYC' })
  async approveKYC(@Param('userId') userId: string) {
    await this.adminService.approveKYC(userId);
    return { message: 'KYC approved' };
  }

  @Post('kyc/:userId/reject')
  @ApiOperation({ summary: 'Reject KYC' })
  async rejectKYC(@Param('userId') userId: string, @Body() data: { reason: string }) {
    await this.adminService.rejectKYC(userId, data.reason);
    return { message: 'KYC rejected' };
  }

  @Get('listings/pending')
  @ApiOperation({ summary: 'Get pending listings' })
  async getPendingListings() {
    return this.adminService.getPendingListings();
  }

  @Post('listings/:id/approve')
  @ApiOperation({ summary: 'Approve listing' })
  async approveListing(@Param('id') id: string) {
    await this.adminService.approveListing(id);
    return { message: 'Listing approved' };
  }

  @Post('listings/:id/suspend')
  @ApiOperation({ summary: 'Suspend listing' })
  async suspendListing(@Param('id') id: string, @Body() data: { reason: string }) {
    await this.adminService.suspendListing(id, data.reason);
    return { message: 'Listing suspended' };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get pending reports' })
  async getReports() {
    return this.adminService.getPendingReports();
  }

  @Put('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve report' })
  async resolveReport(@Param('id') id: string, @Body() data: { resolution: string }) {
    await this.adminService.resolveReport(id, data.resolution);
    return { message: 'Report resolved' };
  }

  @Put('reports/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss report' })
  async dismissReport(@Param('id') id: string, @Body() data: { reason: string }) {
    await this.adminService.dismissReport(id, data.reason);
    return { message: 'Report dismissed' };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit ? parseInt(limit as any) : 100);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  async suspendUser(@Param('id') id: string, @Body() data: { reason: string }) {
    await this.adminService.suspendUser(id, data.reason);
    return { message: 'User suspended' };
  }
}


