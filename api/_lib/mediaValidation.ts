import { cleanEnv, getSupabaseServerConfig } from './canonicalCatalog';

export type MediaUrlKind = 'product' | 'category' | 'promo_image' | 'promo_video';

const LEGACY_LOCAL_IMAGE_REGEX =
  /^\/images\/(?:(?:products|categories|hero|ceo)\/)?[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;

const SAFE_STORAGE_IMAGE_EXT_REGEX = /\.(?:jpg|jpeg|png|webp)$/i;
const SAFE_STORAGE_VIDEO_EXT_REGEX = /\.(?:mp4|m4v|webm|mov)$/i;

const CANONICAL_SUPABASE_HOST = 'srclselecvagahijkonu.supabase.co';

export function hasUnsafeUrlScheme(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  );
}

export function getTrustedMediaHosts(
  envSource: Record<string, string | undefined> = process.env
): Set<string> {
  const hosts = new Set<string>();
  const raw = cleanEnv(envSource.TRUSTED_MEDIA_HOSTS, '');
  if (!raw) return hosts;

  for (const part of raw.split(',')) {
    const cleaned = part.trim().toLowerCase();
    if (!cleaned || cleaned === '*') continue;
    try {
      const parsed = new URL(
        cleaned.startsWith('http://') || cleaned.startsWith('https://')
          ? cleaned
          : `https://${cleaned}`
      );
      if (parsed.hostname && parsed.hostname !== '*') {
        hosts.add(parsed.hostname.toLowerCase());
      }
    } catch {
      // Ignore malformed host entry
    }
  }
  return hosts;
}

export function isApprovedMediaUrl(
  value: unknown,
  kind: MediaUrlKind,
  opts: {
    allowEmpty?: boolean;
    envSource?: Record<string, string | undefined>;
  } = {}
): boolean {
  const allowEmpty = opts.allowEmpty ?? false;
  const envSource = opts.envSource ?? process.env;

  if (value === undefined || value === null || value === '') {
    return allowEmpty;
  }
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (!trimmed) return allowEmpty;
  if (
    trimmed.length > 2048 ||
    hasUnsafeUrlScheme(trimmed) ||
    trimmed.includes('..') ||
    trimmed.includes('\\') ||
    /\s/.test(trimmed)
  ) {
    return false;
  }

  // 1. Explicitly approved legacy local image paths (never valid for video)
  if (trimmed.startsWith('/')) {
    if (kind === 'promo_video') return false;
    return LEGACY_LOCAL_IMAGE_REGEX.test(trimmed);
  }

  // 2. HTTPS URLs only for remote assets
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const sb = getSupabaseServerConfig(envSource);
  let approvedSupabaseHost = CANONICAL_SUPABASE_HOST;
  if (sb.url) {
    try {
      approvedSupabaseHost = new URL(sb.url).hostname.toLowerCase();
    } catch {
      approvedSupabaseHost = CANONICAL_SUPABASE_HOST;
    }
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 3. Approved Supabase Storage public object URLs for this project's buckets
  if (host === approvedSupabaseHost || host === CANONICAL_SUPABASE_HOST) {
    const bucketPrefixes: Record<MediaUrlKind, string[]> = {
      product: ['/storage/v1/object/public/product-images/'],
      category: [
        '/storage/v1/object/public/category-images/',
        '/storage/v1/object/public/promotional-assets/'
      ],
      promo_image: ['/storage/v1/object/public/promotional-assets/'],
      promo_video: ['/storage/v1/object/public/promotional-assets/']
    };

    const allowedPrefixes = bucketPrefixes[kind];
    const matchesBucket = allowedPrefixes.some(prefix => pathname.startsWith(prefix));
    if (!matchesBucket) return false;

    const extRegex =
      kind === 'promo_video' ? SAFE_STORAGE_VIDEO_EXT_REGEX : SAFE_STORAGE_IMAGE_EXT_REGEX;
    return extRegex.test(pathname);
  }

  // 4. Explicitly configured trusted external media host allowlist (HTTPS only)
  const trustedHosts = getTrustedMediaHosts(envSource);
  if (trustedHosts.has(host)) {
    const extRegex =
      kind === 'promo_video' ? SAFE_STORAGE_VIDEO_EXT_REGEX : SAFE_STORAGE_IMAGE_EXT_REGEX;
    return extRegex.test(pathname);
  }

  return false;
}
