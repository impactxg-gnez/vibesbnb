import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibesBNB — Wellness-friendly vacation rentals';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social preview (WhatsApp, SMS, Facebook, iMessage, etc.). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(145deg, #050505 0%, #0f172a 55%, #064e3b 100%)',
          padding: '64px 72px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'rgba(16,185,129,0.15)',
              border: '2px solid rgba(16,185,129,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            VibesBNB
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            Wellness-friendly vacation rentals
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#a7f3d0',
              lineHeight: 1.35,
              maxWidth: 800,
            }}
          >
            Find mindful stays with clear indoor & outdoor vibes — book your next retreat.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            color: '#94a3b8',
            fontSize: 22,
          }}
        >
          <span>vibesbnb.com</span>
          <span style={{ color: '#34d399', fontWeight: 700 }}>Beta</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
