/** Branded transactional HTML for “host approved” (Resend / internal sends). */

const brandPurple = '#5B21B6';
const brandGreen = '#00E676';
const darkBg = '#0f0f12';
const cardBg = '#1a1a20';

export function hostApplicationApprovedEmailHtml(params: {
  hostName: string;
  appUrl: string;
}): string {
  const { hostName, appUrl } = params;
  const dashboardUrl = `${appUrl.replace(/\/$/, '')}/host/properties`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${darkBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${darkBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:${cardBg};border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;background:linear-gradient(135deg,${brandPurple}33,transparent);">
              <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em;">VibesBNB</p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">Catch a vibe</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <h1 style="margin:0 0 12px;font-size:22px;color:#fff;font-weight:700;">You're approved to host</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.72);">
                Hi ${escapeHtml(hostName)}, great news — your host application has been approved. You can manage listings and bookings from your host dashboard.
              </p>
              <a href="${dashboardUrl}" style="display:inline-block;background:${brandGreen};color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;">
                Go to host dashboard
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.4);">
                If the button doesn't work, paste this link into your browser:<br/>
                <span style="color:${brandGreen};word-break:break-all;">${dashboardUrl}</span>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">Sent by VibesBNB</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
