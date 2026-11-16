import React, { useState, useRef } from 'react';
import { UploadCloud, Film, Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface PromotionalMediaUploaderProps {
  mediaType: 'video' | 'image';
  mediaUrl: string;
  onMediaChange: (url: string) => void;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export const PromotionalMediaUploader: React.FC<PromotionalMediaUploaderProps> = ({
  mediaType,
  mediaUrl,
  onMediaChange
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptAttr =
    mediaType === 'video'
      ? 'video/mp4,video/webm,video/quicktime'
      : 'image/jpeg,image/png,image/webp,image/jpg';

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSuccess(null);

    const maxBytes = mediaType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxBytes) {
      setError(
        `File exceeds the ${mediaType === 'video' ? '50 MB' : '5 MB'} limit.`
      );
      return;
    }

    setIsUploading(true);
    try {
      if (!supabase || !isSupabaseConfigured) {
        if (mediaType === 'image') {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ''));
            r.onerror = () => reject(new Error('Failed to read file.'));
            r.readAsDataURL(file);
          });
          onMediaChange(dataUrl);
          setSuccess('Promotional image ready.');
          setIsUploading(false);
          return;
        }
        throw new Error('Connect Supabase Storage to upload promotional videos, or paste a hosted video URL below.');
      }

      const sanitized = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
      const path = `promotions/${Date.now()}-${sanitized}`;

      let targetBucket = 'promotional-assets';
      let { error: uploadErr } = await supabase.storage
        .from(targetBucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadErr && uploadErr.message.toLowerCase().includes('not found')) {
        targetBucket = 'product-images';
        const retry = await supabase.storage
          .from(targetBucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });
        uploadErr = retry.error;
      }

      if (uploadErr) {
        if (
          uploadErr.message.toLowerCase().includes('row-level security') ||
          uploadErr.message.toLowerCase().includes('violates')
        ) {
          throw new Error(
            'Storage permission denied: Sign in with your Supabase Admin account and ensure your User UUID is added to public.admin_profiles.'
          );
        }
        throw new Error(uploadErr.message);
      }

      const { data } = supabase.storage.from(targetBucket).getPublicUrl(path);
      if (!data?.publicUrl) {
        throw new Error('Could not retrieve public URL for uploaded promotional asset.');
      }

      onMediaChange(data.publicUrl);
      setSuccess(`Promotional ${mediaType} uploaded to Supabase Storage!`);
    } catch (err: any) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        onChange={e => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={mediaUrl}
          onChange={e => onMediaChange(e.target.value)}
          placeholder={
            mediaType === 'video'
              ? '/videos/novaluxe-promo.mp4 or https://...'
              : '/images/hero/hero_beauty_cosmetics.jpg or https://...'
          }
          className="flex-1 px-3.5 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-xl bg-[#F2EBDD] dark:bg-[#251A38] hover:bg-[#EAE0CC] dark:hover:bg-[#32234B] border border-[#E4DDD0] dark:border-[#482E70] text-xs font-semibold text-[#211B25] dark:text-[#F5D061] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : mediaType === 'video' ? (
            <Film className="w-3.5 h-3.5" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5" />
          )}
          <span>{isUploading ? 'Uploading...' : `Upload ${mediaType === 'video' ? 'Video' : 'Flyer Image'}`}</span>
        </button>
      </div>

      <p className="text-[11px] text-[#746B78] dark:text-[#8C829B]">
        {mediaType === 'video'
          ? 'Supports MP4, WEBM, or MOV (up to 50 MB). Displays poster fallback automatically if a video fails to load.'
          : 'Supports JPG, PNG, or WEBP (up to 5 MB).'}
      </p>

      {success && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
