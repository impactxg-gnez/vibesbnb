import { createServiceClient } from '@/lib/supabase/service';

export type BookingStagePayload = {
  stage:
    | 'booking_request_created'
    | 'booking_request_received'
    | 'booking_accepted'
    | 'booking_rejected'
    | 'booking_confirmed'
    | 'new_message';
  bookingId?: string;
  conversationId?: string;
};

/**
 * Sends push notifications to all registered devices for a user when Expo is configured.
 * Mobile apps should call POST /api/notifications/register-device with Expo push tokens.
 */
export async function dispatchPushToUser(
  userId: string,
  title: string,
  body: string,
  data: BookingStagePayload
): Promise<void> {
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (!accessToken) {
    return;
  }

  const service = createServiceClient();
  const { data: rows, error } = await service
    .from('device_push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error || !rows?.length) {
    return;
  }

  const messages = rows.map((row) => ({
    to: row.token,
    title,
    body,
    data: {
      ...data,
      bookingId: data.bookingId ?? '',
      conversationId: data.conversationId ?? '',
    },
    sound: 'default' as const,
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[pushDispatch] Expo push failed', e);
  }
}
