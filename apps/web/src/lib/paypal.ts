/**
 * PayPal REST API helpers (Orders v2 + webhook verification).
 * Uses PAYPAL_API_BASE (e.g. https://api-m.paypal.com for Live).
 */

function getApiBase(): string {
  const base = process.env.PAYPAL_API_BASE?.trim();
  if (!base) {
    throw new Error('PAYPAL_API_BASE is not configured');
  }
  return base.replace(/\/$/, '');
}

function getCredentials(): { clientId: string; secret: string } {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !secret) {
    throw new Error('PayPal client credentials are not configured');
  }
  return { clientId, secret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const { clientId, secret } = getCredentials();
  const base = getApiBase();
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data === 'object' && data && 'error_description' in data
        ? String((data as { error_description?: string }).error_description)
        : `PayPal token error: ${res.status}`
    );
  }

  const token = data.access_token as string;
  const expiresIn = Number(data.expires_in) || 32400;
  cachedToken = {
    value: token,
    expiresAt: now + expiresIn * 1000,
  };
  return token;
}

export async function paypalRequest<T>(
  path: string,
  init: RequestInit & { jsonBody?: unknown } = {}
): Promise<T> {
  const base = getApiBase();
  const token = await getPayPalAccessToken();
  const { jsonBody, headers: extraHeaders, ...rest } = init;
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(jsonBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders,
  };

  const res = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers,
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : rest.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ||
      (data as { details?: Array<{ description?: string }> })?.details?.[0]?.description ||
      `PayPal API error: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type PayPalCreateOrderResult = { id: string };

export async function createPayPalOrder(params: {
  bookingId: string;
  amountValue: string;
  currencyCode: string;
  propertyName: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalCreateOrderResult> {
  return paypalRequest<PayPalCreateOrderResult>('/v2/checkout/orders', {
    method: 'POST',
    jsonBody: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.bookingId,
          custom_id: params.bookingId,
          description: `Booking: ${params.propertyName}`.slice(0, 127),
          amount: {
            currency_code: params.currencyCode,
            value: params.amountValue,
          },
        },
      ],
      application_context: {
        brand_name: 'VibesBnB',
        user_action: 'PAY_NOW',
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    },
  });
}

export type PayPalOrderPayload = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{ id: string; status: string; amount?: { value: string } }>;
    };
  }>;
};

export type PayPalCaptureResult = PayPalOrderPayload;

export async function getPayPalOrder(orderId: string): Promise<PayPalOrderPayload> {
  return paypalRequest<PayPalOrderPayload>(`/v2/checkout/orders/${orderId}`, {
    method: 'GET',
  });
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  return paypalRequest<PayPalCaptureResult>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    jsonBody: {},
  });
}

export function formatPayPalAmount(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Invalid payment amount');
  }
  return n.toFixed(2);
}

export async function verifyPayPalWebhookSignature(params: {
  webhookId: string;
  transmissionId: string | null;
  transmissionTime: string | null;
  certUrl: string | null;
  authAlgo: string | null;
  transmissionSig: string | null;
  /** Raw JSON string of the webhook body */
  bodyText: string;
}): Promise<boolean> {
  const {
    webhookId,
    transmissionId,
    transmissionTime,
    certUrl,
    authAlgo,
    transmissionSig,
    bodyText,
  } = params;

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(bodyText);
  } catch {
    return false;
  }

  const base = getApiBase();
  const token = await getPayPalAccessToken();

  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });

  const data = await res.json().catch(() => ({}));
  return (data as { verification_status?: string }).verification_status === 'SUCCESS';
}
