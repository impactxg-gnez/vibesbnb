import { router, type Href } from 'expo-router';

/** Open any vibesbnb.com path inside authenticated in-app web view. */
export function openWebPath(path: string, title?: string) {
  const q = new URLSearchParams({ path, title: title || '' });
  router.push(`/web?${q.toString()}` as Href);
}
