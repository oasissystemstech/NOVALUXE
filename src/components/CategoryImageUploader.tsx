import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Sparkles,
  Loader2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleImageError } from '../lib/imageUtils';

interface CategoryImageUploaderProps {
  imageUrl?: string;
  categorySlug?: string;
  onImageChange: (url: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  label?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const CategoryImageUploader: React.FC<CategoryImageUploaderProps> = ({
  imageUrl = '',
  categorySlug = 'category',
  onImageChange,
  onUploadStateChange,
  label = 'Category Image'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent component of uploading state
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
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(extension);
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);

    if (!isMimeAllowed && !isExtensionAllowed) {
      return 'Please select a valid JPG, PNG, or WEBP image.';
    }

    // Check file size limit (5 MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `Image size must not exceed 5 MB. Selected file is ${sizeMB} MB.`;
    }

    return null;
  };

  // Convert File to an optimized base64 Data URL (used as fallback or offline)
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
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
    setUploadProgress(15);

    // Progress simulation interval
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 85) return prev + Math.floor(Math.random() * 15) + 5;
        return prev;
      });
    }, 120);

    try {
      const sanitizedName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '-')
        .replace(/-+/g, '-');
      const timestamp = Date.now();
      const storagePath = `categories/${categorySlug}/${timestamp}-${sanitizedName}`;

      // 1. If Supabase is configured, upload to Supabase Storage
      if (supabase && isSupabaseConfigured) {
        // Try uploading to 'category-images' bucket first, then fallback to 'product-images'
        let targetBucket = 'category-images';
        let { error: uploadError } = await supabase.storage
          .from(targetBucket)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'image/jpeg'
          });

        if (uploadError && (uploadError.message.includes('not found') || uploadError.message.includes('Bucket'))) {
          // If category-images bucket is not yet provisioned, fallback to product-images bucket
          targetBucket = 'product-images';
          const retryResult = await supabase.storage
            .from(targetBucket)
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'image/jpeg'
            });
          uploadError = retryResult.error;
        }

        if (uploadError) {
          throw new Error(uploadError.message || 'Failed to upload image to Supabase Storage.');
        }

        // Retrieve public URL from Supabase Storage
        const { data: publicUrlData } = supabase.storage
          .from(targetBucket)
          .getPublicUrl(storagePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error('Could not retrieve public URL for uploaded category image.');
        }

        clearInterval(progressTimer);
        setUploadProgress(100);

        const finalUrl = publicUrlData.publicUrl;
        onImageChange(finalUrl);
        setSuccessMessage('Category image uploaded successfully to persistent storage!');

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
        return;
      }

      // 2. Resilient local fallback if Supabase client is not connected
      // Converts file to persistent base64 data URL so preview and saving always succeed
      const dataUrl = await readFileAsDataUrl(file);
      clearInterval(progressTimer);
      setUploadProgress(100);
      onImageChange(dataUrl);
      setSuccessMessage('Category image loaded and ready to save!');

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    } catch (err: any) {
      clearInterval(progressTimer);
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Category image upload error:', err);

      // Attempt client-side data URL fallback if network/bucket upload failed
      try {
        const dataUrl = await readFileAsDataUrl(file);
        onImageChange(dataUrl);
        setSuccessMessage('Image loaded locally. Connect Supabase Storage for remote hosting.');
      } catch {
        setError(err?.message || 'An error occurred while uploading the category image. Please try again.');
      }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const isSupabaseHosted = Boolean(
    imageUrl && (imageUrl.includes('supabase.co') || imageUrl.includes('/storage/v1/object/public/'))
  );

  return (
    <div className="space-y-2">
      {/* Label and Helpful Instruction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <label className="text-xs font-semibold text-[#C5B9D8] flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#A855F7]" />
          <span>{label}</span>
          <span className="text-red-400 text-xs">*</span>
        </label>
        <span className="text-[11px] text-[#9C8EB2]">
          Upload a category image from your computer (JPG, PNG, or WEBP, max 5 MB)
        </span>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload category image"
      />

      {/* Preview or Empty Drop Area */}
      {hasImage ? (
        /* Image Preview State */
        <div className="relative rounded-2xl border border-[#3B2D54] bg-[#120D1B] p-4 flex flex-col sm:flex-row items-center gap-4 transition-all">
          {/* Proportional, non-distorted preview */}
          <div className="relative group shrink-0 w-32 h-36 sm:w-36 sm:h-44 rounded-xl overflow-hidden bg-[#1A1227] border border-[#2E1E4B] shadow-inner">
            <img
              src={imageUrl}
              alt="Category Preview"
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-[#0A0710]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-2 text-center">
                <Loader2 className="w-6 h-6 text-[#F5D061] animate-spin" />
                <span className="text-[10px] text-[#F3EFEA] font-medium">{uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* Details & Action Controls */}
          <div className="flex-1 w-full space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#F3EFEA]">Active Category Image</span>
              {isSupabaseHosted ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  Supabase Storage
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#251A38] text-[#C5B9D8] border border-[#3B2D54]">
                  Ready to Save
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#8C829B] font-mono truncate max-w-xs sm:max-w-md" title={imageUrl}>
              {imageUrl.startsWith('data:') ? 'Embedded Image Data' : imageUrl}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Replace Image Button */}
              <button
                type="button"
                onClick={handleOpenFileDialog}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-xl bg-[#251A38] hover:bg-[#34244C] text-[#F3EFEA] text-xs font-medium border border-[#482E70] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#F5D061] ${isUploading ? 'animate-spin' : ''}`} />
                <span>Replace Image</span>
              </button>

              {/* View Full Image */}
              {!imageUrl.startsWith('data:') && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-3 py-1.5 rounded-xl bg-[#1A1227] hover:bg-[#251A38] text-[#C5B9D8] text-xs font-medium border border-[#2E1E4B] flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Full</span>
                </a>
              )}

              {/* Remove Image Button */}
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-300 text-xs font-medium border border-red-800/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone State */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleOpenFileDialog}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#A855F7] bg-[#221338]/60 shadow-lg shadow-[#A855F7]/10 scale-[1.01]'
              : 'border-[#3B2D54] hover:border-[#A855F7]/70 bg-[#120D1B] hover:bg-[#181124]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#251A38] to-[#3B2456] border border-[#52327A] flex items-center justify-center text-[#F5D061] shadow-inner mb-2.5">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-[#F5D061] animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-[#F5D061]" />
            )}
          </div>

          <div className="space-y-1 max-w-sm">
            <h4 className="text-xs font-semibold text-[#F3EFEA]">
              {isUploading ? 'Uploading category image...' : 'Select or drop a category image'}
            </h4>
            <p className="text-[11px] text-[#9C8EB2]">
              Drag and drop an image here, or{' '}
              <span className="text-[#F5D061] font-semibold underline underline-offset-2">browse files</span>
            </p>
            <p className="text-[10px] text-[#7C6E91]">Supports JPG, JPEG, PNG, or WEBP (up to 5 MB)</p>
          </div>

          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs shadow-md shadow-[#A855F7]/15">
              <UploadCloud className="w-3.5 h-3.5 text-[#0A0710]" />
              <span>Choose Image from Computer</span>
            </span>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="p-3 rounded-xl bg-[#1A1227] border border-[#3B2D54] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C5B9D8] flex items-center gap-1.5 font-medium">
              <Loader2 className="w-3.5 h-3.5 text-[#F5D061] animate-spin" />
              <span>Uploading category image...</span>
            </span>
            <span className="text-[#F5D061] font-mono font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#0D0914] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#F5D061] transition-all duration-200 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && !isUploading && (
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && !isUploading && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-xs space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-red-300">Upload Issue</p>
              <p className="text-[11px] text-red-200/90 leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 pl-6">
            <button
              type="button"
              onClick={handleOpenFileDialog}
              className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-900 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
