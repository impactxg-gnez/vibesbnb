import { Redirect, type Href } from 'expo-router';

/** Universal link path: /bookings */
export default function BookingsDeepLink() {
  return <Redirect href={'/web?path=%2Fbookings&title=My%20trips' as Href} />;
}
