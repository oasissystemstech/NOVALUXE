import type { IncomingMessage } from 'http';
import crypto from 'crypto';

export function cleanEnv(val: unknown, fallback: string): string {
  if (!val || typeof val !== 'string') return fallback;
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned || fallback;
}

export function getSupabaseServerConfig(envSource: Record<string, string | undefined> = process.env) {
  const rawUrl = cleanEnv(envSource.SUPABASE_URL || envSource.VITE_SUPABASE_URL, '');
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const serviceRoleKey = cleanEnv(envSource.SUPABASE_SERVICE_ROLE_KEY, '');
  const anonKey = cleanEnv(envSource.SUPABASE_ANON_KEY || envSource.VITE_SUPABASE_ANON_KEY, '');

  return {
    url,
    apiKey: serviceRoleKey || anonKey,
    anonKey,
    hasServiceRole: Boolean(serviceRoleKey),
    isConfigured: Boolean(url && (serviceRoleKey || anonKey))
  };
}

export function getClientIp(req: IncomingMessage): string {
  const vercelFwd = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelFwd === 'string' && vercelFwd.trim()) {
    return vercelFwd.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function hashClientIp(ip: string, envSource: Record<string, string | undefined> = process.env): string {
  const salt = cleanEnv(envSource.ADMIN_SESSION_SECRET, 'novaluxe-rate-limit-salt');
  return crypto.createHmac('sha256', salt).update(ip || 'unknown').digest('hex').slice(0, 32);
}

export async function readJsonBody(req: IncomingMessage & { body?: any }): Promise<Record<string, any>> {
  const body = req.body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body || '{}');
    } catch {
      return {};
    }
  }
  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    return body;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length > 0) {
      return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
    }
  } catch {
    return {};
  }
  return {};
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}
