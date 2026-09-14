import {
  VIBESBNB_EMAIL,
  escapeHtml,
  invoiceTable,
  invoiceTableRow,
  vibesbnbEmailLayout,
} from './vibesbnbEmailLayout';

export type ListingSavedContext = {
  action: 'created' | 'updated';
  hostName: string;
  propertyName: string;
  location?: string | null;
  price?: number | null;
  status?: string | null;
  listingUrl: string;
  /** Set when the VibesBNB team saved the listing on the host's behalf. */
  savedByTeam?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Live for guests',
  draft: 'Draft (not visible to guests)',
  inactive: 'Unpublished',
  pending_approval: 'Pending review',
};

export function listingSavedEmailSubject(ctx: ListingSavedContext): string {
  const verb = ctx.action === 'created' ? 'added' : 'updated';
  return `Your listing "${ctx.propertyName}" was ${verb}`;
}

export function listingSavedEmailHtml(ctx: ListingSavedContext): string {
  const rows = [
    invoiceTableRow('Listing', ctx.propertyName),
    ctx.location ? invoiceTableRow('Location', ctx.location) : '',
    typeof ctx.price === 'number' && Number.isFinite(ctx.price)
      ? invoiceTableRow('Nightly rate', `$${ctx.price.toFixed(2)}`)
      : '',
    ctx.status
      ? invoiceTableRow('Status', STATUS_LABELS[ctx.status] || ctx.status, { accent: true })
      : '',
  ]
    .filter(Boolean)
    .join('');

  const opening =
    ctx.action === 'created'
      ? ctx.savedByTeam
        ? 'A new listing was added to your host account by the VibesBNB team.'
        : 'Your new listing is saved on your host account.'
      : ctx.savedByTeam
        ? 'One of your listings was updated by the VibesBNB team.'
        : 'Your listing changes are saved.';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:${VIBESBNB_EMAIL.muted};line-height:1.6;">
      Hi ${escapeHtml(ctx.hostName)}, ${escapeHtml(opening)}
    </p>
    ${invoiceTable(rows)}
    <p style="margin:16px 0 0;font-size:14px;color:${VIBESBNB_EMAIL.muted};line-height:1.6;">
      Review the details and edit anything that looks off from your host dashboard. If you did not
      expect this change, reply to this email and the VibesBNB team will look into it.
    </p>
  `;

  return vibesbnbEmailLayout({
    title: ctx.action === 'created' ? 'Listing added to your account' : 'Listing updated',
    preheader: listingSavedEmailSubject(ctx),
    bodyHtml,
    ctaLabel: 'View your listing',
    ctaUrl: ctx.listingUrl,
    footerNote: 'The VibesBNB team is copied on this message for your records.',
  });
}
