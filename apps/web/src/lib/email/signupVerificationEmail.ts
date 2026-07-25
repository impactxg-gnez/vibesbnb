import { escapeHtml, vibesbnbEmailLayout } from '@/lib/email/vibesbnbEmailLayout';

export function signupVerificationEmailHtml(params: {
  confirmUrl: string;
  email: string;
  isHost?: boolean;
}): string {
  const roleLine = params.isHost
    ? 'Confirm your email to activate your host account and start listing wellness-friendly stays.'
    : 'Confirm your email to activate your VibesBNB account and explore wellness-friendly stays.';

  return vibesbnbEmailLayout({
    title: 'Confirm your email',
    preheader: 'One tap to activate your VibesBNB account',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.72);">
        ${escapeHtml(roleLine)}
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.45);">
        Sent to <span style="color:#a7f3d0;">${escapeHtml(params.email)}</span>
      </p>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.55;color:rgba(255,255,255,0.4);">
        If the button doesn&apos;t work, paste this link into your browser:<br/>
        <span style="color:#00E676;word-break:break-all;">${escapeHtml(params.confirmUrl)}</span>
      </p>
    `,
    ctaLabel: 'Confirm my email',
    ctaUrl: params.confirmUrl,
    footerNote: "Didn't create a VibesBNB account? You can ignore this email.",
  });
}
