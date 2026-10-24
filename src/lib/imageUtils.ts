import React from 'react';

/**
 * Elegant luxury SVG fallback placeholder encoded as a Data URI.
 * Designed specifically for NOVALUXE by Sennel with rich gold and deep plum branding.
 * Since it is an embedded data URI, it will ALWAYS load instantly under any network condition.
 */
export const NOVALUXE_LUXURY_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#140D22" />
      <stop offset="50%" stop-color="#1C122F" />
      <stop offset="100%" stop-color="#0E0818" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5D061" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#CA8A04" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#CA8A04" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)" />
  <circle cx="400" cy="400" r="320" fill="url(#glow)" />
  <rect x="80" y="80" width="640" height="640" rx="32" fill="none" stroke="url(#gold)" stroke-width="2" stroke-opacity="0.4" stroke-dasharray="8 8" />
  <g transform="translate(400, 360)">
    <!-- Elegant Cosmetic Bottle Silhouette -->
    <path d="M -30,-80 L 30,-80 L 30,-50 L 50,-30 L 50,70 C 50,85 35,95 0,95 C -35,95 -50,85 -50,70 L -50,-30 L -30,-50 Z" fill="none" stroke="url(#gold)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M -16,-105 L 16,-105 L 16,-80 L -16,-80 Z" fill="url(#gold)" opacity="0.8" />
    <circle cx="0" cy="15" r="28" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.6" />
    <path d="M -8,15 L 8,15 M 0,7 L 0,23" stroke="url(#gold)" stroke-width="2" />
  </g>
  <text x="400" y="520" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="28" letter-spacing="8" fill="#F3EFEA" font-weight="600">NOVALUXE</text>
  <text x="400" y="555" text-anchor="middle" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#F5D061" opacity="0.9">BY SENNEL • MONROVIA</text>
</svg>
`)}`;

export const DEFAULT_HERO_IMAGE = '/images/hero/hero_beauty_cosmetics.jpg';
export const DEFAULT_PRODUCT_IMAGE = '/images/products/avalon_eclat.jpg';
export const DEFAULT_CEO_IMAGE = '/images/ceo/mercy_sennel_jolo_ceo.jpeg';

/**
 * Normalizes any image URL or file path across the app.
 * Automatically converts legacy paths (like /src/assets/images/ or /public/ or temporary AI studio paths)
 * into stable, deployment-ready root-relative paths in /images/...
 */
export function normalizeImageUrl(url?: string | null, fallback: string = DEFAULT_PRODUCT_IMAGE): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const clean = url.trim();

  // If already full http(s) or data URL or blob, keep it
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Handle CEO image references
  if (
    clean.includes('mercy_sennel_jolo') ||
    clean.includes('NOVALUXE_CEO') ||
    clean.includes('CEO')
  ) {
    if (clean.includes('hero_cutout')) {
      return '/images/ceo/mercy_sennel_jolo_hero_cutout.png';
    }
    return DEFAULT_CEO_IMAGE;
  }

  // Handle legacy /src/assets/images/ paths
  if (clean.startsWith('/src/assets/images/')) {
    const filename = clean.replace('/src/assets/images/', '');

    if (filename.startsWith('hero_beauty_cosmetics')) {
      return '/images/hero/hero_beauty_cosmetics.jpg';
    }
    if (filename.startsWith('category_skincare')) {
      return '/images/categories/skincare.jpg';
    }
    if (filename.startsWith('category_makeup')) {
      return '/images/categories/makeup.jpg';
    }
    if (filename.startsWith('category_fragrance')) {
      return '/images/categories/fragrances.jpg';
    }
    if (filename.startsWith('category_bodycare')) {
      return '/images/categories/bodycare.jpg';
    }

    // Default replacement into /images/
    return `/images/${filename}`;
  }

  // Remove redundant /public/ prefix if inadvertently present
  if (clean.startsWith('/public/')) {
    return clean.replace('/public/', '/');
  }

  // Ensure root-relative slash
  if (!clean.startsWith('/') && !clean.startsWith('./')) {
    return `/${clean}`;
  }

  return clean;
}

/**
 * Universal error handler for <img> elements.
 * Gracefully swaps in a high-quality fallback image or SVG placeholder
 * without flickering or infinite recursion.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc?: string
): void {
  const target = e.currentTarget as HTMLImageElement;
  const currentStep = target.dataset.errorRetried || '0';

  if (currentStep === '0') {
    // Step 1: Try the specific fallback image or primary fallback
    target.dataset.errorRetried = '1';
    target.src = fallbackSrc || DEFAULT_PRODUCT_IMAGE;
  } else if (currentStep === '1') {
    // Step 2: If fallback also fails, use the guaranteed embedded luxury SVG data URL
    target.dataset.errorRetried = '2';
    target.src = NOVALUXE_LUXURY_PLACEHOLDER;
  } else {
    // Step 3: Prevent any further attempts
    target.onerror = null;
  }
}
