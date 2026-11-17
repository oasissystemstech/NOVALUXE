import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import {
  cleanEnv,
  fetchWithTimeout,
  getClientIp,
  getSupabaseServerConfig,
  hashClientIp,
  isAbortError,
  readJsonBody
} from '../_lib/canonicalCatalog';
import { applyCors } from '../_lib/cors';
import {
  AdminRole,
  signAdminHmacToken,
  timingSafeCompareStrings,
  validateHmacSecret
} from '../_lib/adminAuth';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: { [key: string]: string | string[] };
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

type RateLimitRpcResult =
  | { ok: true; rateLimited: boolean; retryAfterSec: number }
  | { ok: false; status: 503 | 504; error: string };

function hashAccountIdentifier(
  identifier: string,
  sessionSecret: string,
  envSource: Record<string, string | undefined>
): string {
  const salt = cleanEnv(envSource.RATE_LIMIT_SALT, '') || sessionSecret;
  return crypto
    .createHmac('sha256', salt)
    .update(identifier.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

async function callSupabaseLoginRateLimitRpc(
  action: 'check' | 'fail' | 'reset',
  accountHash: string,
  ipHash: string,
  envSource: Record<string, string | undefined>
): Promise<RateLimitRpcResult> {
  const sb = getSupabaseServerConfig(envSource);
  if (!sb.url || !sb.hasServiceRole || !sb.serviceRoleKey) {
    return {
      ok: false,
      status: 503,
      error:
        'Administrator authentication is temporarily unavailable because server database rate-limiting credentials are not configured.'
    };
  }

  try {
    const resp = await fetchWithTimeout(
      `${sb.url}/rest/v1/rpc/admin_login_rate_limit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: sb.serviceRoleKey,
          Authorization: `Bearer ${sb.serviceRoleKey}`
        },
        body: JSON.stringify({
          p_action: action,
          p_account_key: accountHash,
          p_ip_hash: ipHash
        })
      },
      5000
    );

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const errCode = String(errData?.code || '');
      if (errCode === 'PGRST202' || errCode === '42883' || errCode === '42501') {
        return {
          ok: false,
          status: 503,
          error:
            'Administrator authentication is temporarily unavailable because the database login rate-limit service is not ready.'
        };
      }
      return {
        ok: false,
        status: 503,
        error:
          'Administrator authentication is temporarily unavailable while verifying security rate limits. Please try again shortly.'
      };
    }

    const data = await resp.json().catch(() => null);
    if (!data || typeof data !== 'object' || typeof data.rateLimited !== 'boolean') {
      return {
        ok: false,
        status: 503,
        error:
          'Administrator authentication rate-limit verification returned an invalid response. Please try again shortly.'
      };
    }

    return {
      ok: true,
      rateLimited: data.rateLimited,
      retryAfterSec: Math.max(0, Number(data.retryAfterSec || 0))
    };
  } catch (err) {
    if (isAbortError(err)) {
      return {
        ok: false,
        status: 504,
        error:
          'Administrator authentication timed out while verifying security rate limits. Please wait a moment and try again.'
      };
    }
    return {
      ok: false,
      status: 503,
      error:
        'Unable to reach the authentication security database right now. Please try again shortly.'
    };
  }
}

export async function processAdminLogin(
  req: VercelRequest,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any>; headers?: Record<string, string> }> {
  const secretCheck = validateHmacSecret(envSource);
  if (!secretCheck.valid || !secretCheck.secret) {
    return {
      status: 503,
      body: {
        error:
          secretCheck.reason ||
          'Administrator authentication is misconfigured: ADMIN_SESSION_SECRET must be at least 32 characters.'
      }
    };
  }

  // Strict explicit ADMIN_ROLE requirement: never default or coerce invalid roles
  const configuredRole = cleanEnv(envSource.ADMIN_ROLE, '');
  if (configuredRole !== 'admin' && configuredRole !== 'super_admin') {
    return {
      status: 503,
      body: {
        error:
          'Server configuration error: ADMIN_ROLE must be explicitly configured as "admin" or "super_admin".'
      }
    };
  }
  const role: AdminRole = configuredRole;

  const serverAdminUsername = cleanEnv(envSource.ADMIN_USERNAME, '').toLowerCase();
  const serverAdminEmail = cleanEnv(envSource.ADMIN_EMAIL, '').toLowerCase();
  const serverAdminPassword = cleanEnv(envSource.ADMIN_PASSWORD, '');

  if ((!serverAdminUsername && !serverAdminEmail) || !serverAdminPassword) {
    return {
      status: 503,
      body: {
        error:
          'Server configuration error: ADMIN_PASSWORD and ADMIN_USERNAME or ADMIN_EMAIL must be configured.'
      }
    };
  }

  // Fail closed when durable server-side Supabase rate-limiting credentials are absent
  const sb = getSupabaseServerConfig(envSource);
  if (!sb.url || !sb.hasServiceRole || !sb.serviceRoleKey) {
    return {
      status: 503,
      body: {
        error:
          'Administrator authentication is temporarily unavailable because server database rate-limiting credentials are not configured.'
      }
    };
  }

  const body = await readJsonBody(req);
  const rawIdentifier = body?.username || body?.email;
  const password = body?.password;

  if (!rawIdentifier || !password) {
    return { status: 400, body: { error: 'Username/email and password are required.' } };
  }

  const trimmedIdentifier = String(rawIdentifier).trim().toLowerCase();
  const rawPassword = String(password);
  const ipHash = hashClientIp(getClientIp(req), envSource);
  const accountHash = hashAccountIdentifier(trimmedIdentifier, secretCheck.secret, envSource);

  // Fail closed on durable Supabase rate-limit check before verifying credentials
  const remotePreCheck = await callSupabaseLoginRateLimitRpc('check', accountHash, ipHash, envSource);
  if (!remotePreCheck.ok) {
    return {
      status: remotePreCheck.status,
      body: { error: remotePreCheck.error }
    };
  }
  if (remotePreCheck.rateLimited) {
    const waitSec = Math.max(1, remotePreCheck.retryAfterSec || 60);
    return {
      status: 429,
      headers: { 'Retry-After': String(waitSec) },
      body: {
        error: `Too many failed sign-in attempts. Please wait ${waitSec} seconds before trying again.`
      }
    };
  }

  // Always run constant-time password hashes regardless of identifier match to prevent timing leaks
  const validIdentifiers = new Set(
    [serverAdminUsername, serverAdminEmail].filter(Boolean)
  );
  const identifierMatches = validIdentifiers.has(trimmedIdentifier);
  const passwordMatches = timingSafeCompareStrings(rawPassword, serverAdminPassword);

  if (!identifierMatches || !passwordMatches) {
    const remoteFail = await callSupabaseLoginRateLimitRpc('fail', accountHash, ipHash, envSource);
    if (!remoteFail.ok) {
      return {
        status: remoteFail.status,
        body: { error: remoteFail.error }
      };
    }

    if (remoteFail.rateLimited) {
      const waitSec = Math.max(1, remoteFail.retryAfterSec || 60);
      return {
        status: 429,
        headers: { 'Retry-After': String(waitSec) },
        body: {
          error: `Too many failed sign-in attempts. Please wait ${waitSec} seconds before trying again.`
        }
      };
    }

    // Never disclose whether username or password was incorrect
    return { status: 401, body: { error: 'Invalid administrative credentials.' } };
  }

  // Successful login resets both account and IP failure counters durably (fail closed on RPC error)
  const remoteReset = await callSupabaseLoginRateLimitRpc('reset', accountHash, ipHash, envSource);
  if (!remoteReset.ok) {
    return {
      status: remoteReset.status,
      body: { error: remoteReset.error }
    };
  }

  const token = signAdminHmacToken(trimmedIdentifier, role, secretCheck.secret);

  return {
    status: 200,
    body: {
      success: true,
      token,
      supabaseEmail: serverAdminEmail || undefined,
      user: {
        id: 'usr-admin-sennel',
        email: trimmedIdentifier,
        role
      }
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, 'POST,OPTIONS') === 'ended') {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const result = await processAdminLogin(req);
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }
    return res.status(result.status).json(result.body);
  } catch {
    return res.status(500).json({ error: 'Authentication service encountered an internal error.' });
  }
}
