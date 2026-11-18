import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, isSmtpConfigured, getDefaultFromEmail } from '@/lib/email/mailer';
import { hostApplicationApprovedEmailHtml } from '@/lib/email/hostApplicationApproved';
import { listingSavedEmailHtml, type ListingSavedContext } from '@/lib/email/listingSavedEmail';
import {
  travellerBookingInvoiceEmailHtml,
  hostBookingConfirmationEmailHtml,
  type BookingInvoiceContext,
} from '@/lib/email/bookingInvoiceEmail';



interface BookingRequestData {
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  bookingId: string;
  /** Host platform fee deducted from payout (amount). */
  hostFee?: number;
  /** Host fee percent of guest total (e.g. 5). */
  hostFeePercent?: number;
  /** Estimated host payout after host fee (optional). */
  hostPayout?: number;
}

interface BookingRequestSubmittedData {
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}

interface BookingConfirmationData {
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  bookingId: string;
  location?: string;
  payUrl?: string;
}

interface BookingRejectedData {
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
}

interface BookingCancelledData {
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}

interface BookingCancelledByHostData {
  propertyName: string;
  hostName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  bookingsUrl: string;
}

interface HostApplicationApprovedData {
  hostName: string;
  appUrl?: string;
}

interface NewMessageData {
  senderName: string;
  propertyName: string;
  messagePreview: string;
  inboxUrl: string;
  recipientName?: string;
}

interface AdminNewBookingData {
  bookingId: string;
  propertyName: string;
  hostName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  adminBookingUrl: string;
  recipientName?: string;
}

interface AdminNewChatData {
  conversationId: string;
  guestName: string;
  hostName?: string;
  propertyName?: string;
  messagePreview: string;
  createdAt: string;
  adminChatUrl: string;
  recipientName?: string;
}

interface BrokenIcalAlertData {
  propertyName: string;
  calendarName?: string;
  icalUrl: string;
  errorMessage: string;
  lastSyncedAt?: string;
  hostName?: string;
  fixUrl?: string;
  recipientName?: string;
}

interface AdminPaymentConfirmationData {
  bookingId: string;
  propertyName: string;
  hostName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  hostPayout?: number;
  platformFee?: number;
  adminBookingUrl?: string;
  recipientName?: string;
}

type EmailTemplateData =
  | BookingRequestData
  | BookingRequestSubmittedData
  | BookingConfirmationData
  | BookingRejectedData
  | BookingCancelledData
  | BookingCancelledByHostData
  | HostApplicationApprovedData
  | NewMessageData
  | AdminNewBookingData
  | AdminNewChatData
  | BrokenIcalAlertData
  | AdminPaymentConfirmationData
  | ListingSavedContext;

