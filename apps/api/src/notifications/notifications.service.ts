import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationType } from '@vibesbnb/shared';

@Injectable()
export class NotificationsService {
  private twilioClient: Twilio;
  private fromPhone: string;
  private fromEmail: string;

  constructor(private firebase: FirebaseService) {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    }

    this.fromPhone = process.env.TWILIO_FROM_PHONE || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@vibesbnb.com';
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log(`[DEV] Email to ${to}: ${subject}`);
      return;
    }

    try {
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      console.log(`[DEV] SMS to ${to}: ${message}`);
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhone,
        to,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
    }
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.firebase.create('notifications', {
      userId,
      type,
      title,
      body,
      data,
      read: false,
    });
  }

  async sendBookingConfirmation(
    guestEmail: string,
    bookingId: string,
    listingTitle: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<void> {
    const subject = 'Booking Confirmed - VibesBNB';
    const html = `
      <h1>Your booking is confirmed!</h1>
      <p>Booking ID: ${bookingId}</p>
      <p>Property: ${listingTitle}</p>
      <p>Check-in: ${checkIn.toLocaleDateString()}</p>
      <p>Check-out: ${checkOut.toLocaleDateString()}</p>
      <p>We look forward to hosting you!</p>
    `;
    await this.sendEmail(guestEmail, subject, html);
  }

  async sendBookingRequest(
    hostEmail: string,
    bookingId: string,
    guestName: string,
    listingTitle: string,
  ): Promise<void> {
    const subject = 'New Booking Request - VibesBNB';
    const html = `
      <h1>You have a new booking request!</h1>
      <p>Guest: ${guestName}</p>
      <p>Property: ${listingTitle}</p>
      <p>Booking ID: ${bookingId}</p>
      <p>Please review and respond to the request.</p>
    `;
    await this.sendEmail(hostEmail, subject, html);
  }

  async sendPayoutNotification(
    hostEmail: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    const subject = 'Payout Sent - VibesBNB';
    const html = `
      <h1>Your payout has been sent!</h1>
      <p>Amount: ${(amount / 100).toFixed(2)} ${currency}</p>
      <p>It should arrive in your account within 2-3 business days.</p>
    `;
    await this.sendEmail(hostEmail, subject, html);
  }
}


