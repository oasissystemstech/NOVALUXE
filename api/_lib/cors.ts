import type { IncomingMessage, ServerResponse } from 'http';
import { cleanEnv } from './canonicalCatalog';

const DEFAULT_PRODUCTION_ORIGINS = [
  'https://novaluxebysennel.com',
  'https://www.novaluxebysennel.com',
  'https://novaluxe.shop',
  'https://www.novaluxe.shop'
];

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://ais-dev-u7qgfq3but7acrx6qebf7c-544048802525.europe-west3.run.app',
  'https://ais-pre-u7qgfq3but7acrx6qebf7c-544048802525.europe-west3.run.app'
];

export type CorsEnvironmentMode = 'production' | 'preview' | 'development';

export function getCorsEnvironmentMode(
  envSource: Record<string, string | undefined> = process.env
): CorsEnvironmentMode {
  const vercelEnv = cleanEnv(envSource.VERCEL_ENV, '').toLowerCase();
  const nodeEnv = cleanEnv(envSource.NODE_ENV, '').toLowerCase();

  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  if (vercelEnv === 'development') return 'development';

  if (nodeEnv === 'production') return 'production';
  return 'development';
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '*') return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function addCsvOrigins(target: Set<string>, rawCsv: string, requireHttps = false): void {
  if (!rawCsv) return;
  for (const part of rawCsv.split(',')) {
    const normalized = normalizeOrigin(part);
    if (!normalized) continue;
    if (requireHttps && !normalized.startsWith('https://')) continue;
    target.add(normalized);
  }
}

export function getApprovedOrigins(
  envSource: Record<string, string | undefined> = process.env
): Set<string> {
  const mode = getCorsEnvironmentMode(envSource);
  const origins = new Set<string>();

  // 1. Explicit production origins are always approved in every environment
  for (const origin of DEFAULT_PRODUCTION_ORIGINS) {
    const normalized = normalizeOrigin(origin);
    if (normalized) origins.add(normalized);
  }

  // 2. Explicit configured production/app origins (never wildcard *, never arbitrary VERCEL_URL)
  addCsvOrigins(
    origins,
    cleanEnv(envSource.ALLOWED_ORIGINS || envSource.CORS_ALLOWED_ORIGINS, ''),
    mode === 'production'
  );

  // 3. Environment-scoped origins:
  //    - production: ONLY explicit production origins above (no dev localhost/AI Studio, no arbitrary preview VERCEL_URL)
  //    - preview: ONLY explicit PREVIEW_ALLOWED_ORIGINS (+ explicit production/ALLOWED_ORIGINS)
  //    - development: local dev & AI Studio origins + APP_URL
  if (mode === 'preview') {
    addCsvOrigins(origins, cleanEnv(envSource.PREVIEW_ALLOWED_ORIGINS, ''), true);
  } else if (mode === 'development') {
    for (const origin of DEFAULT_DEV_ORIGINS) {
      const normalized = normalizeOrigin(origin);
      if (normalized) origins.add(normalized);
    }

    const devCandidates = [
      cleanEnv(envSource.APP_URL, ''),
      cleanEnv(envSource.VITE_APP_URL, '')
    ];
    for (const candidate of devCandidates) {
      if (!candidate) continue;
      const withProtocol =
        candidate.startsWith('http://') || candidate.startsWith('https://')
          ? candidate
          : `https://${candidate}`;
      const normalized = normalizeOrigin(withProtocol);
      if (normalized) origins.add(normalized);
    }
  }

  return origins;
}

export function evaluateOrigin(
  rawOriginHeader: string | string[] | undefined,
  envSource: Record<string, string | undefined> = process.env
): { hasOrigin: boolean; allowed: boolean; origin: string | null } {
  if (!rawOriginHeader) {
    return { hasOrigin: false, allowed: true, origin: null };
  }
  const raw = Array.isArray(rawOriginHeader) ? rawOriginHeader[0] : rawOriginHeader;
  const normalized = normalizeOrigin(String(raw || ''));
  if (!normalized) {
    return { hasOrigin: true, allowed: false, origin: null };
  }
  const approved = getApprovedOrigins(envSource);
  return {
    hasOrigin: true,
    allowed: approved.has(normalized),
    origin: normalized
  };
}

export function applyCors(
  req: IncomingMessage,
  res: ServerResponse & { status?: (code: number) => any; json?: (data: any) => any },
  allowedMethods: string,
  envSource: Record<string, string | undefined> = process.env
): 'proceed' | 'ended' {
  const check = evaluateOrigin(req.headers['origin'], envSource);

  if (check.hasOrigin && !check.allowed) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Vary', 'Origin');
    res.end(JSON.stringify({ error: 'Origin not allowed by CORS policy.' }));
    return 'ended';
  }

  if (check.hasOrigin && check.origin) {
    res.setHeader('Access-Control-Allow-Origin', check.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
  }
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return 'ended';
  }

  return 'proceed';
}
