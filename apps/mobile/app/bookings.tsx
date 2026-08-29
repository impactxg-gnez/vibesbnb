import { Redirect } from 'expo-router';

/** Universal link path: /bookings */
export default function BookingsDeepLink() {
  return <Redirect href="/(tabs)/bookings" />;
}
