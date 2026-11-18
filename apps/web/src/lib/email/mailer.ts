import { createTransport, type Transporter } from 'nodemailer';

export type SendMailOptions = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export type SendMailResult = {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
};

let cachedTransporter: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  return Boolean(host && user);
}

export function getDefaultFromEmail(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    'VibesBNB <notifications@vibesbnb.com>'
  );
}

export function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = (process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || 587);
  const user = (process.env.SMTP_USER || process.env.EMAIL_SERVER_USER || '').trim();
  const pass = (
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_SERVER_PASSWORD ||
    ''
  ).trim();

  const isSecure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;

  cachedTransporter = createTransport({
    host,
    port,
    secure: isSecure,
    auth: user ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true',
    },
  });

  return cachedTransporter;
}

/**
 * Verify current SMTP connection.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      message: 'SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.',
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, message: 'Failed to initialize SMTP transporter.' };
  }

  try {
    await transporter.verify();
    return { ok: true, message: 'SMTP connection verified successfully.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `SMTP connection failed: ${errorMsg}` };
  }
}

/**
 * Pure in-repo email sender via Nodemailer / SMTP.
 * Never throws to caller unless explicitly requested; returns structured result.
 */
export async function sendEmail(opts: SendMailOptions): Promise<SendMailResult> {
  const from = opts.from || getDefaultFromEmail();
  const toList = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  const ccList = opts.cc ? (Array.isArray(opts.cc) ? opts.cc.join(', ') : opts.cc) : undefined;
  const bccList = opts.bcc ? (Array.isArray(opts.bcc) ? opts.bcc.join(', ') : opts.bcc) : undefined;

  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Mailer] SMTP not configured. Simulating delivery:');
    console.log('[Mailer] To:', toList);
    if (ccList) console.log('[Mailer] Cc:', ccList);
    console.log('[Mailer] Subject:', opts.subject);
    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
      mocked: true,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: toList,
      cc: ccList,
      bcc: bccList,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    return {
      success: true,
      messageId: info.messageId,
      mocked: false,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Mailer] Failed to send email via SMTP:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
