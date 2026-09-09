import { Redirect, type Href } from 'expo-router';

/** Universal link path: /messages */
export default function MessagesDeepLink() {
  return <Redirect href={'/web?path=%2Fmessages&title=Messages' as Href} />;
}
