import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | VibesBNB',
  description:
    'VibesBNB is the wellness-friendly vacation rental marketplace built to help you catch a vibe — vetted stays, soulful standards, and travel that puts well-being first.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
