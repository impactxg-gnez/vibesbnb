import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId: String(projectId) } : undefined
  );
  const token = tokenData.data;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    await registerPushToken(token, platform);
  } catch (e) {
    console.warn('[push] register failed', e);
  }

  return token;
}

export type PushPayload = {
  stage?: string;
  bookingId?: string;
  conversationId?: string;
};

export function parsePushResponse(
  response: Notifications.NotificationResponse | null
): PushPayload | null {
  if (!response) return null;
  const data = response.notification.request.content.data as PushPayload;
  return data ?? null;
}

export function addNotificationResponseListener(
  handler: (payload: PushPayload) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = parsePushResponse(response);
    if (payload) handler(payload);
  });
}
