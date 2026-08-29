import { Redirect } from 'expo-router';

/** Universal link path: /host/bookings */
export default function HostBookingsDeepLink() {
  return <Redirect href="/(host)/bookings" />;
}
