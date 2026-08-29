import { Redirect } from 'expo-router';

/** Universal link path: /messages */
export default function MessagesDeepLink() {
  return <Redirect href="/(tabs)/messages" />;
}
