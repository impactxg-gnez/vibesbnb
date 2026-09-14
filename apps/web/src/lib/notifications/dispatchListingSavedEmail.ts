import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listingSavedEmailSubject,
  type ListingSavedContext,
} from '@/lib/email/listingSavedEmail';
import { listActiveAdminRecipients, sendEmailViaExistingEndpoint } from './listActiveAdmins';

type DispatchParams = {
  service: SupabaseClient;
  appUrl: string;
  propertyId: string;
  action: 'created' | 'updated';
  /** Email of whoever saved the listing, copied in when it was not the host themselves. */
  actorEmail?: string | null;
  /** True when an admin saved the listing on the host's behalf. */
  savedByTeam: boolean;
};

/**
 * Confirms a listing save to the host that owns it, with the admin notification list on CC.
 * Admins often save listings while in host support mode, and the confirmation has to reach the
 * host rather than the signed-in admin.
 */
export async function dispatchListingSavedEmail(params: DispatchParams): Promise<void> {
  const { service, appUrl, propertyId, action, actorEmail, savedByTeam } = params;

  try {
    const { data: property, error } = await service
      .from('properties')
      .select('id, host_id, name, title, location, price, status')
      .eq('id', propertyId)
      .maybeSingle();

    if (error || !property?.host_id) {
      console.warn('[dispatchListingSavedEmail] property lookup failed:', error?.message);
      return;
    }

    const { data: profile } = await service
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', property.host_id)
      .maybeSingle();

    let hostEmail = typeof profile?.email === 'string' ? profile.email.trim() : '';
    if (!hostEmail) {
      const { data: authUser } = await service.auth.admin.getUserById(property.host_id);
      hostEmail = authUser?.user?.email?.trim() || '';
    }
    if (!hostEmail) {
      console.warn('[dispatchListingSavedEmail] no email on file for host', property.host_id);
      return;
    }

    const admins = await listActiveAdminRecipients(service);
    const cc = [...admins.map((admin) => admin.email), actorEmail || '']
      .map((address) => address.trim().toLowerCase())
      .filter(
        (address, index, all) =>
          address && address !== hostEmail.toLowerCase() && all.indexOf(address) === index
      );

    const context: ListingSavedContext = {
      action,
      hostName:
        (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
        hostEmail.split('@')[0] ||
        'there',
      propertyName:
        String(property.name || property.title || '').trim() || 'Your listing',
      location: typeof property.location === 'string' ? property.location : null,
      price: typeof property.price === 'number' ? property.price : null,
      status: typeof property.status === 'string' ? property.status : null,
      listingUrl: `${appUrl.replace(/\/$/, '')}/listings/${encodeURIComponent(propertyId)}`,
      savedByTeam,
    };

    await sendEmailViaExistingEndpoint(appUrl, {
      to: hostEmail,
      cc,
      subject: listingSavedEmailSubject(context),
      template: 'listing_saved',
      data: context as unknown as Record<string, unknown>,
    });
  } catch (e) {
    console.warn('[dispatchListingSavedEmail] failed:', e);
  }
}
