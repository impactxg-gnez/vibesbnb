import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listActiveAdminRecipients,
  sendEmailViaExistingEndpoint,
} from '@/lib/notifications/listActiveAdmins';
import { resolveUserContact } from '@/lib/notifications/resolveUserContact';

export type BrokenIcalEmailParams = {
  service: SupabaseClient;
  appUrl: string;
  calendarId: string;
  propertyId: string;
  hostId: string;
  propertyName?: string | null;
  calendarName?: string | null;
  icalUrl: string;
  errorMessage: string;
  lastSyncedAt?: string | null;
};

// In-memory cooldown cache: calendarId -> last alerted timestamp (ms)
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours cooldown
const lastAlertedMap = new Map<string, number>();

/**
 * Emails host and admins when an external iCal link is broken or fails to sync.
 * Includes a 24-hour in-memory throttle per calendarId to prevent inbox flooding.
 */
export async function dispatchBrokenIcalEmail(
  params: BrokenIcalEmailParams
): Promise<{ dispatched: boolean; hostSent: boolean; adminsCount: number }> {
  try {
    const {
      service,
      appUrl,
      calendarId,
      propertyId,
      hostId,
      propertyName,
      calendarName,
      icalUrl,
      errorMessage,
      lastSyncedAt,
    } = params;

    // Check throttle
    const lastAlerted = lastAlertedMap.get(calendarId) || 0;
    const now = Date.now();
    if (now - lastAlerted < ALERT_COOLDOWN_MS) {
      console.log(
        `[dispatchBrokenIcalEmail] Cooldown active for calendar ${calendarId}. Next alert in ${Math.round(
          (ALERT_COOLDOWN_MS - (now - lastAlerted)) / 60000
        )} mins.`
      );
      return { dispatched: false, hostSent: false, adminsCount: 0 };
    }

    const base = appUrl.replace(/\/$/, '');
    const fixUrl = `${base}/host/properties/${propertyId}/edit`;

    // 1. Resolve host contact
    const hostContact = await resolveUserContact(service, hostId);

    // 2. Resolve active admin recipients (guaranteed to include vibewithdeon@vibesbnb.com & keval65@gmail.com)
    const admins = await listActiveAdminRecipients(service);

    const subject = `⚠️ Broken Calendar Link: ${propertyName || 'Property'} — ${calendarName || 'iCal'}`;
    let hostSent = false;

    // 3. Email Host
    if (hostContact.email) {
      await sendEmailViaExistingEndpoint(base, {
        to: hostContact.email,
        subject,
        template: 'broken_ical_alert',
        data: {
          propertyName: propertyName || 'Your property',
          calendarName: calendarName || 'External Calendar',
          icalUrl,
          errorMessage,
          lastSyncedAt: lastSyncedAt || new Date().toISOString(),
          hostName: hostContact.name,
          fixUrl,
          recipientName: hostContact.name,
        },
      });
      hostSent = true;
    }

    // 4. Email Admins
    await Promise.all(
      admins.map((admin) =>
        sendEmailViaExistingEndpoint(base, {
          to: admin.email,
          subject: `[Admin Alert] Broken iCal link: ${propertyName || 'Property'} (${calendarName || 'iCal'})`,
          template: 'broken_ical_alert',
          data: {
            propertyName: propertyName || 'Property',
            calendarName: calendarName || 'External Calendar',
            icalUrl,
            errorMessage,
            lastSyncedAt: lastSyncedAt || new Date().toISOString(),
            hostName: hostContact.name,
            fixUrl: `${base}/admin/ical-sync?hostId=${hostId}`,
            recipientName: admin.name,
          },
        })
      )
    );

    lastAlertedMap.set(calendarId, now);

    return {
      dispatched: true,
      hostSent,
      adminsCount: admins.length,
    };
  } catch (err) {
    console.error('[dispatchBrokenIcalEmail] Error:', err);
    return { dispatched: false, hostSent: false, adminsCount: 0 };
  }
}
