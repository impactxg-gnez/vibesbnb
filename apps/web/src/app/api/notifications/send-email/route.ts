import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface BookingRequestData {
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
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
}

interface BookingRejectedData {
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
}

interface BookingCancelledData {
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}

type EmailTemplateData = BookingRequestData | BookingConfirmationData | BookingRejectedData | BookingCancelledData;

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
                  <td style="padding: 12px 0 8px; color: #6b7280; font-weight: 600;">Total</td>
                  <td style="padding: 12px 0 8px; color: #059669; font-weight: 700; font-size: 20px; text-align: right;">$${d.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
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

    case 'booking_accepted':
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
    const { to, subject, template, data } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Log the email attempt
    console.log('[Email Notification] Attempting to send:', {
      to,
      subject,
      template,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });

    // Check if Resend is configured
    if (!resend) {
      console.warn('[Email Notification] RESEND_API_KEY not configured. Email not sent.');
      console.log('[Email Notification] Would have sent:', { to, subject, template, data });
      return NextResponse.json({ 
        success: false, 
        message: 'Email service not configured. Please set RESEND_API_KEY environment variable.',
        debug: { to, subject, template }
      });
    }

    // Generate email HTML based on template
    const html = generateEmailHtml(template || 'default', data || {});

    // Send email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'VibesBnB <noreply@vibesbnb.com>';
    
    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('[Email Notification] Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Email Notification] Email sent successfully:', emailData?.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      emailId: emailData?.id 
    });
  } catch (error: any) {
    console.error('[Email Notification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
