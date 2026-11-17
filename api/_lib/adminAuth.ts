import type { IncomingMessage } from 'http';
import crypto from 'crypto';
import { cleanEnv, fetchWithTimeout, getSupabaseServerConfig } from './canonicalCatalog.js';

export type AdminRole = 'admin' | 'super_admin';

export interface VerifiedAdminIdentity {
  authorized: boolean;
  authMethod?: 'hmac' | 'supabase_jwt';
  role?: AdminRole;
  email?: string;
  userId?: string;
  reason?: string;
  configError?: boolean;
}

const KNOWN_WEAK_SECRETS = new Set([
  'novaluxe-sennel-secure-session-key-2026',
  'your-random-32-character-session-secret',
  'changeme',
  'secret',
  'default',
  'novaluxe-secret',
  'test-secret'
]);

const MIN_HMAC_SECRET_LENGTH = 32;
const MIN_UNIQUE_SECRET_CHARS = 10;

export function validateHmacSecret(
  envSource: Record<string, string | undefined> = process.env
): { valid: boolean; secret?: string; reason?: string } {
  const secret = cleanEnv(envSource.ADMIN_SESSION_SECRET, '');
  if (!secret) {
    return {
      valid: false,
      reason: 'Server configuration error: ADMIN_SESSION_SECRET is not configured.'
    };
  }
  if (KNOWN_WEAK_SECRETS.has(secret.toLowerCase())) {
    return {
      valid: false,
      reason: 'Server configuration error: ADMIN_SESSION_SECRET uses a rejected default/placeholder value.'
    };
  }
  if (secret.length < MIN_HMAC_SECRET_LENGTH) {
    return {
      valid: false,
      reason: `Server configuration error: ADMIN_SESSION_SECRET must be at least ${MIN_HMAC_SECRET_LENGTH} characters.`
    };
  }
  if (new Set(secret).size < MIN_UNIQUE_SECRET_CHARS) {
    return {
      valid: false,
      reason: 'Server configuration error: ADMIN_SESSION_SECRET has insufficient character entropy.'
    };
  }
  return { valid: true, secret };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export function timingSafeCompareStrings(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function signAdminHmacToken(
  email: string,
  role: AdminRole,
  secret: string,
  ttlMs = 24 * 60 * 60 * 1000
): string {
  const expiry = Date.now() + ttlMs;
  const payload = `${email}:${role}:${expiry}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ email, role, expiry, sig })).toString('base64');
}

export function verifyAdminHmacToken(
  token: string,
  envSource: Record<string, string | undefined> = process.env
): { valid: boolean; email?: string; role?: AdminRole; reason?: string; configError?: boolean } {
  const secretCheck = validateHmacSecret(envSource);
  if (!secretCheck.valid || !secretCheck.secret) {
    return { valid: false, reason: secretCheck.reason, configError: true };
  }

  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    const { email, role, expiry, sig } = parsed || {};

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      (role !== 'admin' && role !== 'super_admin') ||
      typeof expiry !== 'number' ||
      !Number.isFinite(expiry) ||
      typeof sig !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(sig)
    ) {
      return { valid: false, reason: 'Malformed administrator session token.' };
    }

    if (Date.now() > expiry) {
      return { valid: false, reason: 'Administrator session token has expired.' };
    }

    const expectedSig = crypto
      .createHmac('sha256', secretCheck.secret)
      .update(`${email}:${role}:${expiry}`)
      .digest('hex');

    if (timingSafeEqualHex(sig.toLowerCase(), expectedSig)) {
      return { valid: true, email: email.trim(), role };
    }
    return { valid: false, reason: 'Invalid administrator session signature.' };
  } catch {
    return { valid: false, reason: 'Unreadable administrator session token.' };
  }
}

export function extractBearerToken(req: IncomingMessage): string | null {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    return token || null;
  }
  return null;
}

export async function verifyAdminRequest(
  req: IncomingMessage,
  envSource: Record<string, string | undefined> = process.env
): Promise<VerifiedAdminIdentity> {
  const token = extractBearerToken(req);
  if (!token) {
    return { authorized: false, reason: 'Missing administrator Authorization token.' };
  }

  // 1. Check backend HMAC admin session token (strictly requires strong ADMIN_SESSION_SECRET)
  const isJwtFormat = token.split('.').length === 3;
  if (!isJwtFormat) {
    const hmacResult = verifyAdminHmacToken(token, envSource);
    if (hmacResult.valid && hmacResult.email && hmacResult.role) {
      return {
        authorized: true,
        authMethod: 'hmac',
        role: hmacResult.role,
        email: hmacResult.email
      };
    }
    if (hmacResult.configError) {
      return {
        authorized: false,
        configError: true,
        reason: hmacResult.reason
      };
    }
    return {
      authorized: false,
      reason: hmacResult.reason || 'Invalid or expired administrator credentials.'
    };
  }

  // 2. Check Supabase Auth JWT + public.admin_profiles authorization
  const sbConfig = getSupabaseServerConfig(envSource);
  if (sbConfig.url && (sbConfig.anonKey || sbConfig.apiKey)) {
    const apiKey = sbConfig.anonKey || sbConfig.apiKey;
    try {
      const userResp = await fetchWithTimeout(
        `${sbConfig.url}/auth/v1/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: apiKey
          }
        },
        8000
      );

      if (userResp.ok) {
        const user = await userResp.json();
        if (user?.id) {
          const profileResp = await fetchWithTimeout(
            `${sbConfig.url}/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=role`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                apikey: apiKey
              }
            },
            8000
          );

          if (profileResp.ok) {
            const profiles = await profileResp.json();
            if (Array.isArray(profiles) && profiles.length > 0) {
              const isSuper = profiles.some((p: any) => p?.role === 'super_admin');
              const isStd = profiles.some((p: any) => p?.role === 'admin');
              if (isSuper || isStd) {
                return {
                  authorized: true,
                  authMethod: 'supabase_jwt',
                  role: isSuper ? 'super_admin' : 'admin',
                  email: user.email || 'administrator',
                  userId: user.id
                };
              }
            }
          }
        }
      }
    } catch {
      return { authorized: false, reason: 'Failed to verify administrator token against Supabase Auth.' };
    }
  }

  return { authorized: false, reason: 'Invalid or expired administrator credentials.' };
}
