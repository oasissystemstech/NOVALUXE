import type { IncomingMessage, ServerResponse } from 'http';
import {
  fetchWithTimeout,
  getSupabaseServerConfig,
  isAbortError,
  readJsonBody
} from '../_lib/canonicalCatalog.js';
import { applyCors } from '../_lib/cors.js';
import { verifyAdminRequest } from '../_lib/adminAuth.js';

interface VercelRequest extends IncomingMessage {
  body?: any;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

type BucketName = 'product-images' | 'category-images' | 'promotional-assets';

interface FolderRule {
  prefix: string;
  minSegments: number;
  maxSegments: number;
  maxBytes: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mov'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const BUCKET_RULES: Record<BucketName, FolderRule[]> = {
  'product-images': [
    {
      prefix: 'products/',
      minSegments: 2,
      maxSegments: 3,
      maxBytes: MAX_IMAGE_BYTES,
      allowedExtensions: IMAGE_EXTENSIONS,
      allowedMimeTypes: IMAGE_MIME_TYPES
    }
  ],
  'category-images': [
    {
      prefix: 'categories/',
      minSegments: 2,
      maxSegments: 3,
      maxBytes: MAX_IMAGE_BYTES,
      allowedExtensions: IMAGE_EXTENSIONS,
      allowedMimeTypes: IMAGE_MIME_TYPES
    }
  ],
  'promotional-assets': [
    {
      prefix: 'hero/',
      minSegments: 2,
      maxSegments: 2,
      maxBytes: MAX_IMAGE_BYTES,
      allowedExtensions: IMAGE_EXTENSIONS,
      allowedMimeTypes: IMAGE_MIME_TYPES
    },
    {
      prefix: 'promotions/images/',
      minSegments: 3,
      maxSegments: 3,
      maxBytes: MAX_IMAGE_BYTES,
      allowedExtensions: IMAGE_EXTENSIONS,
      allowedMimeTypes: IMAGE_MIME_TYPES
    },
    {
      prefix: 'promotions/posters/',
      minSegments: 3,
      maxSegments: 3,
      maxBytes: MAX_IMAGE_BYTES,
      allowedExtensions: IMAGE_EXTENSIONS,
      allowedMimeTypes: IMAGE_MIME_TYPES
    },
    {
      prefix: 'promotions/videos/',
      minSegments: 3,
      maxSegments: 3,
      maxBytes: MAX_VIDEO_BYTES,
      allowedExtensions: VIDEO_EXTENSIONS,
      allowedMimeTypes: VIDEO_MIME_TYPES
    }
  ]
};

const EXPECTED_EXT_MIMES: Record<string, string[]> = {
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
  mp4: ['video/mp4'],
  m4v: ['video/mp4'],
  webm: ['video/webm'],
  mov: ['video/quicktime']
};

const ALLOWED_SIGN_BODY_KEYS = new Set(['bucket', 'path', 'contentType', 'fileSize']);

function validateStoragePath(
  bucket: BucketName,
  rawPath: unknown
): { valid: boolean; path?: string; extension?: string; rule?: FolderRule; error?: string } {
  if (typeof rawPath !== 'string') {
    return { valid: false, error: 'Storage path must be a string.' };
  }
  const pathStr = rawPath.trim();
  if (
    !pathStr ||
    pathStr.length > 240 ||
    pathStr.startsWith('/') ||
    pathStr.endsWith('/') ||
    pathStr.includes('//') ||
    pathStr.includes('..') ||
    pathStr.includes('\\') ||
    pathStr.includes('\0') ||
    pathStr.includes('%') ||
    pathStr.includes('?') ||
    pathStr.includes('#') ||
    /\s/.test(pathStr)
  ) {
    return { valid: false, error: 'Malformed or unsafe storage path.' };
  }

  const rules = BUCKET_RULES[bucket];
  const matchedRule = rules.find(r => pathStr.startsWith(r.prefix));
  if (!matchedRule) {
    return {
      valid: false,
      error: `Upload path must use an approved folder for '${bucket}' (${rules.map(r => r.prefix).join(', ')}).`
    };
  }

  const segments = pathStr.split('/');
  if (segments.length < matchedRule.minSegments || segments.length > matchedRule.maxSegments) {
    return { valid: false, error: `Invalid folder depth in storage path for '${bucket}'.` };
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || seg.startsWith('.') || seg.endsWith('.')) {
      return { valid: false, error: 'Malformed path segment.' };
    }
    if (i < segments.length - 1) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(seg)) {
        return { valid: false, error: 'Invalid folder name in storage path.' };
      }
    } else {
      if (!/^[a-z0-9][a-z0-9._-]{0,139}\.[a-z0-9]{2,5}$/i.test(seg)) {
        return { valid: false, error: 'Malformed media filename in storage path.' };
      }
    }
  }

  const filename = segments[segments.length - 1];
  const dotParts = filename.split('.');
  const ext = (dotParts.pop() || '').toLowerCase();
  if (!matchedRule.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension '.${ext}' is not allowed in '${matchedRule.prefix}'. Allowed: ${matchedRule.allowedExtensions.join(', ').toUpperCase()}.`
    };
  }

  return {
    valid: true,
    path: pathStr,
    extension: ext,
    rule: matchedRule
  };
}

export async function processSignedStorageRequest(
  req: VercelRequest,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any> }> {
  const admin = await verifyAdminRequest(req, envSource);
  if (!admin.authorized || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
    return {
      status: admin.configError ? 503 : admin.authorized ? 403 : 401,
      body: { error: admin.reason || 'Unauthorized administrative upload request.' }
    };
  }

  const sb = getSupabaseServerConfig(envSource);
  if (!sb.url || !sb.hasServiceRole || !sb.serviceRoleKey) {
    return {
      status: 503,
      body: {
        errorCode: 'SUPABASE_SERVICE_ROLE_MISSING',
        error:
          'Server storage signing requires SUPABASE_SERVICE_ROLE_KEY or an authenticated Supabase Auth user registered in public.admin_profiles.'
      }
    };
  }

  const body = await readJsonBody(req);
  for (const key of Object.keys(body)) {
    if (!ALLOWED_SIGN_BODY_KEYS.has(key)) {
      return { status: 400, body: { error: `Unexpected field '${key}' in storage sign request.` } };
    }
  }

  const bucketRaw = typeof body.bucket === 'string' ? body.bucket.trim() : '';
  if (bucketRaw !== 'product-images' && bucketRaw !== 'category-images' && bucketRaw !== 'promotional-assets') {
    return { status: 400, body: { error: 'Invalid Supabase Storage bucket requested.' } };
  }
  const bucket = bucketRaw as BucketName;

  const pathCheck = validateStoragePath(bucket, body.path);
  if (!pathCheck.valid || !pathCheck.path || !pathCheck.extension || !pathCheck.rule) {
    return { status: 400, body: { error: pathCheck.error || 'Invalid storage object path.' } };
  }

  const contentType = typeof body.contentType === 'string' ? body.contentType.trim().toLowerCase() : '';
  if (!contentType || !pathCheck.rule.allowedMimeTypes.includes(contentType)) {
    return {
      status: 400,
      body: { error: `Unsupported or missing media MIME type '${contentType || 'empty'}' for '${pathCheck.rule.prefix}'.` }
    };
  }

  const expectedMimes = EXPECTED_EXT_MIMES[pathCheck.extension] || [];
  if (!expectedMimes.includes(contentType)) {
    return {
      status: 400,
      body: { error: `File extension '.${pathCheck.extension}' does not match MIME type '${contentType}'.` }
    };
  }

  const fileSize = Number(body.fileSize);
  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    return { status: 400, body: { error: 'A valid positive integer fileSize (in bytes) is required.' } };
  }
  if (fileSize > pathCheck.rule.maxBytes) {
    const limitMb = Math.round((pathCheck.rule.maxBytes / (1024 * 1024)) * 10) / 10;
    return { status: 400, body: { error: `File size exceeds the maximum ${limitMb} MB limit for '${pathCheck.rule.prefix}'.` } };
  }

  const encodedPath = pathCheck.path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  try {
    const signResp = await fetchWithTimeout(
      `${sb.url}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodedPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: sb.serviceRoleKey,
          Authorization: `Bearer ${sb.serviceRoleKey}`
        },
        body: JSON.stringify({ upsert: false })
      },
      10_000
    );

    const signData = await signResp.json().catch(() => ({}));
    if (!signResp.ok) {
      return {
        status: signResp.status >= 400 ? signResp.status : 500,
        body: {
          error:
            signData?.message ||
            signData?.error ||
            `Failed to create signed upload URL for bucket '${bucket}'.`
        }
      };
    }

    const relativeSignedUrl = typeof signData?.url === 'string' ? signData.url : '';
    let parsedUrl: URL | null = null;
    if (relativeSignedUrl) {
      try {
        parsedUrl = new URL(
          relativeSignedUrl.startsWith('http')
            ? relativeSignedUrl
            : `${sb.url}/storage/v1${relativeSignedUrl.startsWith('/') ? '' : '/'}${relativeSignedUrl}`
        );
      } catch {
        parsedUrl = null;
      }
    }

    const token = typeof signData?.token === 'string' && signData.token.trim()
      ? signData.token.trim()
      : parsedUrl?.searchParams.get('token') || '';

    const expectedSbOrigin = new URL(sb.url).origin;
    if (!token || !parsedUrl || parsedUrl.origin !== expectedSbOrigin) {
      return {
        status: 502,
        body: { error: 'Supabase Storage did not confirm a valid signed upload URL and token.' }
      };
    }

    const publicUrl = `${sb.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;

    return {
      status: 200,
      body: {
        success: true,
        bucket,
        path: pathCheck.path,
        token,
        signedUrl: parsedUrl.toString(),
        publicUrl
      }
    };
  } catch (err: any) {
    if (isAbortError(err)) {
      return { status: 504, body: { error: 'Timed out waiting for Supabase Storage.' } };
    }
    return { status: 500, body: { error: err?.message || 'Storage signing error.' } };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, 'POST,OPTIONS') === 'ended') {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await processSignedStorageRequest(req);
  return res.status(result.status).json(result.body);
}
