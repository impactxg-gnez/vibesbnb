import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate KYC verification' })
  async initiateKYC(@CurrentUser() user: any) {
    return this.kycService.initiateKYC(user.userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC status' })
  async getStatus(@CurrentUser() user: any) {
    const status = await this.kycService.getKYCStatus(user.userId);
    return { status };
  }

  @Post('webhook/veriff')
  @ApiOperation({ summary: 'Veriff webhook' })
  async veriffWebhook(@Body() data: any) {
    await this.kycService.handleWebhook('veriff', data);
    return { received: true };
  }

  @Post('webhook/jumio')
  @ApiOperation({ summary: 'Jumio webhook' })
  async jumioWebhook(@Body() data: any) {
    await this.kycService.handleWebhook('jumio', data);
    return { received: true };
  }
}


