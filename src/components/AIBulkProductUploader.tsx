import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Loader2,
  Save,
  Check,
  Edit3,
  Clock,
  FileImage,
  X
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { store } from '../lib/store';
import { BulkUploadHistoryEntry, Product } from '../types';
import { handleImageError } from '../lib/imageUtils';

interface AnalysisResult {
  productName: string;
  brand: string;
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  productType: string;
  description: string;
  sizeOrVolume: string;
  specifications: string;
  keyIngredients: string[];
  features: string[];
  suggestedTags: string[];
  suggestedSku: string;
  extractedFields: string[];
  suggestedFields: string[];
  needsVerificationFields: string[];
  confidenceNote: string;
}

type DraftStatus =
  | 'queued'
  | 'uploading'
  | 'analyzing'
  | 'awaiting_review'
  | 'approved'
  | 'saved'
  | 'failed';

interface BulkProductDraft {
  localId: string;
  file?: File;
  fileName: string;
  fileSize: number;
  previewUrl: string;
  hostedImageUrl: string;
  status: DraftStatus;
  errorMessage?: string;
  // Editable fields
  name: string;
  brand: string;
  categoryId: string;
  productType: string;
  sizeOrVolume: string;
  specifications: string;
  description: string;
  keyIngredientsText: string;
  featuresText: string;
  tagsText: string;
  sku: string;
  priceInput: string; // Empty string until Admin enters selling price!
  stockQuantity: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  // Provenance markers from AI
  extractedFields: string[];
  suggestedFields: string[];
  needsVerificationFields: string[];
  confidenceNote: string;
  isExpanded: boolean;
}

