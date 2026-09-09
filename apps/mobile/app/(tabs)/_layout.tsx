import { Redirect } from 'expo-router';

/** Native traveler tabs removed — site chrome handles navigation. */
export default function TabsLayout() {
  return <Redirect href="/" />;
}
