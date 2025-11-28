import { NextRequest, NextResponse } from 'next/server';

// This endpoint handles email notifications
// In production, integrate with SendGrid, Resend, or similar service

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

    // For now, just log the email (in production, use SendGrid/Resend/etc.)
    console.log('[Email Notification]', {
      to,
      subject,
      template,
      data,
    });

    // TODO: Integrate with email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to,
    //   from: process.env.SENDGRID_FROM_EMAIL,
    //   subject,
    //   html: generateEmailTemplate(template, data),
    // });

    return NextResponse.json({ success: true, message: 'Email queued for sending' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}








