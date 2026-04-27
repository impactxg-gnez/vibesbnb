'use client';

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import toast from 'react-hot-toast';

type Props = {
  bookingId: string;
  onPaid: () => void;
  /** Overrides default toast after successful capture */
  successMessage?: string;
};

export function PayPalBookingButtons({ bookingId, onPaid, successMessage }: Props) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() || '';

  if (!clientId) {
    return (
      <p className="text-sm text-red-400">PayPal is not configured (missing client ID).</p>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      <PayPalButtons
        style={{ layout: 'vertical', label: 'pay', borderRadius: 8 }}
        createOrder={async () => {
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
            credentials: 'same-origin',
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Could not start payment');
          }
          return data.id as string;
        }}
        onApprove={async (data) => {
          const res = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID, bookingId }),
            credentials: 'same-origin',
          });
          const out = await res.json();
          if (!res.ok) {
            throw new Error(out.error || 'Payment could not be completed');
          }
          toast.success(
            successMessage ?? 'Payment successful! Your stay is confirmed.'
          );
          onPaid();
        }}
        onCancel={() => {
          toast('Payment cancelled', { icon: 'ℹ️' });
        }}
        onError={(err) => {
          console.error(err);
          toast.error('PayPal error. Please try again or use a different method.');
        }}
      />
    </PayPalScriptProvider>
  );
}
