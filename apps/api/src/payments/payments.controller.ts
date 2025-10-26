import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!req.rawBody) {
      throw new Error('Missing raw body');
    }
    await this.paymentsService.handleWebhook(signature, req.rawBody);
    return { received: true };
  }

  @Post('connect/account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Connect account' })
  async createConnectAccount(@CurrentUser() user: any) {
    const userRecord = await this.paymentsService['usersService'].findById(user.userId);
    if (!userRecord) {
      throw new Error('User not found');
    }
    const accountId = await this.paymentsService.createConnectAccount(
      user.userId,
      userRecord.email,
    );
    return { accountId };
  }

  @Post('connect/account-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Connect account link' })
  async createAccountLink(
    @CurrentUser() user: any,
    @Body() data: { returnUrl: string; refreshUrl: string },
  ) {
    const userRecord = await this.paymentsService['usersService'].findById(user.userId);
    if (!userRecord || !userRecord.stripeConnectId) {
      throw new Error('No Stripe Connect account found');
    }

    const url = await this.paymentsService.createConnectAccountLink(
      userRecord.stripeConnectId,
      data.returnUrl,
      data.refreshUrl,
    );

    return { url };
  }

  @Get('connect/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe Connect account status' })
  async getConnectStatus(@CurrentUser() user: any) {
    const userRecord = await this.paymentsService['usersService'].findById(user.userId);
    if (!userRecord || !userRecord.stripeConnectId) {
      return { connected: false };
    }

    const status = await this.paymentsService.getConnectAccountStatus(
      userRecord.stripeConnectId,
    );

    return {
      connected: true,
      ...status,
    };
  }
}


