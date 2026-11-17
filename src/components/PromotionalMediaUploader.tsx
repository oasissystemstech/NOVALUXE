import React, { useState, useRef } from 'react';
import {
  Film,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { uploadMediaToSupabaseStorage } from '../lib/storageUpload';

interface PromotionalMediaUploaderProps {
  mediaType: 'video' | 'image';
  mediaUrl: string;
  onMediaChange: (url: string) => void;
  folder?: string;
  buttonLabel?: string;
  placeholder?: string;
  helperText?: string;
  onUploadStateChange?: (isUploading: boolean) => void;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mov'];

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const PromotionalMediaUploader: React.FC<PromotionalMediaUploaderProps> = ({
  mediaType,
  mediaUrl,
  onMediaChange,
  folder,
  buttonLabel,
  placeholder,
  helperText,
  onUploadStateChange
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptAttr =
    mediaType === 'video'
      ? 'video/mp4,video/webm,video/quicktime,.mp4,.m4v,.webm,.mov'
      : 'image/jpeg,image/png,image/webp,image/jpg';

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setWarning(null);
    setSuccess(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (mediaType === 'video' && ext === 'mov') {
      setWarning(
        'Note: .MOV files recorded on iPhone (HEVC) do not decode on all Android/Chrome browsers. H.264 MP4 (.mp4) is recommended for universal mobile & desktop playback.'
      );
    }

    setIsUploading(true);
    onUploadStateChange?.(true);

    try {
      const result = await uploadMediaToSupabaseStorage({
        bucket: 'promotional-assets',
        folder: folder || (mediaType === 'video' ? 'promotions/videos' : 'promotions/images'),
        file,
        maxBytes: mediaType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE,
        allowedMimeTypes: mediaType === 'video' ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES,
        allowedExtensions: mediaType === 'video' ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS
      });

      onMediaChange(result.publicUrl);
      setSuccess(
        `Uploaded to Supabase Storage (${result.bucket}). Click Save & Publish below to update the live storefront.`
      );
    } catch (err: any) {
      // Preserve previously published mediaUrl untouched on failure
      setError(
        err?.message ||
          'Upload failed. Previously published media was preserved.'
      );
    } finally {
      setIsUploading(false);
      onUploadStateChange?.(false);
    }
  };

  const isSupabaseHosted = Boolean(
    mediaUrl && (mediaUrl.includes('supabase.co') || mediaUrl.includes('/storage/v1/object/public/'))
  );

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
          onChange={e => {
            setError(null);
            onMediaChange(e.target.value);
          }}
          placeholder={
            placeholder ||
            (mediaType === 'video'
              ? 'https://.../novaluxe-promo.mp4'
              : '/images/hero/hero_beauty_cosmetics.jpg or https://...')
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
          <span>
            {isUploading
              ? 'Uploading...'
              : buttonLabel || `Upload ${mediaType === 'video' ? 'Video' : 'Image'}`}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#746B78] dark:text-[#8C829B]">
        <span>
          {helperText ||
            (mediaType === 'video'
              ? 'Recommended: H.264 MP4 or WebM (up to 50 MB) for instant mobile & desktop playback.'
              : 'Supports JPG, PNG, or WEBP (up to 5 MB).')}
        </span>

        {mediaUrl && (
          <span className="inline-flex items-center gap-1.5">
            {isSupabaseHosted ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Supabase Storage
              </span>
            ) : null}
            {!mediaUrl.startsWith('data:') && !mediaUrl.startsWith('blob:') && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[10px] text-[#8B42C9] dark:text-[#F5D061] hover:underline inline-flex items-center gap-0.5"
              >
                <span>Open URL</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </span>
        )}
      </div>

      {warning && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {success && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
