import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

/**
 * Remote push was removed from Expo Go (SDK 53+).
 * Detect store client / Expo Go and never touch expo-notifications there.
 */
function isExpoGoRuntime(): boolean {
  const ownership = Constants.appOwnership;
  const env = Constants.executionEnvironment;
  return ownership === 'expo' || env === 'storeClient';
}

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (isExpoGoRuntime()) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('[push] expo-notifications unavailable', e);
    notificationsModule = null;
  }
  return notificationsModule;
}

export async function setupPushNotifications(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications || !Device.isDevice) return null;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

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
  } catch (e) {
    console.warn('[push] setup skipped', e);
    return null;
  }
}

export type PushPayload = {
  stage?: string;
  bookingId?: string;
  conversationId?: string;
};

export function parsePushResponse(response: {
  notification: { request: { content: { data: PushPayload } } };
} | null): PushPayload | null {
  if (!response) return null;
  const data = response.notification.request.content.data as PushPayload;
  return data ?? null;
}

export function addNotificationResponseListener(
  handler: (payload: PushPayload) => void
) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { remove: () => undefined };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = parsePushResponse(response);
      if (payload) handler(payload);
    });
  } catch (e) {
    console.warn('[push] response listener unavailable', e);
    return { remove: () => undefined };
  }
}
