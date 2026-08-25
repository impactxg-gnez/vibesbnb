import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coming Soon | VibesBNB',
  description:
    'The holiday vibe is just getting started. Essentials delivery, airport pickups, local guides, houseparties, chauffeurs, gaming, and trip planning. Coming soon to VibesBNB.',
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
