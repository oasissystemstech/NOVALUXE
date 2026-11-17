import { supabase, isSupabaseConfigured } from './supabase';
import { inferMimeTypeFromFile } from './promoUtils';

export type StorageBucketName = 'product-images' | 'category-images' | 'promotional-assets';

export interface UploadMediaOptions {
  bucket: StorageBucketName;
  folder: string;
  file: File;
  maxBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  adminToken?: string | null;
}

export interface UploadMediaResult {
  publicUrl: string;
  bucket: string;
  path: string;
  authMode: 'supabase_session' | 'signed_url';
}

const ADMIN_SESSION_TOKEN_KEY = 'novaluxe_admin_auth_token';

function readStoredAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || `asset-${Date.now()}.bin`;
}

export function validateMediaFile(
  file: File,
  maxBytes: number,
  allowedMimeTypes: string[],
  allowedExtensions: string[]
): { valid: boolean; error?: string; resolvedMimeType: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.', resolvedMimeType: '' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const resolvedMimeType = inferMimeTypeFromFile(file);
  const extOk = allowedExtensions.includes(ext);
  const mimeOk = Boolean(resolvedMimeType && allowedMimeTypes.includes(resolvedMimeType));

  if (!extOk || !mimeOk) {
    return {
      valid: false,
      error: `Unsupported file format (.${ext || 'unknown'}). Allowed: ${allowedExtensions.join(', ').toUpperCase()}.`,
      resolvedMimeType
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'Selected file appears empty (0 bytes).',
      resolvedMimeType
    };
  }

  if (file.size > maxBytes) {
    const limitMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    const fileMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${fileMb} MB) exceeds the ${limitMb} MB limit.`,
      resolvedMimeType
    };
  }

  return {
    valid: true,
    resolvedMimeType
  };
}

function isBucketMissingError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('bucket not found') || lower.includes('not found');
}

function isRlsOrAuthError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('row-level security') ||
    lower.includes('violates') ||
    lower.includes('unauthorized') ||
    lower.includes('permission denied') ||
    lower.includes('jwt') ||
    lower.includes('not allowed')
  );
}

async function hasVerifiedSupabaseAdminSession(): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return false;
    const { data: profile, error } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return Boolean(!error && profile && (profile.role === 'admin' || profile.role === 'super_admin'));
  } catch {
    return false;
  }
}

export async function uploadMediaToSupabaseStorage(
  options: UploadMediaOptions
): Promise<UploadMediaResult> {
  const { bucket, folder, file, maxBytes, allowedMimeTypes, allowedExtensions } = options;

  const check = validateMediaFile(file, maxBytes, allowedMimeTypes, allowedExtensions);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid media file.');
  }

  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      'Supabase Storage is not configured. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to upload persistent media.'
    );
  }

  const sanitizedFolder = folder
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map(seg => seg.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const objectPath = `${sanitizedFolder}/${Date.now()}-${uniqueSuffix}-${sanitizeFileName(file.name)}`;
  const contentType = check.resolvedMimeType;

  // 1. Try direct upload when client holds an authenticated admin_profiles Supabase Auth session
  const directAuthReady = await hasVerifiedSupabaseAdminSession();
  let directErrorMessage = '';

  if (directAuthReady) {
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType
      });

    if (!uploadErr) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      if (!pub?.publicUrl) {
        throw new Error('Upload succeeded, but Supabase did not return a public URL.');
      }
      return {
        publicUrl: pub.publicUrl,
        bucket,
        path: objectPath,
        authMode: 'supabase_session'
      };
    }

    directErrorMessage = uploadErr.message || 'Direct Supabase Storage upload failed.';
    if (!isRlsOrAuthError(directErrorMessage) && !isBucketMissingError(directErrorMessage)) {
      throw new Error(directErrorMessage);
    }
  }

  // 2. Fall back to authenticated server-signed upload URL (requires SUPABASE_SERVICE_ROLE_KEY on server)
  const token = options.adminToken || readStoredAdminToken();
  if (token) {
    const signRes = await fetch('/api/admin/storage-sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        bucket,
        path: objectPath,
        contentType,
        fileSize: file.size
      })
    });

    const signJson = await signRes.json().catch(() => ({}));
    if (signRes.ok && signJson?.token && signJson?.publicUrl) {
      const { error: signedUploadErr } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(objectPath, signJson.token, file, {
          contentType,
          cacheControl: '31536000',
          upsert: false
        });

      if (signedUploadErr) {
        throw new Error(signedUploadErr.message || 'Signed upload to Supabase Storage failed.');
      }

      return {
        publicUrl: signJson.publicUrl,
        bucket,
        path: objectPath,
        authMode: 'signed_url'
      };
    }

    if (signJson?.errorCode === 'SUPABASE_SERVICE_ROLE_MISSING') {
      throw new Error(
        directErrorMessage
          ? `${directErrorMessage} (Server fallback also unavailable: add SUPABASE_SERVICE_ROLE_KEY or link your Supabase Auth UUID in public.admin_profiles.)`
          : 'Storage upload requires either an authenticated Supabase Auth user registered in public.admin_profiles OR SUPABASE_SERVICE_ROLE_KEY configured on the server.'
      );
    }

    if (signJson?.error) {
      throw new Error(signJson.error);
    }
  }

  throw new Error(
    directErrorMessage ||
      'Unable to authorize upload to Supabase Storage. Sign in with an admin account registered in public.admin_profiles or configure SUPABASE_SERVICE_ROLE_KEY.'
  );
}