interface PendingFileItem {
  id: string;
  file: File;
  previewUrl: string;
  validationError?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_BATCH_FILES = 20;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

async function prepareImagePayloadForAI(file: File): Promise<{ base64: string; mimeType: string }> {
  // Downscale oversized images on client canvas so JSON API payload stays well under serverless limits
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file for AI analysis.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => {
        const commaIdx = dataUrl.indexOf(',');
        resolve({
          base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
          mimeType: file.type || 'image/jpeg'
        });
      };
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 1.2 * 1024 * 1024) {
          const commaIdx = dataUrl.indexOf(',');
          resolve({
            base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
            mimeType: file.type || 'image/jpeg'
          });
          return;
        }
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const commaIdx = dataUrl.indexOf(',');
          resolve({
            base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
            mimeType: file.type || 'image/jpeg'
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const commaIdx = compressedDataUrl.indexOf(',');
        resolve({
          base64: commaIdx >= 0 ? compressedDataUrl.slice(commaIdx + 1) : compressedDataUrl,
          mimeType: 'image/jpeg'
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export const AIBulkProductUploader: React.FC = () => {
  const { categories, refreshProducts, settings } = useSettings();
  const { getAuthToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [drafts, setDrafts] = useState<BulkProductDraft[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [batchBanner, setBatchBanner] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<BulkUploadHistoryEntry[]>(() => store.getBulkUploadHistory());

  useEffect(() => {
    let active = true;
    store.fetchBulkUploadHistoryFromSupabase().then(list => {
      if (active && list) {
        setHistory(list);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const validateFile = (file: File): string | undefined => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(extension);
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);
    if (!isExtAllowed && !isMimeAllowed) {
      return 'Invalid format. Use JPG, JPEG, PNG, or WEBP.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
    }
    return undefined;
  };

  const addFilesToQueue = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBatchBanner(null);

    const incoming = Array.from(fileList);
    const availableSlots = Math.max(0, MAX_BATCH_FILES - pendingFiles.length);
    const sliced = incoming.slice(0, availableSlots);

    if (incoming.length > availableSlots) {
      setBatchBanner({
        type: 'error',
        text: `Batch queue accepts up to ${MAX_BATCH_FILES} images at once. Extra files were skipped.`
      });
    }

    const mapped: PendingFileItem[] = sliced.map(file => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      validationError: validateFile(file)
    }));

    setPendingFiles(prev => [...prev, ...mapped]);
  };

  const handleRemovePending = (id: string) => {
    setPendingFiles(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const uploadImageToStorage = async (file: File, batchId: string): Promise<string> => {
    if (supabase && isSupabaseConfigured) {
      const sanitizedName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '-')
        .replace(/-+/g, '-');
      const path = `products/bulk-${batchId}/${Date.now()}-${sanitizedName}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg'
      });

      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      } else {
        console.warn('Supabase storage upload note during bulk batch:', error.message);
      }
    }
    // Fallback compressed data URL when Supabase storage is offline
    const payload = await prepareImagePayloadForAI(file);
    return `data:${payload.mimeType};base64,${payload.base64}`;
  };

  const analyzeImageWithServer = async (
    file: File,
    token: string | null
  ): Promise<AnalysisResult> => {
    const payload = await prepareImagePayloadForAI(file);
    const response = await fetch('/api/admin/analyze-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        imageBase64: payload.base64,
        mimeType: payload.mimeType,
        fileName: file.name,
        availableCategories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }))
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.analysis) {
      throw new Error(data?.error || `AI analysis failed (${response.status}).`);
    }
    return data.analysis as AnalysisResult;
  };

  const resolveCategoryId = (suggestedId?: string, suggestedName?: string): string => {
    if (suggestedId && categories.some(c => c.id === suggestedId)) {
      return suggestedId;
    }
    if (suggestedName) {
      const byName = categories.find(
        c => c.name.toLowerCase() === suggestedName.trim().toLowerCase()
      );
      if (byName) return byName.id;
    }
    return categories[0]?.id || 'cat-skincare';
  };

  const handleProcessQueue = async () => {
    const validFiles = pendingFiles.filter(p => !p.validationError);
    if (validFiles.length === 0) {
      setBatchBanner({
        type: 'error',
        text: 'Please add at least one valid product image (JPG, PNG, or WEBP under 5 MB).'
      });
      return;
    }

    setIsProcessingBatch(true);
    setBatchBanner(null);

    const batchId = Date.now().toString(36);
    const token = await getAuthToken();

    // Create initial drafts
    const initialDrafts: BulkProductDraft[] = validFiles.map(item => ({
      localId: `draft-${item.id}`,
      file: item.file,
      fileName: item.file.name,
      fileSize: item.file.size,
      previewUrl: item.previewUrl,
      hostedImageUrl: '',
      status: 'queued',
      name: '',
      brand: '',
      categoryId: categories[0]?.id || 'cat-skincare',
      productType: '',
      sizeOrVolume: '',
      specifications: '',
      description: '',
      keyIngredientsText: '',
      featuresText: '',
      tagsText: '',
      sku: `NVL-${Math.floor(1000 + Math.random() * 9000)}`,
      priceInput: '', // NEVER auto-populated
      stockQuantity: 20,
      isAvailable: true,
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      extractedFields: [],
      suggestedFields: [],
      needsVerificationFields: ['price'],
      confidenceNote: '',
      isExpanded: true
    }));

    setDrafts(prev => [...initialDrafts, ...prev]);
    setPendingFiles(prev => prev.filter(p => Boolean(p.validationError)));

    let processedCount = 0;
    let awaitingReviewCount = 0;
    let failedCount = 0;

    for (const draft of initialDrafts) {
      if (!draft.file) continue;

      try {
        setDrafts(prev =>
          prev.map(d => (d.localId === draft.localId ? { ...d, status: 'uploading', errorMessage: undefined } : d))
        );
        const hostedUrl = await uploadImageToStorage(draft.file, batchId);

        setDrafts(prev =>
          prev.map(d =>
            d.localId === draft.localId
              ? { ...d, hostedImageUrl: hostedUrl, status: 'analyzing' }
              : d
          )
        );

        const analysis = await analyzeImageWithServer(draft.file, token);
        const matchedCatId = resolveCategoryId(
          analysis.suggestedCategoryId,
          analysis.suggestedCategoryName
        );

        processedCount += 1;
        awaitingReviewCount += 1;

        setDrafts(prev =>
          prev.map(d =>
            d.localId === draft.localId
              ? {
                  ...d,
                  status: 'awaiting_review',
                  hostedImageUrl: hostedUrl,
                  name: analysis.productName || '',
                  brand: analysis.brand || '',
                  categoryId: matchedCatId,
                  productType: analysis.productType || '',
                  sizeOrVolume: analysis.sizeOrVolume || '',
                  specifications: analysis.specifications || '',
                  description: analysis.description || '',
                  keyIngredientsText: (analysis.keyIngredients || []).join(', '),
                  featuresText: (analysis.features || []).join('\n'),
                  tagsText: (analysis.suggestedTags || []).join(', '),
                  sku: analysis.suggestedSku || d.sku,
                  priceInput: '', // Strictly keep empty for manual admin confirmation
                  extractedFields: analysis.extractedFields || [],
                  suggestedFields: analysis.suggestedFields || [],
                  needsVerificationFields: Array.from(
                    new Set([...(analysis.needsVerificationFields || []), 'price'])
                  ),
                  confidenceNote: analysis.confidenceNote || ''
                }
              : d
          )
        );
      } catch (err: any) {
        failedCount += 1;
        const fallbackPreview = await readFileAsDataUrl(draft.file).catch(() => draft.previewUrl);
        setDrafts(prev =>
          prev.map(d =>
            d.localId === draft.localId
              ? {
                  ...d,
                  status: 'failed',
                  hostedImageUrl: d.hostedImageUrl || fallbackPreview,
                  errorMessage: err?.message || 'AI processing failed for this image.'
                }
              : d
          )
        );
      }
    }

    const historyEntry: BulkUploadHistoryEntry = {
      id: `bulk-${batchId}`,
      createdAt: new Date().toISOString(),
      uploadedCount: validFiles.length,
      processedCount,
      awaitingReviewCount,
      savedCount: 0,
      failedCount,
      notes: failedCount > 0 ? 'Partial batch completed with item errors' : 'Batch analyzed; awaiting price confirmation'
    };
    const updatedHistory = store.addBulkUploadHistory(historyEntry);
    setHistory(updatedHistory);
    setCurrentHistoryId(historyEntry.id);

    setIsProcessingBatch(false);
    setBatchBanner({
      type: failedCount === validFiles.length ? 'error' : 'success',
      text: `Processed ${processedCount} of ${validFiles.length} images. Review details, enter selling prices, and approve to publish.`
    });
  };

  const handleReprocessDraft = async (draft: BulkProductDraft) => {
    if (!draft.file) {
      setBatchBanner({
        type: 'error',
        text: 'Original image file is no longer in memory for reprocessing.'
      });
      return;
    }

    const token = await getAuthToken();
    setDrafts(prev =>
      prev.map(d =>
        d.localId === draft.localId ? { ...d, status: 'analyzing', errorMessage: undefined } : d
      )
    );

    try {
      let hostedUrl = draft.hostedImageUrl;
      if (!hostedUrl) {
        hostedUrl = await uploadImageToStorage(draft.file, Date.now().toString(36));
      }
      const analysis = await analyzeImageWithServer(draft.file, token);
      const matchedCatId = resolveCategoryId(
        analysis.suggestedCategoryId,
        analysis.suggestedCategoryName
      );

      setDrafts(prev =>
        prev.map(d =>
          d.localId === draft.localId
            ? {
                ...d,
                status: 'awaiting_review',
                hostedImageUrl: hostedUrl,
                name: analysis.productName || d.name,
                brand: analysis.brand || d.brand,
                categoryId: matchedCatId,
                productType: analysis.productType || d.productType,
                sizeOrVolume: analysis.sizeOrVolume || d.sizeOrVolume,
                specifications: analysis.specifications || d.specifications,
                description: analysis.description || d.description,
                keyIngredientsText: (analysis.keyIngredients || []).join(', '),
                featuresText: (analysis.features || []).join('\n'),
                tagsText: (analysis.suggestedTags || []).join(', '),
                sku: analysis.suggestedSku || d.sku,
                extractedFields: analysis.extractedFields || [],
                suggestedFields: analysis.suggestedFields || [],
                needsVerificationFields: Array.from(
                  new Set([...(analysis.needsVerificationFields || []), 'price'])
                ),
                confidenceNote: analysis.confidenceNote || ''
              }
            : d
        )
      );
    } catch (err: any) {
      setDrafts(prev =>
        prev.map(d =>
          d.localId === draft.localId
            ? { ...d, status: 'failed', errorMessage: err?.message || 'AI reprocess failed.' }
            : d
        )
      );
    }
  };

  const updateDraft = (localId: string, patch: Partial<BulkProductDraft>) => {
    setDrafts(prev => prev.map(d => (d.localId === localId ? { ...d, ...patch } : d)));
  };

  const isDraftValidForSave = (draft: BulkProductDraft): boolean => {
    const parsedPrice = parseFloat(draft.priceInput);
    return (
      draft.status !== 'saved' &&
      draft.status !== 'queued' &&
      draft.status !== 'uploading' &&
      draft.status !== 'analyzing' &&
      draft.name.trim().length > 0 &&
      !Number.isNaN(parsedPrice) &&
      parsedPrice > 0
    );
  };

  const saveDraftsToStore = (targets: BulkProductDraft[]) => {
    const validTargets = targets.filter(isDraftValidForSave);
    if (validTargets.length === 0) {
      setBatchBanner({
        type: 'error',
        text: 'No eligible items to save. Each product must have a Product Name and a Selling Price greater than 0.'
      });
      return;
    }

    const savedIds = new Set<string>();
    const now = new Date().toISOString();

    for (const draft of validTargets) {
      const priceVal = parseFloat(draft.priceInput);
      const slugBase = draft.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSuffix = Math.random().toString(36).slice(2, 6);

      const newProduct: Product = {
        id: `prod-${Date.now()}-${uniqueSuffix}`,
        name: draft.name.trim(),
        slug: `${slugBase}-${uniqueSuffix}`,
        description: draft.description.trim() || `${draft.name.trim()} — curated by NOVALUXE by Sennel.`,
        price: Number(priceVal.toFixed(2)),
        currency: 'USD',
        categoryId: draft.categoryId,
        sku: draft.sku.trim() || `NVL-${Math.floor(1000 + Math.random() * 9000)}`,
        stockQuantity: Math.max(0, Number(draft.stockQuantity) || 0),
        isAvailable: draft.isAvailable,
        isFeatured: draft.isFeatured,
        isNewArrival: draft.isNewArrival,
        isBestSeller: draft.isBestSeller,
        images: [draft.hostedImageUrl || draft.previewUrl],
        brand: draft.brand.trim() || undefined,
        productType: draft.productType.trim() || undefined,
        sizeOrVolume: draft.sizeOrVolume.trim() || undefined,
        specifications: draft.specifications.trim() || undefined,
        keyIngredients: draft.keyIngredientsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        features: draft.featuresText
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        tags: draft.tagsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        createdAt: now,
        updatedAt: now
      };

      store.saveProduct(newProduct);
      savedIds.add(draft.localId);
    }

    refreshProducts();

    setDrafts(prev =>
      prev.map(d => (savedIds.has(d.localId) ? { ...d, status: 'saved', isExpanded: false } : d))
    );

    if (currentHistoryId) {
      const entry = history.find(h => h.id === currentHistoryId);
      if (entry) {
        const nextSaved = entry.savedCount + savedIds.size;
        const nextAwaiting = Math.max(0, entry.awaitingReviewCount - savedIds.size);
        const updated = store.updateBulkUploadHistoryEntry(currentHistoryId, {
          savedCount: nextSaved,
          awaitingReviewCount: nextAwaiting,
          notes: `Saved ${nextSaved} verified product(s) to catalogue`
        });
        setHistory(updated);
      }
    }

    setBatchBanner({
      type: 'success',
      text: `Saved ${savedIds.size} product${savedIds.size === 1 ? '' : 's'} to the NOVALUXE catalogue!`
    });
  };

  const handleApproveAllValid = () => {
    let approvedCount = 0;
    setDrafts(prev =>
      prev.map(d => {
        if (d.status === 'awaiting_review' && isDraftValidForSave(d)) {
          approvedCount += 1;
          return { ...d, status: 'approved' };
        }
        return d;
      })
    );
    if (approvedCount === 0) {
      setBatchBanner({
        type: 'error',
        text: 'Enter a valid selling price (> 0) on items before approving them.'
      });
    } else {
      setBatchBanner({
        type: 'success',
        text: `Approved ${approvedCount} item(s). Click "Save Approved" to publish to your storefront.`
      });
    }
  };

  const readyDrafts = drafts.filter(d => d.status === 'awaiting_review' || d.status === 'approved');
  const approvedDrafts = drafts.filter(d => d.status === 'approved');
  const validSaveableDrafts = drafts.filter(isDraftValidForSave);
  const activeAnalyzingCount = drafts.filter(
    d => d.status === 'queued' || d.status === 'uploading' || d.status === 'analyzing'
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8B42C9] dark:text-[#A855F7]">
            AI Product Catalogue
          </p>
          <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
            AI-Powered Bulk Product Upload
          </h1>
          <p className="text-xs text-[#746B78] dark:text-[#9C8EB2] mt-1">
            Upload multiple product photographs. Visible packaging details and descriptions are extracted automatically; review details and set your selling prices before saving.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {batchBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            batchBanner.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-200'
              : batchBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200'
              : 'bg-[#F2EBDD] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#211B25] dark:text-[#E2D4B7]'
          }`}
        >
          <div className="flex items-center gap-2">
            {batchBanner.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{batchBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBatchBanner(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-Image Dropzone */}
      <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={e => {
            addFilesToQueue(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
          aria-label="Select multiple product photos"
        />

        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            addFilesToQueue(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#8B42C9] dark:border-[#A855F7] bg-[#F2EBDD]/80 dark:bg-[#221338]/60'
              : 'border-[#E4DDD0] dark:border-[#3B2D54] hover:border-[#8B42C9] dark:hover:border-[#A855F7] bg-[#FAF8F4] dark:bg-[#161021]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#F2EBDD] dark:bg-[#251A38] border border-[#E4DDD0] dark:border-[#52327A] flex items-center justify-center mx-auto mb-3 text-[#C99A35] dark:text-[#F5D061]">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA]">
            Drop multiple product photos here, or click to browse
          </h2>
          <p className="text-xs text-[#746B78] dark:text-[#9C8EB2] mt-1">
            Supports JPG, JPEG, PNG, or WEBP up to 5 MB per photo · Up to {MAX_BATCH_FILES} photos per batch
          </p>
        </div>

        {/* Staged Queue Preview */}
        {pendingFiles.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-medium text-[#211B25] dark:text-[#F3EFEA]">
                Selected Batch Queue ({pendingFiles.filter(p => !p.validationError).length} valid ·{' '}
                {pendingFiles.length} total)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    pendingFiles.forEach(p => URL.revokeObjectURL(p.previewUrl));
                    setPendingFiles([]);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#E4DDD0] dark:border-[#34244C] text-xs text-[#746B78] dark:text-[#9C8EB2] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                >
                  Clear Queue
                </button>
                <button
                  type="button"
                  disabled={isProcessingBatch || pendingFiles.every(p => Boolean(p.validationError))}
                  onClick={handleProcessQueue}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingBatch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isProcessingBatch
                      ? 'Analyzing Images...'
                      : `Upload & Analyze (${pendingFiles.filter(p => !p.validationError).length})`}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {pendingFiles.map(item => (
                <div
                  key={item.id}
                  className={`relative rounded-xl border p-2 bg-[#FAF8F4] dark:bg-[#171022] ${
                    item.validationError
                      ? 'border-red-400 dark:border-red-700'
                      : 'border-[#E4DDD0] dark:border-[#2E2044]'
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-white dark:bg-[#0F0B17]">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[11px] font-medium text-[#211B25] dark:text-[#F3EFEA] truncate mt-1.5">
                    {item.file.name}
                  </p>
                  <p className="text-[10px] text-[#746B78] dark:text-[#8C829B]">
                    {(item.file.size / 1024).toFixed(0)} KB
                  </p>
                  {item.validationError && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 leading-tight">
                      {item.validationError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemovePending(item.id);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Review & Approval Queue */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          {/* Bulk Action Bar */}
          <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="text-xs text-[#211B25] dark:text-[#F3EFEA] space-y-0.5">
              <p className="font-semibold">
                AI Cataloguing Review ({drafts.length} item{drafts.length === 1 ? '' : 's'})
              </p>
              <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2]">
                {activeAnalyzingCount > 0
                  ? `${activeAnalyzingCount} processing · `
                  : ''}
                {readyDrafts.length} awaiting verification · {approvedDrafts.length} approved ·{' '}
                {drafts.filter(d => d.status === 'saved').length} saved
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleApproveAllValid}
                className="px-3.5 py-2 rounded-xl bg-[#F2EBDD] dark:bg-[#1E142F] hover:bg-[#EAE0CC] dark:hover:bg-[#2A1D42] border border-[#E4DDD0] dark:border-[#3B2D54] text-xs font-medium text-[#211B25] dark:text-[#E2D4B7] flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-[#8B42C9] dark:text-[#A855F7]" />
                <span>Approve Priced Items</span>
              </button>

              <button
                type="button"
                disabled={approvedDrafts.filter(isDraftValidForSave).length === 0}
                onClick={() => saveDraftsToStore(approvedDrafts)}
                className="px-4 py-2 rounded-xl bg-[#8B42C9] dark:bg-[#A855F7] text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Approved ({approvedDrafts.filter(isDraftValidForSave).length})</span>
              </button>

              <button
                type="button"
                disabled={validSaveableDrafts.length === 0}
                onClick={() => saveDraftsToStore(validSaveableDrafts)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save All Valid ({validSaveableDrafts.length})</span>
              </button>
            </div>
          </div>

          {/* Individual Product Draft Cards */}
          <div className="space-y-4">
            {drafts.map(draft => {
              const priceNum = parseFloat(draft.priceInput);
              const priceMissingOrInvalid = Number.isNaN(priceNum) || priceNum <= 0;
              const isBusy =
                draft.status === 'queued' ||
                draft.status === 'uploading' ||
                draft.status === 'analyzing';

              return (
                <div
                  key={draft.localId}
                  className={`rounded-2xl border bg-white dark:bg-[#120D1B] p-5 space-y-4 transition-colors ${
                    draft.status === 'approved'
                      ? 'border-emerald-400 dark:border-emerald-700/70'
                      : draft.status === 'failed'
                      ? 'border-red-300 dark:border-red-800/70'
                      : 'border-[#E4DDD0] dark:border-[#261B36]'
                  }`}
                >
                  {/* Top Row: Thumbnail + Summary + Action Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] shrink-0">
                        <img
                          src={draft.hostedImageUrl || draft.previewUrl}
                          alt={draft.name || draft.fileName}
                          onError={handleImageError}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#211B25] dark:text-[#F3EFEA] truncate">
                            {draft.name || draft.fileName}
                          </span>
                          <span aria-hidden="true" className="text-[#746B78]">·</span>
                          <span
                            className={`text-[11px] font-semibold ${
                              draft.status === 'saved'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : draft.status === 'approved'
                                ? 'text-[#8B42C9] dark:text-[#C084FC]'
                                : draft.status === 'failed'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-[#C99A35] dark:text-[#F5D061]'
                            }`}
                          >
                            {draft.status === 'queued' && 'Queued'}
                            {draft.status === 'uploading' && 'Uploading Image...'}
                            {draft.status === 'analyzing' && 'Analyzing with AI...'}
                            {draft.status === 'awaiting_review' && 'Awaiting Review'}
                            {draft.status === 'approved' && 'Approved to Save'}
                            {draft.status === 'saved' && 'Saved to Store'}
                            {draft.status === 'failed' && 'Processing Failed'}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2]">
                          {draft.fileName} ({(draft.fileSize / 1024).toFixed(0)} KB)
                          {draft.confidenceNote ? ` · ${draft.confidenceNote}` : ''}
                        </p>

                        {draft.errorMessage && (
                          <p className="text-[11px] text-red-600 dark:text-red-400">
                            {draft.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isBusy && draft.status !== 'saved' && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateDraft(draft.localId, { isExpanded: !draft.isExpanded })}
                            className="px-3 py-1.5 rounded-lg border border-[#E4DDD0] dark:border-[#34244C] text-xs font-medium text-[#211B25] dark:text-[#E2D4B7] hover:bg-[#FAF8F4] dark:hover:bg-[#1E142F] flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{draft.isExpanded ? 'Collapse' : 'Edit'}</span>
                          </button>

                          {draft.file && (
                            <button
                              type="button"
                              onClick={() => handleReprocessDraft(draft)}
                              className="px-3 py-1.5 rounded-lg border border-[#E4DDD0] dark:border-[#34244C] text-xs font-medium text-[#746B78] dark:text-[#C5B9D8] hover:text-[#8B42C9] dark:hover:text-[#F5D061] flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reprocess</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (draft.status === 'approved') {
                                updateDraft(draft.localId, { status: 'awaiting_review' });
                              } else if (isDraftValidForSave(draft)) {
                                updateDraft(draft.localId, { status: 'approved' });
                              } else {
                                updateDraft(draft.localId, { isExpanded: true });
                                setBatchBanner({
                                  type: 'error',
                                  text: 'Enter Product Name and Selling Price (> 0) before approving.'
                                });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                              draft.status === 'approved'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#F2EBDD] dark:bg-[#251A38] text-[#211B25] dark:text-[#F5D061] border border-[#E4DDD0] dark:border-[#482E70]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{draft.status === 'approved' ? 'Approved' : 'Approve'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!isDraftValidForSave(draft)}
                            onClick={() => saveDraftsToStore([draft])}
                            className="px-3 py-1.5 rounded-lg bg-[#8B42C9] dark:bg-[#A855F7] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                          >
                            Save
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setDrafts(prev => prev.filter(d => d.localId !== draft.localId))
                        }
                        className="p-1.5 rounded-lg text-[#746B78] dark:text-[#8C829B] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                        title="Remove from batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Loading State Bar */}
                  {isBusy && (
                    <div className="flex items-center gap-2 text-xs text-[#8B42C9] dark:text-[#C084FC] bg-[#FAF8F4] dark:bg-[#171022] px-4 py-2.5 rounded-xl border border-[#E4DDD0] dark:border-[#2E2044]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {draft.status === 'queued' && 'Waiting in queue...'}
                        {draft.status === 'uploading' && 'Uploading photo to Supabase Storage...'}
                        {draft.status === 'analyzing' && 'Extracting visible packaging text & catalog details...'}
                      </span>
                    </div>
                  )}

                  {/* Provenance & Verification Legend + Editable Fields */}
                  {!isBusy && draft.status !== 'saved' && draft.isExpanded && (
                    <div className="pt-4 border-t border-[#E4DDD0] dark:border-[#241933] space-y-4 text-xs">
                      {/* Clean Provenance Indicators */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#746B78] dark:text-[#9C8EB2]">
                        <span>
                          <strong className="text-emerald-700 dark:text-emerald-400">Packaging Extracted:</strong>{' '}
                          {draft.extractedFields.length > 0 ? draft.extractedFields.join(', ') : 'None clearly visible'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong className="text-[#8B42C9] dark:text-[#C084FC]">AI Suggested:</strong>{' '}
                          {draft.suggestedFields.length > 0 ? draft.suggestedFields.join(', ') : 'None'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong className="text-amber-700 dark:text-[#F5D061]">Needs Verification:</strong>{' '}
                          {draft.needsVerificationFields.join(', ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={draft.name}
                            onChange={e => updateDraft(draft.localId, { name: e.target.value })}
                            placeholder="Enter product name"
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8] flex items-center justify-between">
                            <span>
                              Selling Price ({settings.currency}) <span className="text-red-500">*</span>
                            </span>
                            {priceMissingOrInvalid && (
                              <span className="text-[10px] text-amber-700 dark:text-[#F5D061]">
                                Admin input required
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={draft.priceInput}
                            onChange={e => updateDraft(draft.localId, { priceInput: e.target.value })}
                            placeholder="Enter price (e.g. 25.00)"
                            className={`w-full px-3 py-2 rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none tabular-nums ${
                              priceMissingOrInvalid
                                ? 'bg-amber-50/70 dark:bg-[#231829] border-2 border-[#C99A35] dark:border-[#F5D061]'
                                : 'bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] focus:border-[#8B42C9]'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Brand</label>
                          <input
                            type="text"
                            value={draft.brand}
                            onChange={e => updateDraft(draft.localId, { brand: e.target.value })}
                            placeholder="Verify brand if visible"
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Category</label>
                          <select
                            value={draft.categoryId}
                            onChange={e => updateDraft(draft.localId, { categoryId: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Product Type</label>
                          <input
                            type="text"
                            value={draft.productType}
                            onChange={e => updateDraft(draft.localId, { productType: e.target.value })}
                            placeholder="e.g. Facial Serum"
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Size / Volume</label>
                          <input
                            type="text"
                            value={draft.sizeOrVolume}
                            onChange={e => updateDraft(draft.localId, { sizeOrVolume: e.target.value })}
                            placeholder="e.g. 50ml (only if printed)"
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">SKU</label>
                          <input
                            type="text"
                            value={draft.sku}
                            onChange={e => updateDraft(draft.localId, { sku: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] font-mono focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Stock Quantity</label>
                          <input
                            type="number"
                            min="0"
                            value={draft.stockQuantity}
                            onChange={e =>
                              updateDraft(draft.localId, {
                                stockQuantity: parseInt(e.target.value, 10) || 0
                              })
                            }
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] tabular-nums focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Specifications</label>
                          <input
                            type="text"
                            value={draft.specifications}
                            onChange={e => updateDraft(draft.localId, { specifications: e.target.value })}
                            placeholder="Packaging / finish specs"
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">Product Description</label>
                        <textarea
                          rows={2}
                          value={draft.description}
                          onChange={e => updateDraft(draft.localId, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">
                            Key Ingredients (comma separated)
                          </label>
                          <input
                            type="text"
                            value={draft.keyIngredientsText}
                            onChange={e =>
                              updateDraft(draft.localId, { keyIngredientsText: e.target.value })
                            }
                            placeholder="Only if visible on packaging"
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">
                            Features (one per line)
                          </label>
                          <textarea
                            rows={2}
                            value={draft.featuresText}
                            onChange={e => updateDraft(draft.localId, { featuresText: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-[#211B25] dark:text-[#C5B9D8]">
                            Suggested Tags (comma separated)
                          </label>
                          <input
                            type="text"
                            value={draft.tagsText}
                            onChange={e => updateDraft(draft.localId, { tagsText: e.target.value })}
                            className="w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9]"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 text-[#211B25] dark:text-[#C5B9D8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.isAvailable}
                            onChange={e => updateDraft(draft.localId, { isAvailable: e.target.checked })}
                            className="rounded accent-[#8B42C9] dark:accent-[#A855F7]"
                          />
                          <span>Available</span>
                        </label>
                        <label className="flex items-center gap-2 text-[#211B25] dark:text-[#C5B9D8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.isFeatured}
                            onChange={e => updateDraft(draft.localId, { isFeatured: e.target.checked })}
                            className="rounded accent-[#8B42C9] dark:accent-[#A855F7]"
                          />
                          <span>Featured</span>
                        </label>
                        <label className="flex items-center gap-2 text-[#211B25] dark:text-[#C5B9D8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.isNewArrival}
                            onChange={e => updateDraft(draft.localId, { isNewArrival: e.target.checked })}
                            className="rounded accent-[#8B42C9] dark:accent-[#A855F7]"
                          />
                          <span>New Arrival</span>
                        </label>
                        <label className="flex items-center gap-2 text-[#211B25] dark:text-[#C5B9D8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.isBestSeller}
                            onChange={e => updateDraft(draft.localId, { isBestSeller: e.target.checked })}
                            className="rounded accent-[#8B42C9] dark:accent-[#A855F7]"
                          />
                          <span>Customer Favourite</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Upload History Log */}
      <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4DDD0] dark:border-[#261B36] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8B42C9] dark:text-[#A855F7]" />
            <h2 className="text-base font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
              Bulk Upload History
            </h2>
          </div>
          <span className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
            {history.length} recorded batch{history.length === 1 ? '' : 'es'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#746B78] dark:text-[#8C829B] flex flex-col items-center gap-2">
            <FileImage className="w-6 h-6 opacity-50" />
            <span>No bulk upload batches processed yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#746B78] dark:text-[#8C829B] border-b border-[#E4DDD0] dark:border-[#241933]">
                  <th className="pb-2.5 pr-4">Date & Time</th>
                  <th className="pb-2.5 pr-4">Uploaded</th>
                  <th className="pb-2.5 pr-4">Processed</th>
                  <th className="pb-2.5 pr-4">Awaiting Review</th>
                  <th className="pb-2.5 pr-4">Saved</th>
                  <th className="pb-2.5 pr-4">Failed</th>
                  <th className="pb-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DDD0] dark:divide-[#241933]">
                {history.map(entry => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 text-[#211B25] dark:text-[#F3EFEA] whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[#211B25] dark:text-[#F3EFEA]">
                      {entry.uploadedCount}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[#8B42C9] dark:text-[#C084FC]">
                      {entry.processedCount}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-[#C99A35] dark:text-[#F5D061]">
                      {entry.awaitingReviewCount}
                    </td>
                    <td className="py-3 pr-4 tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {entry.savedCount}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-red-600 dark:text-red-400">
                      {entry.failedCount}
                    </td>
                    <td className="py-3 text-[#746B78] dark:text-[#9C8EB2]">
                      {entry.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