function generateEmailHtml(template: string, data: EmailTemplateData): string {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f8fafc;
  `;

  const cardStyles = `
    background-color: #ffffff;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  `;

  const buttonStyles = `
    display: inline-block;
    background-color: #059669;
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin-top: 16px;
  `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibesbnb.com';

  switch (template) {
    case 'booking_request': {
      const d = data as BookingRequestData;
      const hostFee =
        typeof d.hostFee === 'number' && Number.isFinite(d.hostFee) ? d.hostFee : null;
      const hostFeePercent =
        typeof d.hostFeePercent === 'number' && Number.isFinite(d.hostFeePercent)
          ? d.hostFeePercent
          : null;
      const hostPayout =
        typeof d.hostPayout === 'number' && Number.isFinite(d.hostPayout) ? d.hostPayout : null;
      const hostFeeLabel =
        hostFeePercent != null
          ? `Host service fee (${hostFeePercent}%)`
          : 'Host service fee';
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 24px;">🔔 New Booking Request</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              You have received a new booking request for your property.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Property</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${d.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Guest</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${d.guestName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${new Date(d.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Guests</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${d.guests}</td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0 8px; color: #6b7280;">Guest total</td>
                  <td style="padding: 12px 0 8px; color: #111827; font-weight: 600; text-align: right;">$${Number(d.totalPrice).toFixed(2)}</td>
                </tr>
                ${
                  hostFee != null
                    ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280;">${hostFeeLabel}</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">−$${hostFee.toFixed(2)}</td>
                </tr>`
                    : ''
                }
                ${
                  hostPayout != null
                    ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Your estimated payout</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 18px; text-align: right;">$${hostPayout.toFixed(2)}</td>
                </tr>`
                    : `<tr>
                  <td style="padding: 12px 0 8px; color: #6b7280; font-weight: 600;">Total</td>
                  <td style="padding: 12px 0 8px; color: #059669; font-weight: 700; font-size: 20px; text-align: right;">$${Number(d.totalPrice).toFixed(2)}</td>
                </tr>`
                }
              </table>
              ${
                hostFee != null
                  ? `<p style="color: #6b7280; font-size: 12px; margin: 12px 0 0;">
                The host service fee is deducted from your payout when the stay is completed. Guest total is what the traveller pays.
              </p>`
                  : ''
              }
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
              Please review and respond to this booking request as soon as possible.
            </p>
            <a href="${appUrl}/dashboard/bookings" style="${buttonStyles}">
              View Booking Request
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB. If you have questions, contact support.
          </p>
        </div>
      `;
    }

    case 'booking_request_submitted': {
      const d = data as BookingRequestSubmittedData;
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 24px;">Request sent</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              We have shared your dates and details with the host. They can reply in chat or approve your request.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Property</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${d.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${new Date(d.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
              You will receive another email when the host responds. You can also message them anytime from your inbox.
            </p>
            <a href="${appUrl}/bookings" style="${buttonStyles}">
              View request
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB. If you have questions, contact support.
          </p>
        </div>
      `;
    }

    case 'booking_accepted': {
      const d = data as BookingConfirmationData;
      const payHref =
        d.payUrl ||
        (d.bookingId
          ? `${appUrl.replace(/\/$/, '')}/bookings/pay/${encodeURIComponent(d.bookingId)}`
          : `${appUrl}/bookings`);
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 24px;">Host approved your stay</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              Great news — ${d.hostName} confirmed your dates. Complete payment to finalize your booking.
            </p>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Property</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.propertyName}</td>
                </tr>
                ${d.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Location</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.location}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Check-in</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Check-out</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${new Date(d.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Guests</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.guests}</td>
                </tr>
                <tr style="border-top: 1px solid #a7f3d0;">
                  <td style="padding: 12px 0 8px; color: #065f46; font-weight: 600;">Amount due</td>
                  <td style="padding: 12px 0 8px; color: #059669; font-weight: 700; font-size: 20px; text-align: right;">$${d.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            <a href="${payHref}" style="${buttonStyles}">
              Pay now &amp; confirm booking
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB. If you have questions, contact support.
          </p>
        </div>
      `;
    }

    case 'booking_confirmed': {
      const d = data as BookingConfirmationData;
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 24px;">✅ Booking Confirmed!</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              Great news! Your booking has been confirmed by the host.
            </p>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Property</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.propertyName}</td>
                </tr>
                ${d.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Location</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.location}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Host</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.hostName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Check-in</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Check-out</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${new Date(d.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #065f46;">Guests</td>
                  <td style="padding: 8px 0; color: #065f46; font-weight: 600; text-align: right;">${d.guests}</td>
                </tr>
                <tr style="border-top: 1px solid #a7f3d0;">
                  <td style="padding: 12px 0 8px; color: #065f46; font-weight: 600;">Total Paid</td>
                  <td style="padding: 12px 0 8px; color: #059669; font-weight: 700; font-size: 20px; text-align: right;">$${d.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
              You can view your booking details and contact the host through your dashboard.
            </p>
            <a href="${appUrl}/bookings" style="${buttonStyles}">
              View My Booking
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB. If you have questions, contact support.
          </p>
        </div>
      `;
    }

    case 'booking_rejected': {
      const d = data as BookingRejectedData;
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #dc2626; margin-bottom: 24px;">❌ Booking Not Approved</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              Unfortunately, the host was unable to accept your booking request.
            </p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #991b1b;">Property</td>
                  <td style="padding: 8px 0; color: #991b1b; font-weight: 600; text-align: right;">${d.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #991b1b;">Dates</td>
                  <td style="padding: 8px 0; color: #991b1b; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(d.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                ${
                  d.reason
                    ? `<tr>
                  <td style="padding: 8px 0; color: #991b1b; vertical-align: top;">Note</td>
                  <td style="padding: 8px 0; color: #991b1b; font-weight: 600; text-align: right;">${String(d.reason).replace(/</g, '&lt;')}</td>
                </tr>`
                    : ''
                }
              </table>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
              Don't worry! There are many other amazing properties available. Browse our listings to find your perfect stay.
            </p>
            <a href="${appUrl}/search" style="${buttonStyles}">
              Browse Properties
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB. If you have questions, contact support.
          </p>
        </div>
      `;
    }

    case 'booking_cancelled_by_host': {
      const d = data as BookingCancelledByHostData;
      const safeReason = String(d.reason || '').replace(/</g, '&lt;');
      const safeProperty = String(d.propertyName || 'your stay').replace(/</g, '&lt;');
      const safeHost = String(d.hostName || 'Your host').replace(/</g, '&lt;');
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #dc2626; margin-bottom: 24px;">Booking cancelled</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              Hi ${String(d.guestName || 'there').replace(/</g, '&lt;')}, <strong>${safeHost}</strong> cancelled your booking for <strong>${safeProperty}</strong>.
            </p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #991b1b; font-size: 13px; margin: 0 0 8px; font-weight: 600;">Reason from host</p>
              <p style="color: #7f1d1d; font-size: 15px; margin: 0; white-space: pre-wrap;">${safeReason}</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                  <td style="padding: 8px 0; color: #991b1b;">Check-in</td>
                  <td style="padding: 8px 0; color: #991b1b; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #991b1b;">Check-out</td>
                  <td style="padding: 8px 0; color: #991b1b; font-weight: 600; text-align: right;">${new Date(d.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
              You can browse other stays or message the host if you have questions.
            </p>
            <a href="${d.bookingsUrl || `${appUrl}/bookings`}" style="${buttonStyles}">
              View my bookings
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB.
          </p>
        </div>
      `;
    }

    case 'booking_cancelled': {
      const d = data as BookingCancelledData;
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #f59e0b; margin-bottom: 24px;">⚠️ Booking Cancelled</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              A booking for your property has been cancelled.
            </p>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #92400e;">Property</td>
                  <td style="padding: 8px 0; color: #92400e; font-weight: 600; text-align: right;">${d.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e;">Guest</td>
                  <td style="padding: 8px 0; color: #92400e; font-weight: 600; text-align: right;">${d.guestName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #92400e;">Dates</td>
                  <td style="padding: 8px 0; color: #92400e; font-weight: 600; text-align: right;">${new Date(d.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(d.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
              These dates are now available again for other guests to book.
            </p>
            <a href="${appUrl}/dashboard/bookings" style="${buttonStyles}">
              View Bookings
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This email was sent by VibesBnB. If you have questions, contact support.
          </p>
        </div>
      `;
    }

    case 'host_application_approved': {
      const d = data as HostApplicationApprovedData;
      return hostApplicationApprovedEmailHtml({
        hostName: d.hostName || 'there',
        appUrl: d.appUrl || appUrl,
      });
    }

    case 'listing_saved': {
      const d = data as ListingSavedContext;
      return listingSavedEmailHtml(d);
    }

    case 'booking_invoice_traveller': {
      const d = data as BookingInvoiceContext & { appUrl?: string };
      return travellerBookingInvoiceEmailHtml(d, d.appUrl || appUrl);
    }

    case 'booking_invoice_host': {
      const d = data as BookingInvoiceContext & { appUrl?: string };
      return hostBookingConfirmationEmailHtml(d, d.appUrl || appUrl);
    }

    case 'new_message': {
      const d = data as NewMessageData;
      const safePreview = String(d.messagePreview || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const safeSender = String(d.senderName || 'Someone').replace(/</g, '&lt;');
      const safeProperty = String(d.propertyName || 'your stay').replace(/</g, '&lt;');
      const greeting = d.recipientName ? `Hi ${String(d.recipientName).replace(/</g, '&lt;')},` : 'Hi,';
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 16px;">💬 New message</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              ${greeting} <strong>${safeSender}</strong> sent you a message about <strong>${safeProperty}</strong>.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #059669;">
              <p style="color: #374151; font-size: 15px; margin: 0; white-space: pre-wrap;">${safePreview}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
              Reply on VibesBNB to keep your booking protected.
            </p>
            <a href="${d.inboxUrl || `${appUrl}/messages`}" style="${buttonStyles}">
              Open conversation
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            You received this because you have an active conversation on VibesBNB.
          </p>
        </div>
      `;
    }

    case 'admin_new_booking': {
      const d = data as AdminNewBookingData;
      const esc = (v: unknown) =>
        String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      const fmtDate = (raw: string) => {
        try {
          return new Date(raw).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {
          return esc(raw);
        }
      };
      const amount =
        typeof d.totalPrice === 'number' && Number.isFinite(d.totalPrice)
          ? `$${d.totalPrice.toFixed(2)}`
          : esc(d.totalPrice);
      const greeting = d.recipientName ? `Hi ${esc(d.recipientName)},` : 'Hi,';
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 16px;">🛎 New booking request</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              ${greeting} a new booking was created on VibesBNB.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Booking ID</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right; font-family: monospace; font-size: 12px;">${esc(d.bookingId)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Property</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.propertyName)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Host</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.hostName)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Guest</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.guestName)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${fmtDate(d.checkIn)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${fmtDate(d.checkOut)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Guests</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.guests)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.status)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Payment</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.paymentStatus || 'pending')}</td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0 8px; color: #6b7280; font-weight: 600;">Amount</td>
                  <td style="padding: 12px 0 8px; color: #059669; font-weight: 700; font-size: 20px; text-align: right;">${amount}</td>
                </tr>
              </table>
            </div>
            <a href="${esc(d.adminBookingUrl || `${appUrl}/admin/reservations`)}" style="${buttonStyles}">
              Open in admin
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            Admin notification from VibesBNB.
          </p>
        </div>
      `;
    }

    case 'admin_new_chat': {
      const d = data as AdminNewChatData;
      const esc = (v: unknown) =>
        String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      const safePreview = esc(d.messagePreview || '').replace(/\n/g, '<br/>');
      let when = esc(d.createdAt);
      try {
        when = new Date(d.createdAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      } catch {
        /* keep raw */
      }
      const greeting = d.recipientName ? `Hi ${esc(d.recipientName)},` : 'Hi,';
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 16px;">💬 New conversation</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              ${greeting} a new chat thread was started on VibesBNB.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Conversation ID</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right; font-family: monospace; font-size: 12px;">${esc(d.conversationId)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Guest</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.guestName)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Host</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.hostName || '—')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Property</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.propertyName || '—')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Started</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${when}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #059669;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em;">Initial message</p>
              <p style="color: #374151; font-size: 15px; margin: 0;">${safePreview}</p>
            </div>
            <a href="${esc(d.adminChatUrl || `${appUrl}/admin/messages`)}" style="${buttonStyles}">
              Open in admin messages
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            Admin notification from VibesBNB. Sent only when a new thread is created.
          </p>
        </div>
      `;
    }

    case 'broken_ical_alert': {
      const d = data as BrokenIcalAlertData;
      const esc = (v: unknown) =>
        String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      const greeting = d.recipientName ? `Hi ${esc(d.recipientName)},` : 'Hello,';
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #dc2626; margin-bottom: 8px;">⚠️ Calendar Sync Alert</h1>
            <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
              ${greeting} An external calendar link for <strong>${esc(d.propertyName)}</strong> is broken or unreachable.
            </p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #991b1b; font-size: 14px; font-weight: 600; margin: 0 0 6px;">Sync Failure Details</p>
              <p style="color: #b91c1c; font-size: 14px; margin: 0; font-family: monospace;">${esc(d.errorMessage)}</p>
            </div>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Property</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.propertyName)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Calendar Source</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.calendarName || 'iCal')}</td>
                </tr>
                ${d.hostName ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Host</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.hostName)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Checked At</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.lastSyncedAt || new Date().toISOString())}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">iCal URL</td>
                  <td style="padding: 6px 0; color: #4b5563; word-break: break-all; text-align: right; font-family: monospace; font-size: 11px;">${esc(d.icalUrl)}</td>
                </tr>
              </table>
            </div>
            <p style="color: #4b5563; font-size: 14px; margin-bottom: 20px;">
              Please verify or update the calendar export link to prevent double-bookings and ensure availability is kept accurate.
            </p>
            <a href="${esc(d.fixUrl || `${appUrl}/admin/ical-sync`)}" style="${buttonStyles}; background-color: #dc2626;">
              Manage Calendar Sync
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            VibesBNB Calendar Health Monitor · Alert sent to host & admins.
          </p>
        </div>
      `;
    }

    case 'admin_payment_confirmation': {
      const d = data as AdminPaymentConfirmationData;
      const esc = (v: unknown) =>
        String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #059669; margin-bottom: 8px;">💳 Payment Received & Booking Confirmed</h1>
            <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
              A guest has completed payment and the reservation is confirmed.
            </p>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Booking ID: #${esc(d.bookingId)}</p>
              <p style="color: #047857; font-size: 14px; margin: 0;">
                <strong>${esc(d.guestName)}</strong> confirmed for <strong>${esc(d.propertyName)}</strong>
              </p>
            </div>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Dates</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.checkIn)} → ${esc(d.checkOut)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Total Paid by Guest</td>
                  <td style="padding: 6px 0; color: #059669; font-weight: 700; text-align: right;">$${Number(d.totalPrice || 0).toFixed(2)}</td>
                </tr>
                ${d.hostPayout != null ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Host Payout</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">$${Number(d.hostPayout || 0).toFixed(2)}</td>
                </tr>` : ''}
                ${d.platformFee != null ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Platform Fee</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">$${Number(d.platformFee || 0).toFixed(2)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Host</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.hostName)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Guest</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${esc(d.guestName)}</td>
                </tr>
              </table>
            </div>
            <a href="${esc(d.adminBookingUrl || `${appUrl}/admin/bookings`)}" style="${buttonStyles}">
              View Booking in Admin
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            Admin payment alert from VibesBNB.
          </p>
        </div>
      `;
    }

    default:
      return `
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <h1 style="color: #111827; margin-bottom: 24px;">VibesBnB Notification</h1>
            <p style="color: #374151; font-size: 16px;">
              ${JSON.stringify(data)}
            </p>
          </div>
        </div>
      `;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, template, data, cc } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Copies (e.g. admins on a host's listing confirmation) must never duplicate the recipient.
    const primary = String(to).trim().toLowerCase();
    const ccList = (Array.isArray(cc) ? cc : cc ? [cc] : [])
      .map((address: unknown) => String(address || '').trim().toLowerCase())
      .filter((address: string, index: number, all: string[]) =>
        address && address !== primary && all.indexOf(address) === index
      );

    // Log the email attempt
    console.log('[Email Notification] Attempting to send via in-repo mailer:', {
      to,
      cc: ccList,
      subject,
      template,
      smtpConfigured: isSmtpConfigured(),
    });

    // Generate email HTML based on template
    const html = generateEmailHtml(template || 'default', data || {});

    // Send email via Pure In-Repo Nodemailer
    const result = await sendEmail({
      to: [primary],
      cc: ccList.length > 0 ? ccList : undefined,
      subject,
      html,
    });

    if (!result.success) {
      console.error('[Email Notification] Send error:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[Email Notification] Result:', result);

    return NextResponse.json({ 
      success: true, 
      message: result.mocked ? 'Email logged (SMTP not configured)' : 'Email sent successfully via SMTP',
      emailId: result.messageId,
      mocked: result.mocked,
    });
  } catch (error: any) {
    console.error('[Email Notification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
