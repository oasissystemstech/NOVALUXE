import type { IncomingMessage, ServerResponse } from 'http';
import {
  fetchWithTimeout,
  getClientIp,
  getSupabaseServerConfig,
  hashClientIp,
  isAbortError,
  readJsonBody
} from '../_lib/canonicalCatalog.js';
import { applyCors } from '../_lib/cors.js';

interface VercelRequest extends IncomingMessage {
  body?: any;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

const GENERIC_NOT_FOUND_MESSAGE =
  'No matching order was found. Please verify your exact order reference and full phone number.';

export async function processOrderLookup(
  req: VercelRequest,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any>; headers?: Record<string, string> }> {
  const payload = await readJsonBody(req);
  const orderReference = String(payload.orderReference || '').trim().toUpperCase();
  const customerPhone = String(payload.customerPhone || '').trim();
  const phoneDigits = customerPhone.replace(/\D/g, '');

  if (orderReference.length < 6 || phoneDigits.length < 7) {
    return {
      status: 400,
      body: {
        error: 'Please enter a valid order reference and full customer phone number.'
      }
    };
  }

  const sb = getSupabaseServerConfig(envSource);
  if (!sb.url || !sb.hasServiceRole || !sb.serviceRoleKey) {
    return {
      status: 503,
      body: {
        error: 'Order tracking service is temporarily unavailable. Please try again later.'
      }
    };
  }

  // Hash normalized client IP so rate limiting in Supabase works durably across all serverless instances
  // without storing raw client IP addresses in the database.
  const clientIpHash = hashClientIp(getClientIp(req), envSource);

  try {
    const rpcResp = await fetchWithTimeout(
      `${sb.url}/rest/v1/rpc/lookup_order_by_reference`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: sb.serviceRoleKey,
          Authorization: `Bearer ${sb.serviceRoleKey}`
        },
        body: JSON.stringify({
          p_order_reference: orderReference,
          p_customer_phone: customerPhone,
          p_client_ip: clientIpHash
        })
      },
      10_000
    );

    if (rpcResp.ok) {
      const result = await rpcResp.json().catch(() => null);
      if (!result) {
        return { status: 404, body: { error: GENERIC_NOT_FOUND_MESSAGE } };
      }

      if (result.rateLimited) {
        const retryAfterSec = Math.max(1, Number(result.retryAfterSec || 60));
        return {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSec) },
          body: {
            error: `Too many order verification attempts. Please wait ${retryAfterSec} seconds and try again.`
          }
        };
      }

      // Return minimized non-PII status & receipt snapshot only
      return {
        status: 200,
        body: {
          success: true,
          order: {
            orderReference: result.orderReference,
            orderStatus: result.orderStatus,
            paymentStatus: result.paymentStatus,
            deliveryMethod: result.deliveryMethod,
            deliveryLocation: result.deliveryLocation,
            deliveryFee: Number(result.deliveryFee || 0),
            subtotal: Number(result.subtotal || 0),
            totalAmount: Number(result.totalAmount || 0),
            currency: result.currency || '$',
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            items: Array.isArray(result.items) ? result.items : []
          }
        }
      };
    }

    const errData = await rpcResp.json().catch(() => ({}));
    const errCode = String(errData?.code || '');

    if (errCode === 'PGRST202' || errCode === '42883' || rpcResp.status >= 500) {
      return {
        status: 503,
        body: {
          error: 'Order tracking service is temporarily unavailable. Please try again shortly.'
        }
      };
    }

    return { status: 404, body: { error: GENERIC_NOT_FOUND_MESSAGE } };
  } catch (err) {
    if (isAbortError(err)) {
      return {
        status: 504,
        body: {
          error: 'Order verification timed out. Please wait a moment and try again.'
        }
      };
    }

    return {
      status: 503,
      body: {
        error: 'Unable to reach the order tracking database right now. Please try again shortly.'
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

  const result = await processOrderLookup(req);
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }
  return res.status(result.status).json(result.body);
}
