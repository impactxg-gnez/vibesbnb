/** Shared VibesBNB transactional email chrome (dark theme). */

export const VIBESBNB_EMAIL = {
  purple: '#5B21B6',
  green: '#10B981',
  greenBright: '#00E676',
  darkBg: '#0f0f12',
  cardBg: '#1a1a20',
  muted: 'rgba(255,255,255,0.65)',
  border: 'rgba(255,255,255,0.08)',
} as const;

export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function vibesbnbEmailLayout(params: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `<a href="${params.ctaUrl}" style="display:inline-block;background:${VIBESBNB_EMAIL.greenBright};color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;margin-top:8px;">${escapeHtml(params.ctaLabel)}</a>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${params.preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(params.preheader)}</span>` : ''}
</head>
<body style="margin:0;padding:0;background:${VIBESBNB_EMAIL.darkBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${VIBESBNB_EMAIL.darkBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background:${VIBESBNB_EMAIL.cardBg};border-radius:20px;overflow:hidden;border:1px solid ${VIBESBNB_EMAIL.border};">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;background:linear-gradient(135deg,${VIBESBNB_EMAIL.purple}44,transparent);">
              <p style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em;">VibesBNB</p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">Catch a vibe · Wellness-friendly stays</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#fff;font-weight:700;">${escapeHtml(params.title)}</h1>
              ${params.bodyHtml}
              ${cta ? `<p style="margin:24px 0 0;text-align:center;">${cta}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid ${VIBESBNB_EMAIL.border};">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-align:center;line-height:1.5;">
                ${escapeHtml(params.footerNote || 'Questions? Reply via your VibesBNB messages inbox.')}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function invoiceTableRow(label: string, value: string, opts?: { bold?: boolean; accent?: boolean }) {
  const color = opts?.accent ? VIBESBNB_EMAIL.green : '#fff';
  const weight = opts?.bold ? '700' : '500';
  return `<tr>
    <td style="padding:10px 0;color:${VIBESBNB_EMAIL.muted};font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:${color};font-weight:${weight};font-size:14px;text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}

export function invoiceTable(rows: string, totalRow?: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:rgba(0,0,0,0.25);border-radius:12px;border:1px solid ${VIBESBNB_EMAIL.border};">
    <tr><td style="padding:12px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}${totalRow || ''}</table>
    </td></tr>
  </table>`;
}
