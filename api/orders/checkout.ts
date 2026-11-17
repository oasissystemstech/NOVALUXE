import type { IncomingMessage, ServerResponse } from 'http';
import {
  fetchWithTimeout,
  getClientIp,
  getSupabaseServerConfig,
  hashClientIp,
  isAbortError,
  readJsonBody
} from '../_lib/canonicalCatalog';
import { applyCors } from '../_lib/cors';

interface VercelRequest extends IncomingMessage {
  body?: any;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

export async function processCheckoutOrder(
  req: VercelRequest,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any>; headers?: Record<string, string> }> {
  const payload = await readJsonBody(req);

  const customerName = String(payload.customerName || '').trim();
  const customerPhone = String(payload.customerPhone || '').trim();
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const customerEmail = String(payload.customerEmail || '').trim();
  const deliveryMethod = String(payload.deliveryMethod || 'Delivery').trim();
  const deliveryLocation = String(payload.deliveryLocation || '').trim();
  const deliveryAddress = String(payload.deliveryAddress || '').trim();
  const customerNotes = String(payload.customerNotes || '').trim();
  const clientRequestId = String(payload.clientRequestId || '').trim();

  if (clientRequestId.length < 8 || clientRequestId.length > 128) {
    return {
      status: 400,
      body: { error: 'A valid checkout request identifier (clientRequestId) is required.' }
    };
  }
  if (customerName.length < 2) {
    return { status: 400, body: { error: 'Please enter your full name.' } };
  }
  if (phoneDigits.length < 7) {
    return { status: 400, body: { error: 'Please provide a valid phone number (minimum 7 digits).' } };
  }
  if (deliveryMethod !== 'Delivery' && deliveryMethod !== 'Pickup') {
    return { status: 400, body: { error: 'Invalid delivery method.' } };
  }
  if (deliveryMethod === 'Delivery' && (deliveryLocation.length < 2 || deliveryAddress.length < 3)) {
    return { status: 400, body: { error: 'Please provide your delivery area and street address.' } };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0 || rawItems.length > 50) {
    return { status: 400, body: { error: 'Your order must include between 1 and 50 items.' } };
  }

  // Strip any client-submitted prices, totals, or statuses cleanly
  const sanitizedItems = rawItems.map((item: any) => ({
    productId: String(item?.productId || '').trim(),
    slug: String(item?.slug || '').trim(),
    variantId: String(item?.variantId || '').trim(),
    variantName: String(item?.variantName || '').trim(),
    variantValue: String(item?.variantValue || '').trim(),
    quantity: Number(item?.quantity)
  }));

  for (const item of sanitizedItems) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      return { status: 400, body: { error: 'Every item quantity must be a whole number between 1 and 100.' } };
    }
    if (!item.productId && !item.slug) {
      return { status: 400, body: { error: 'Each order item must specify a valid product identifier.' } };
    }
  }

  // Strictly persistent transactional checkout via Supabase create_checkout_order RPC (service_role only).
  // Never fall back to the public anon key or return a simulated success order.
  const sb = getSupabaseServerConfig(envSource);
  if (!sb.url || !sb.hasServiceRole || !sb.serviceRoleKey) {
    return {
      status: 503,
      body: {
        error:
          'Checkout service is temporarily unavailable because server database credentials are not configured. Please try again later or order via WhatsApp.'
      }
    };
  }

  const clientIpHash = hashClientIp(getClientIp(req), envSource);

  try {
    const rpcResp = await fetchWithTimeout(
      `${sb.url}/rest/v1/rpc/create_checkout_order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: sb.serviceRoleKey,
          Authorization: `Bearer ${sb.serviceRoleKey}`
        },
        body: JSON.stringify({
          p_customer_name: customerName,
          p_customer_phone: customerPhone,
          p_customer_email: customerEmail || null,
          p_delivery_location: deliveryLocation,
          p_delivery_address: deliveryAddress,
          p_delivery_method: deliveryMethod,
          p_customer_notes: customerNotes || null,
          p_items: sanitizedItems,
          p_client_request_id: clientRequestId,
          p_client_ip: clientIpHash
        })
      },
      10_000
    );

    if (rpcResp.ok) {
      const order = await rpcResp.json().catch(() => null);
      if (order?.rateLimited) {
        const retryAfterSec = Math.max(1, Number(order.retryAfterSec || 60));
        return {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSec) },
          body: {
            error:
              typeof order.error === 'string' && order.error.trim()
                ? order.error
                : `Too many checkout attempts. Please wait ${retryAfterSec} seconds before placing another order.`
          }
        };
      }
      if (!order || !order.id || !order.orderReference) {
        return {
          status: 503,
          body: {
            error:
              'The order database returned an incomplete confirmation. Please verify your order or try again shortly.'
          }
        };
      }
      return {
        status: 200,
        body: {
          success: true,
          source: 'supabase',
          idempotentReplay: Boolean(order.idempotentReplay),
          order
        }
      };
    }

    const errData = await rpcResp.json().catch(() => ({}));
    const errCode = String(errData?.code || '');
    const errMsg = String(errData?.message || '').trim();

    if (errMsg.toLowerCase().includes('too many checkout attempts')) {
      return {
        status: 429,
        headers: { 'Retry-After': '60' },
        body: {
          error: errMsg
        }
      };
    }

    if (errCode === 'PGRST202' || errCode === '42883' || errCode === '42501' || rpcResp.status >= 500) {
      return {
        status: 503,
        body: {
          error:
            'Checkout service is temporarily unavailable while the order database processes requests. Your order has not been placed—please try again shortly.'
        }
      };
    }

    if (errCode === '23505') {
      return {
        status: 409,
        body: {
          error: 'Conflicting order details submitted with an existing checkout request ID.'
        }
      };
    }

    return {
      status: 400,
      body: {
        error: errMsg || 'Unable to validate checkout items. Please review your bag and try again.'
      }
    };
  } catch (err) {
    if (isAbortError(err)) {
      return {
        status: 504,
        body: {
          error:
            'Order confirmation timed out before receiving database confirmation. Please wait a moment and check your order status or retry safely.'
        }
      };
    }

    return {
      status: 503,
      body: {
        error:
          'Unable to reach the order database right now. Your order has not been placed—please check your connection and try again.'
      }
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, 'POST,OPTIONS') === 'ended') {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await processCheckoutOrder(req);
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }
  return res.status(result.status).json(result.body);
}
