import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../firebase/firebase.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private usersService: UsersService,
    private firebase: FirebaseService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return {
      clientSecret: paymentIntent.client_secret || '',
      paymentIntentId: paymentIntent.id,
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === 'succeeded';
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<string> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount) : undefined,
      reason: reason as any,
    });

    return refund.id;
  }

  async createConnectAccount(userId: string, email: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await this.usersService.setStripeConnectId(userId, account.id);
    return account.id;
  }

  async createConnectAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<string> {
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  async getConnectAccountStatus(accountId: string): Promise<{
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }> {
    const account = await this.stripe.accounts.retrieve(accountId);
    
    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  async createTransfer(
    hostStripeAccountId: string,
    amount: number,
    currency: string,
    bookingId: string,
  ): Promise<string> {
    const payoutId = await this.firebase.create('payouts', {
      hostId: hostStripeAccountId,
      bookingId,
      amount,
      currency,
      status: 'processing',
    });

    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        destination: hostStripeAccountId,
        metadata: {
          bookingId,
          payoutId,
        },
      });

      await this.firebase.update('payouts', payoutId, {
        stripeTransferId: transfer.id,
        status: 'completed',
        completedAt: new Date(),
      });

      return transfer.id;
    } catch (error) {
      await this.firebase.update('payouts', payoutId, {
        status: 'failed',
        failureReason: error.message,
      });
      throw error;
    }
  }

  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'account.updated':
        await this.handleAccountUpdate(event.data.object as Stripe.Account);
        break;
      case 'transfer.created':
        console.log('Transfer created:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata.bookingId;
    if (bookingId) {
      await this.firebase.update('bookings', bookingId, {
        status: 'confirmed',
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata.bookingId;
    if (bookingId) {
      await this.firebase.update('bookings', bookingId, {
        status: 'declined',
      });
    }
  }

  private async handleAccountUpdate(account: Stripe.Account): Promise<void> {
    console.log('Account updated:', account.id);
    // Update user record if needed
  }
}


