import { Redirect, useLocalSearchParams } from 'expo-router';

/** Universal link path: /listings/:id → in-app listing screen */
export default function ListingsDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/(tabs)" />;
  return <Redirect href={`/listing/${id}`} />;
}
