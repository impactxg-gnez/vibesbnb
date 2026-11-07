import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isReferralAffiliateEnabled } from '@/lib/referrals/config';
import { AcceptanceClient } from './AcceptanceClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Referral acceptance',
};

export default function ReferralAcceptancePage() {
  if (!isReferralAffiliateEnabled()) notFound();
  return <AcceptanceClient />;
}
