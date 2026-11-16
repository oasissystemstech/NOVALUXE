import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  Sparkles,
  Loader2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleImageError } from '../lib/imageUtils';

interface ProductImageUploaderProps {
  imageUrl?: string;
  productId?: string;
  onImageChange: (url: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  label?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  imageUrl = '',
  productId = 'new-product',
  onImageChange,
  onUploadStateChange,
  label = 'Product Image'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState(imageUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync manual input with prop updates
  useEffect(() => {
    setManualUrlInput(imageUrl);
  }, [imageUrl]);

  // Inform parent of upload state
  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange(isUploading);
    }
  }, [isUploading, onUploadStateChange]);

  const handleOpenFileDialog = () => {
    setError(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const validateFile = (file: File): string | null => {
    if (!file) {
      return 'No file selected.';
    }

    // Check MIME type and file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isExtensionAllowed = ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '');
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);

    if (!isMimeAllowed && !isExtensionAllowed) {
      return 'Please select a valid JPG, PNG, or WEBP image.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `Image size must not exceed 5 MB. Selected file is ${sizeMB} MB.`;
    }

    return null;
  };

  const processAndUploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);
    setUploadProgress(10);

    // Progress simulation interval
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 85) return prev + Math.floor(Math.random() * 15) + 5;
        return prev;
      });
    }, 150);

    try {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error('Supabase client is not connected. Please check your Supabase configuration.');
      }

      // Generate sanitized unique storage path: products/{productId}/{timestamp}-{filename}
      const sanitizedName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '-')
        .replace(/-+/g, '-');
      const timestamp = Date.now();
      const storagePath = `products/${productId}/${timestamp}-${sanitizedName}`;

      // Upload to Supabase Storage bucket 'product-images'
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (uploadError) {
        clearInterval(progressTimer);
        // Informative guidance for bucket setup
        if (
          uploadError.message.toLowerCase().includes('bucket not found') ||
          uploadError.message.toLowerCase().includes('not found')
        ) {
          throw new Error(
            `Supabase Storage bucket 'product-images' was not found. Please run the bucket setup script in the Supabase SQL tab.`
          );
        }
        if (
          uploadError.message.toLowerCase().includes('row-level security') ||
          uploadError.message.toLowerCase().includes('violates') ||
          uploadError.message.toLowerCase().includes('unauthorized')
        ) {
          throw new Error(
            `Storage permission denied: Sign in with your Supabase Admin account and ensure your User UUID is registered in public.admin_profiles (see Supabase SQL tab).`
          );
        }
        throw new Error(uploadError.message || 'Failed to upload image to Supabase Storage.');
      }

      // Retrieve public URL from Supabase Storage
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Could not retrieve public URL for uploaded image.');
      }

      clearInterval(progressTimer);
      setUploadProgress(100);

      const finalUrl = publicUrlData.publicUrl;
      onImageChange(finalUrl);
      setManualUrlInput(finalUrl);
      setSuccessMessage('Image successfully uploaded to Supabase Storage!');

      // Reset progress indicator after a brief delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 600);
    } catch (err: any) {
      clearInterval(progressTimer);
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Upload error:', err);
      setError(err?.message || 'An unexpected error occurred during image upload.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAndUploadFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processAndUploadFile(files[0]);
    }
  };

  const handleRemoveImage = () => {
    setError(null);
    setSuccessMessage(null);
    onImageChange('');
    setManualUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyManualUrl = () => {
    const trimmed = manualUrlInput.trim();
    if (!trimmed) {
      setError('Please enter a valid image URL.');
      return;
    }
    setError(null);
    onImageChange(trimmed);
    setSuccessMessage('Image path updated manually.');
  };

  const hasImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const isSupabaseHosted = Boolean(
    imageUrl && (imageUrl.includes('supabase.co') || imageUrl.includes('/storage/v1/object/public/'))
  );

  return (
    <div className="space-y-3">
      {/* Label and Actions Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#211B25] dark:text-[#C5B9D8] flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-[#8B42C9] dark:text-[#A855F7]" />
          <span>{label}</span>
          <span className="text-red-500 dark:text-red-400 text-xs">*</span>
        </label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] text-[#8B42C9] dark:text-[#A855F7] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showManualInput ? 'Hide Manual URL' : 'Or enter URL manually'}</span>
        </button>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload product image file"
      />

      {/* Main Upload / Preview Area */}
      {hasImage ? (
        <div className="relative rounded-2xl border border-[#E4DDD0] dark:border-[#3B2D54] bg-[#FAF8F4] dark:bg-[#120D1B] p-4 flex flex-col sm:flex-row items-center gap-4 transition-all">
          <div className="relative group shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-white dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#2E1E4B]">
            <img
              src={imageUrl}
              alt="Product Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-[#0A0710]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-2 text-center">
                <Loader2 className="w-6 h-6 text-[#F5D061] animate-spin" />
                <span className="text-[10px] text-[#F3EFEA] font-medium">{uploadProgress}%</span>
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#211B25] dark:text-[#F3EFEA]">Active Product Image</span>
              {isSupabaseHosted ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  Supabase Storage
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F2EBDD] dark:bg-[#251A38] text-[#211B25] dark:text-[#C5B9D8] border border-[#E4DDD0] dark:border-[#3B2D54]">
                  Asset / Direct URL
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#746B78] dark:text-[#8C829B] font-mono truncate max-w-xs sm:max-w-md" title={imageUrl}>
              {imageUrl}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenFileDialog}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-xl bg-[#F2EBDD] dark:bg-[#251A38] hover:bg-[#EAE0CC] dark:hover:bg-[#34244C] text-[#211B25] dark:text-[#F3EFEA] text-xs font-medium border border-[#E4DDD0] dark:border-[#482E70] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C99A35] dark:text-[#F5D061] ${isUploading ? 'animate-spin' : ''}`} />
                <span>Replace Image</span>
              </button>

              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1227] hover:bg-[#FAF8F4] dark:hover:bg-[#251A38] text-[#746B78] dark:text-[#C5B9D8] text-xs font-medium border border-[#E4DDD0] dark:border-[#2E1E4B] flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Full</span>
              </a>

              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-800/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleOpenFileDialog}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#8B42C9] dark:border-[#A855F7] bg-[#F2EBDD]/80 dark:bg-[#221338]/60 shadow-lg scale-[1.01]'
              : 'border-[#E4DDD0] dark:border-[#3B2D54] hover:border-[#8B42C9] dark:hover:border-[#A855F7]/70 bg-[#FAF8F4] dark:bg-[#120D1B] hover:bg-[#F2EBDD]/50 dark:hover:bg-[#181124]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#F2EBDD] dark:bg-gradient-to-tr dark:from-[#251A38] dark:to-[#3B2456] border border-[#E4DDD0] dark:border-[#52327A] flex items-center justify-center text-[#C99A35] dark:text-[#F5D061] shadow-inner mb-3 transition-transform">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1 max-w-sm">
            <h4 className="text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA]">
              {isUploading ? 'Uploading to Supabase...' : 'Choose a product image'}
            </h4>
            <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
              Drag and drop an image here, or{' '}
              <span className="text-[#8B42C9] dark:text-[#F5D061] font-semibold underline underline-offset-2">browse computer</span>
            </p>
            <p className="text-[11px] text-[#746B78] dark:text-[#7C6E91]">Supports JPG, PNG, or WEBP (up to 5 MB)</p>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs shadow-md">
              <UploadCloud className="w-4 h-4" />
              <span>Choose Image from Computer</span>
            </span>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="p-3 rounded-xl bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#3B2D54] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#211B25] dark:text-[#C5B9D8] flex items-center gap-1.5 font-medium">
              <Loader2 className="w-3.5 h-3.5 text-[#C99A35] dark:text-[#F5D061] animate-spin" />
              <span>Uploading image to Supabase Storage bucket &apos;product-images&apos;...</span>
            </span>
            <span className="text-[#C99A35] dark:text-[#F5D061] font-mono font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E4DDD0] dark:bg-[#0D0914] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:via-[#C084FC] dark:to-[#F5D061] transition-all duration-200 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {successMessage && !isUploading && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && !isUploading && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-200 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Upload Issue</p>
              <p className="text-[11px] leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 pl-6">
            <button
              type="button"
              onClick={handleOpenFileDialog}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualInput(true);
                setError(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] text-[#211B25] dark:text-[#C5B9D8] text-[11px] font-medium transition-colors cursor-pointer"
            >
              Enter URL Manually
            </button>
          </div>
        </div>
      )}

      {showManualInput && (
        <div className="p-3 rounded-xl bg-[#FAF8F4] dark:bg-[#0F0B17] border border-[#E4DDD0] dark:border-[#2E1E4B] space-y-2">
          <label className="text-[11px] font-medium text-[#746B78] dark:text-[#9C8EB2] block">
            Direct Image URL or Path (Override)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualUrlInput}
              onChange={e => setManualUrlInput(e.target.value)}
              placeholder="https://... or /images/products/..."
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
            />
            <button
              type="button"
              onClick={handleApplyManualUrl}
              className="px-3 py-1.5 rounded-xl bg-[#F2EBDD] dark:bg-[#251A38] hover:bg-[#EAE0CC] dark:hover:bg-[#34244C] text-[#211B25] dark:text-[#F5D061] text-xs font-semibold border border-[#E4DDD0] dark:border-[#482E70] transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
