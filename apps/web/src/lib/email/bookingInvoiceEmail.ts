import { computeBookingGrandTotal } from '@/lib/bookingTotals';
import { computeLodgingWithBakedFee } from '@/lib/platformPricing';
import {
  escapeHtml,
  invoiceTable,
  invoiceTableRow,
  vibesbnbEmailLayout,
  VIBESBNB_EMAIL,
} from '@/lib/email/vibesbnbEmailLayout';

export type BookingInvoiceLine = { label: string; amount: number };

export type BookingInvoiceContext = {
  bookingId: string;
  invoiceNumber: string;
  propertyName: string;
  propertyAddress: string;
  mapsUrl?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  kids: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail?: string | null;
  hostPhone?: string | null;
  hostWhatsapp?: string | null;
  lineItems: BookingInvoiceLine[];
  serviceFee: number;
  totalPaid: number;
  estimatedHostPayout: number;
  wellnessTotal: number;
  nights: number;
  paymentReference?: string | null;
  payoutSummary?: {
    accountHolderName: string;
    bankName: string;
    currency: string;
    status: string;
  } | null;
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(ymd: string): string {
  try {
    return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

export function buildBookingInvoiceContext(params: {
  booking: Record<string, unknown>;
  property?: Record<string, unknown> | null;
  hostContact: { name: string; email?: string | null; phone?: string | null; whatsapp?: string | null };
  payoutAccount?: Record<string, unknown> | null;
}): BookingInvoiceContext {
  const booking = params.booking;
  const property = params.property;
  const bookingId = String(booking.id);
  const checkIn = String(booking.check_in).slice(0, 10);
  const checkOut = String(booking.check_out).slice(0, 10);
  const nightly = Number(property?.price) || 0;
  const cleaning = property?.cleaning_fee != null ? Number(property.cleaning_fee) : 0;
  const selectedUnits = booking.selected_units as Array<{ price?: unknown }> | null | undefined;
  const wellnessRaw = booking.wellness_line_items;
  const wellnessItems = Array.isArray(wellnessRaw)
    ? wellnessRaw.map((w: { name?: string; price?: number }) => ({
        name: String(w?.name || 'Wellness item'),
        price: Number(w?.price) || 0,
      }))
    : [];

  const { stayNights, grandTotal } = computeBookingGrandTotal({
    propertyNightlyPrice: nightly,
    cleaningFee: cleaning,
    checkInYmd: checkIn,
    checkOutYmd: checkOut,
    selectedUnits,
    wellnessLineItems: wellnessItems,
  });

  let hostNightlyRate = nightly;
  if (selectedUnits?.length) {
    hostNightlyRate = selectedUnits.reduce((s, u) => s + (Number(u?.price) || 0), 0);
  }
  const lodging = computeLodgingWithBakedFee({
    hostNightlyRate,
    nights: stayNights,
    hostCleaningFee: cleaning,
  });
  const serviceFee = lodging.platformFee;
  const wellnessTotal = wellnessItems.reduce((s, i) => s + i.price, 0);

  const lineItems: BookingInvoiceLine[] = [
    {
      label: `Accommodation (${stayNights} night${stayNights === 1 ? '' : 's'})`,
      amount: lodging.travelerAccommodationSubtotal,
    },
  ];
  if (lodging.travelerCleaningFee > 0) {
    lineItems.push({ label: 'Cleaning fee', amount: lodging.travelerCleaningFee });
  }
  for (const w of wellnessItems) {
    if (w.price > 0) {
      lineItems.push({ label: w.name, amount: w.price });
    }
  }

  const totalPaid = Number(booking.total_price) || grandTotal;

  return {
    bookingId,
    invoiceNumber: `VBNB-${bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    propertyName: String(booking.property_name || property?.name || 'Property'),
    propertyAddress: String(booking.location || property?.location || 'See listing for address'),
    mapsUrl: (property?.google_maps_url as string) || null,
    checkIn,
    checkOut,
    guests: Number(booking.guests) || 1,
    kids: Number(booking.kids) || 0,
    pets: Number(booking.pets) || 0,
    guestName: String(booking.guest_name || 'Guest'),
    guestEmail: String(booking.guest_email || ''),
    hostName: params.hostContact.name,
    hostEmail: params.hostContact.email,
    hostPhone: params.hostContact.phone,
    hostWhatsapp: params.hostContact.whatsapp,
    lineItems,
    serviceFee,
    totalPaid,
    estimatedHostPayout: lodging.hostSubtotal,
    wellnessTotal,
    nights: stayNights,
    paymentReference: (booking.payment_intent_id as string) || null,
    payoutSummary: params.payoutAccount
      ? {
          accountHolderName: String(params.payoutAccount.account_holder_name || ''),
          bankName: String(params.payoutAccount.bank_name || ''),
          currency: String(params.payoutAccount.currency || 'USD'),
          status: String(params.payoutAccount.status || 'pending_verification'),
        }
      : null,
  };
}

export function travellerBookingInvoiceEmailHtml(ctx: BookingInvoiceContext, appUrl: string): string {
  const lineRows = ctx.lineItems
    .map((li) => invoiceTableRow(li.label, formatMoney(li.amount)))
    .join('');
  const totalRow = invoiceTableRow('Total paid', formatMoney(ctx.totalPaid), {
    bold: true,
    accent: true,
  });

  const hostContactParts: string[] = [];
  if (ctx.hostEmail) hostContactParts.push(`Email: ${ctx.hostEmail}`);
  const phone = ctx.hostWhatsapp || ctx.hostPhone;
  if (phone) hostContactParts.push(`Phone / WhatsApp: ${phone}`);

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${VIBESBNB_EMAIL.muted};">
      Hi ${escapeHtml(ctx.guestName)}, your payment is confirmed. Here is your booking confirmation and invoice.
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;">Invoice ${escapeHtml(ctx.invoiceNumber)}</p>
    ${invoiceTable(
      [
        invoiceTableRow('Property', ctx.propertyName),
        invoiceTableRow('Address', ctx.propertyAddress),
        invoiceTableRow('Check-in', formatDate(ctx.checkIn)),
        invoiceTableRow('Check-out', formatDate(ctx.checkOut)),
        invoiceTableRow(
          'Guests',
          `${ctx.guests}${ctx.kids ? ` + ${ctx.kids} kids` : ''}${ctx.pets ? ` + ${ctx.pets} pets` : ''}`
        ),
        invoiceTableRow('Host', ctx.hostName),
        ...(ctx.paymentReference
          ? [invoiceTableRow('Payment ref', ctx.paymentReference.slice(0, 24))]
          : []),
      ].join('') +
        `<tr><td colspan="2" style="padding:12px 0 4px;font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Charges</td></tr>` +
        lineRows,
      totalRow
    )}
    ${
      hostContactParts.length
        ? `<div style="margin:20px 0;padding:16px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:12px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${VIBESBNB_EMAIL.green};">Host contact</p>
        ${hostContactParts.map((p) => `<p style="margin:4px 0;font-size:14px;color:#fff;">${escapeHtml(p)}</p>`).join('')}
      </div>`
        : `<p style="margin:16px 0;font-size:14px;color:${VIBESBNB_EMAIL.muted};">Message your host in the VibesBNB app for check-in details.</p>`
    }
    ${
      ctx.mapsUrl
        ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(ctx.mapsUrl)}" style="color:${VIBESBNB_EMAIL.green};font-size:14px;">Open property on map</a></p>`
        : ''
    }
  `;

  return vibesbnbEmailLayout({
    title: 'Booking confirmed',
    preheader: `Your stay at ${ctx.propertyName} is confirmed.`,
    bodyHtml: body,
    ctaLabel: 'View booking',
    ctaUrl: `${appUrl.replace(/\/$/, '')}/bookings`,
    footerNote: 'Keep all communication on VibesBNB for your protection.',
  });
}

export function hostBookingConfirmationEmailHtml(ctx: BookingInvoiceContext, appUrl: string): string {
  const lineRows = ctx.lineItems
    .filter((li) => !li.label.includes('service fee'))
    .map((li) => invoiceTableRow(li.label, formatMoney(li.amount)))
    .join('');

  const payoutBlock = ctx.payoutSummary
    ? `<div style="margin:20px 0;padding:16px;background:rgba(91,33,182,0.2);border:1px solid rgba(91,33,182,0.45);border-radius:12px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c4b5fd;">Payout information</p>
        <p style="margin:4px 0;font-size:14px;color:#fff;">Estimated payout: <strong>${formatMoney(ctx.estimatedHostPayout)}</strong> (your listed accommodation + cleaning)</p>
        <p style="margin:8px 0 4px;font-size:13px;color:${VIBESBNB_EMAIL.muted};">Deposit to:</p>
        <p style="margin:2px 0;font-size:14px;color:#fff;">${escapeHtml(ctx.payoutSummary.accountHolderName)}</p>
        <p style="margin:2px 0;font-size:14px;color:#fff;">${escapeHtml(ctx.payoutSummary.bankName)} · ${escapeHtml(ctx.payoutSummary.currency)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">Account status: ${escapeHtml(ctx.payoutSummary.status.replace(/_/g, ' '))}</p>
      </div>`
    : `<div style="margin:20px 0;padding:16px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:12px;">
        <p style="margin:0;font-size:14px;color:#fcd34d;">Add your payout bank details in your host profile to receive earnings.</p>
      </div>`;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${VIBESBNB_EMAIL.muted};">
      Hi ${escapeHtml(ctx.hostName)}, <strong>${escapeHtml(ctx.guestName)}</strong> paid for a stay at <strong>${escapeHtml(ctx.propertyName)}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;">Booking ${escapeHtml(ctx.invoiceNumber)}</p>
    ${invoiceTable(
      [
        invoiceTableRow('Guest', ctx.guestName),
        invoiceTableRow('Guest email', ctx.guestEmail || '—'),
        invoiceTableRow('Property', ctx.propertyName),
        invoiceTableRow('Address', ctx.propertyAddress),
        invoiceTableRow('Check-in', formatDate(ctx.checkIn)),
        invoiceTableRow('Check-out', formatDate(ctx.checkOut)),
        invoiceTableRow('Guests', String(ctx.guests)),
        invoiceTableRow('Guest paid (total)', formatMoney(ctx.totalPaid), { accent: true }),
        invoiceTableRow('Platform service fee', formatMoney(ctx.serviceFee)),
      ].join('') +
        (lineRows ? `<tr><td colspan="2" style="padding:8px 0 4px;font-size:12px;color:rgba(255,255,255,0.4);">Stay breakdown</td></tr>${lineRows}` : ''),
      invoiceTableRow('Your estimated payout', formatMoney(ctx.estimatedHostPayout), { bold: true, accent: true })
    )}
    ${payoutBlock}
  `;

  return vibesbnbEmailLayout({
    title: 'Payment received',
    preheader: `${ctx.guestName} paid for ${ctx.propertyName}.`,
    bodyHtml: body,
    ctaLabel: 'Manage bookings',
    ctaUrl: `${appUrl.replace(/\/$/, '')}/host/bookings`,
    footerNote: 'Payouts are processed per your VibesBNB host agreement.',
  });
}
