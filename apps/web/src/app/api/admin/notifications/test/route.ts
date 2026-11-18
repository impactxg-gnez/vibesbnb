import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/auth/authenticateAdminRequest';
import { verifySmtpConnection, isSmtpConfigured, sendEmail } from '@/lib/email/mailer';
import { listActiveAdminRecipients, sendEmailViaExistingEndpoint } from '@/lib/notifications/listActiveAdmins';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminRequest(request);
    if ('response' in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const type = String(body.type || 'test_smtp');
    const targetEmail = body.targetEmail ? String(body.targetEmail).trim().toLowerCase() : null;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin);
    const base = appUrl.replace(/\/$/, '');

    const service = createServiceClient();
    const adminRecipients = await listActiveAdminRecipients(service);
    const adminEmails = adminRecipients.map((a) => a.email);

    // 1. SMTP Handshake Verification
    if (type === 'test_smtp') {
      const verifyResult = await verifySmtpConnection();
      return NextResponse.json({
        ok: verifyResult.ok,
        smtpConfigured: isSmtpConfigured(),
        message: verifyResult.message,
        adminRecipients: adminEmails,
      });
    }

    const testHostEmail = targetEmail || 'host-sample@vibesbnb.com';
    const testGuestName = 'Jordan Smith (Test Guest)';
    const testPropertyName = 'Serene Palms Sanctuary (Test Villa)';

    // 2. New Booking Notification Test
    if (type === 'new_booking') {
      const sentTo: string[] = [];

      // Host email
      await sendEmailViaExistingEndpoint(base, {
        to: testHostEmail,
        subject: `[TEST] New Booking Request: ${testPropertyName}`,
        template: 'booking_request',
        data: {
          propertyName: testPropertyName,
          guestName: testGuestName,
          checkIn: '2026-12-01',
          checkOut: '2026-12-07',
          guests: 2,
          totalPrice: 1450,
          bookingId: 'test-booking-12345',
          hostFee: 72.5,
          hostFeePercent: 5,
          hostPayout: 1377.5,
        },
      });
      sentTo.push(testHostEmail);

      // Admin emails
      const adminTargets = targetEmail ? [targetEmail] : adminEmails;
      for (const email of adminTargets) {
        await sendEmailViaExistingEndpoint(base, {
          to: email,
          subject: `[TEST] [Admin] New Booking Alert: ${testPropertyName}`,
          template: 'admin_new_booking',
          data: {
            bookingId: 'test-booking-12345',
            propertyName: testPropertyName,
            hostName: 'Elena Rostova (Test Host)',
            guestName: testGuestName,
            checkIn: '2026-12-01',
            checkOut: '2026-12-07',
            guests: 2,
            totalPrice: 1450,
            status: 'confirmed',
            paymentStatus: 'paid',
            adminBookingUrl: `${base}/admin/bookings`,
            recipientName: email.split('@')[0],
          },
        });
        sentTo.push(email);
      }

      return NextResponse.json({
        ok: true,
        type,
        smtpConfigured: isSmtpConfigured(),
        sentTo,
        message: 'New booking test notifications dispatched.',
      });
    }

    // 3. New Message Enquiry Test
    if (type === 'new_message') {
      const sentTo: string[] = [];

      // Host email
      await sendEmailViaExistingEndpoint(base, {
        to: testHostEmail,
        subject: `[TEST] New enquiry from ${testGuestName} — ${testPropertyName}`,
        template: 'new_message',
        data: {
          senderName: testGuestName,
          propertyName: testPropertyName,
          messagePreview: 'Hi! Is late check-out available for our booking next month?',
          inboxUrl: `${base}/host/messages`,
          recipientName: 'Elena Rostova',
        },
      });
      sentTo.push(testHostEmail);

      // Admin emails
      const adminTargets = targetEmail ? [targetEmail] : adminEmails;
      for (const email of adminTargets) {
        await sendEmailViaExistingEndpoint(base, {
          to: email,
          subject: `[TEST] [Admin] New chat enquiry — ${testPropertyName}`,
          template: 'admin_new_chat',
          data: {
            conversationId: 'test-conv-98765',
            guestName: testGuestName,
            hostName: 'Elena Rostova',
            propertyName: testPropertyName,
            messagePreview: 'Hi! Is late check-out available for our booking next month?',
            createdAt: new Date().toISOString(),
            adminChatUrl: `${base}/admin/messages`,
            recipientName: email.split('@')[0],
          },
        });
        sentTo.push(email);
      }

      return NextResponse.json({
        ok: true,
        type,
        smtpConfigured: isSmtpConfigured(),
        sentTo,
        message: 'New message enquiry test notifications dispatched.',
      });
    }

    // 4. Broken iCal Link Test
    if (type === 'broken_ical') {
      const sentTo: string[] = [];

      // Host alert
      await sendEmailViaExistingEndpoint(base, {
        to: testHostEmail,
        subject: `[TEST] ⚠️ Broken Calendar Link: ${testPropertyName} — Airbnb`,
        template: 'broken_ical_alert',
        data: {
          propertyName: testPropertyName,
          calendarName: 'Airbnb Calendar',
          icalUrl: 'https://www.airbnb.com/calendar/ical/broken-sample.ics',
          errorMessage: 'HTTP 404: External calendar not found or link has expired',
          lastSyncedAt: new Date().toISOString(),
          hostName: 'Elena Rostova',
          fixUrl: `${base}/host/properties/sample-id/edit`,
          recipientName: 'Elena Rostova',
        },
      });
      sentTo.push(testHostEmail);

      // Admin alerts
      const adminTargets = targetEmail ? [targetEmail] : adminEmails;
      for (const email of adminTargets) {
        await sendEmailViaExistingEndpoint(base, {
          to: email,
          subject: `[TEST] [Admin Alert] Broken iCal link: ${testPropertyName} (Airbnb)`,
          template: 'broken_ical_alert',
          data: {
            propertyName: testPropertyName,
            calendarName: 'Airbnb Calendar',
            icalUrl: 'https://www.airbnb.com/calendar/ical/broken-sample.ics',
            errorMessage: 'HTTP 404: External calendar not found or link has expired',
            lastSyncedAt: new Date().toISOString(),
            hostName: 'Elena Rostova',
            fixUrl: `${base}/admin/ical-sync`,
            recipientName: email.split('@')[0],
          },
        });
        sentTo.push(email);
      }

      return NextResponse.json({
        ok: true,
        type,
        smtpConfigured: isSmtpConfigured(),
        sentTo,
        message: 'Broken iCal alert test notifications dispatched.',
      });
    }

    // 5. Booking & Payment Confirmation Test
    if (type === 'payment_confirmation') {
      const sentTo: string[] = [];

      // Host payment receipt
      await sendEmailViaExistingEndpoint(base, {
        to: testHostEmail,
        subject: `[TEST] Payment received — ${testPropertyName} — payout details`,
        template: 'booking_invoice_host',
        data: {
          propertyName: testPropertyName,
          hostName: 'Elena Rostova',
          checkIn: '2026-12-01',
          checkOut: '2026-12-07',
          guests: 2,
          totalPrice: 1450,
          bookingId: 'test-booking-12345',
          appUrl,
        },
      });
      sentTo.push(testHostEmail);

      // Admin payment confirmation
      const adminTargets = targetEmail ? [targetEmail] : adminEmails;
      for (const email of adminTargets) {
        await sendEmailViaExistingEndpoint(base, {
          to: email,
          subject: `[TEST] 💳 Payment Confirmed: ${testPropertyName} #test-booking-12345`,
          template: 'admin_payment_confirmation',
          data: {
            bookingId: 'test-booking-12345',
            propertyName: testPropertyName,
            hostName: 'Elena Rostova',
            guestName: testGuestName,
            checkIn: '2026-12-01',
            checkOut: '2026-12-07',
            totalPrice: 1450,
            hostPayout: 1377.5,
            platformFee: 72.5,
            adminBookingUrl: `${base}/admin/bookings`,
            recipientName: email.split('@')[0],
          },
        });
        sentTo.push(email);
      }

      return NextResponse.json({
        ok: true,
        type,
        smtpConfigured: isSmtpConfigured(),
        sentTo,
        message: 'Payment confirmation test notifications dispatched.',
      });
    }

    return NextResponse.json({ error: `Unknown notification test type: ${type}` }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Notification test failed';
    console.error('[notifications/test] Error:', error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
