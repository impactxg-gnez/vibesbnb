import { NextRequest, NextResponse } from 'next/server';
import { normalizeWhatsAppNumber } from '@/lib/notifications/resolveUserContact';

/**
 * Sends WhatsApp notifications via Twilio when configured.
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER (e.g. +14155238886)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const normalizedTo = normalizeWhatsAppNumber(String(to));
    if (!normalizedTo) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp phone number' },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      console.log('[WhatsApp Notification] Twilio not configured — logged only:', {
        to: normalizedTo,
        messagePreview: String(message).slice(0, 80),
      });
      return NextResponse.json({
        success: false,
        message:
          'WhatsApp service not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER.',
      });
    }

    const fromWhatsApp = fromNumber.startsWith('whatsapp:')
      ? fromNumber
      : `whatsapp:${fromNumber.startsWith('+') ? fromNumber : `+${fromNumber.replace(/\D/g, '')}`}`;
    const toWhatsApp = `whatsapp:${normalizedTo}`;

    const params = new URLSearchParams();
    params.set('From', fromWhatsApp);
    params.set('To', toWhatsApp);
    params.set('Body', String(message));

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const twilioData = await twilioRes.json().catch(() => ({}));

    if (!twilioRes.ok) {
      console.error('[WhatsApp Notification] Twilio error:', twilioData);
      return NextResponse.json(
        {
          error: 'Failed to send WhatsApp message',
          details: twilioData?.message || twilioRes.statusText,
        },
        { status: 502 }
      );
    }

    console.log('[WhatsApp Notification] Sent:', twilioData?.sid);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent',
      sid: twilioData?.sid,
    });
  } catch (error: unknown) {
    console.error('[WhatsApp Notification] Error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message', details },
      { status: 500 }
    );
  }
}
