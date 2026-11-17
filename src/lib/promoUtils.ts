import {
  PromoCampaignConfig,
  PromoDesktopBehavior,
  PromoDisplayMode,
  PromoMobileBehavior
} from '../types';
import { DEFAULT_HERO_IMAGE, normalizeImageUrl } from './imageUtils';

export const DEAD_DEFAULT_PROMO_VIDEO = '/videos/novaluxe-promo.mp4';

const VALID_DISPLAY_MODES: PromoDisplayMode[] = ['image', 'video', 'disabled'];
const VALID_DESKTOP_BEHAVIORS: PromoDesktopBehavior[] = ['autoplay_muted', 'click_to_play', 'hide'];
const VALID_MOBILE_BEHAVIORS: PromoMobileBehavior[] = ['autoplay_muted', 'click_to_play', 'poster_fallback', 'hide'];

export function isDeadDefaultPromoVideo(url?: string | null): boolean {
  if (!url) return false;
  return url.trim() === DEAD_DEFAULT_PROMO_VIDEO;
}

export function isNonPersistentMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('blob:') || trimmed.startsWith('data:');
}

export function normalizeMediaAssetUrl(url?: string | null, fallback = ''): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (isNonPersistentMediaUrl(clean)) {
    return fallback || '';
  }
  if (clean.startsWith('/images/') || clean.startsWith('/src/assets/') || clean.startsWith('/public/')) {
    return normalizeImageUrl(clean, fallback || DEFAULT_HERO_IMAGE);
  }
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function inferMimeTypeFromFile(file: { name: string; type?: string }): string {
  const rawType = (file.type || '').trim().toLowerCase();
  if (rawType && rawType !== 'application/octet-stream') {
    if (rawType === 'image/jpg') return 'image/jpeg';
    return rawType;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
    case 'm4v':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      return '';
  }
}

export function inferVideoMimeType(url?: string | null): string {
  if (!url) return 'video/mp4';
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
}

export function normalizePromoCampaign(
  raw?: Partial<PromoCampaignConfig> | null,
  defaults?: Partial<PromoCampaignConfig>
): PromoCampaignConfig {
  const baseTitle = raw?.title ?? defaults?.title ?? 'NOVALUXE by Sennel';
  const baseSubtitle =
    raw?.subtitle ??
    defaults?.subtitle ??
    'Elevate your daily routine with curated cosmetics, skincare, and luxury fragrances in Monrovia.';
  const baseCtaText = raw?.ctaText ?? defaults?.ctaText ?? 'EXPLORE NOVALUXE';
  const baseDest = raw?.destinationPath ?? defaults?.destinationPath ?? '/shop';
  const baseFreq = raw?.frequency ?? defaults?.frequency ?? 'once_per_session';

  const rawDisplayMode = raw?.displayMode;
  const hasRealLegacyVideo = Boolean(
    (raw?.videoUrl && !isDeadDefaultPromoVideo(raw.videoUrl)) ||
      (raw?.mediaType === 'video' && raw?.mediaUrl && !isDeadDefaultPromoVideo(raw.mediaUrl))
  );

  let displayMode: PromoDisplayMode;
  if (rawDisplayMode && VALID_DISPLAY_MODES.includes(rawDisplayMode)) {
    displayMode = rawDisplayMode;
  } else if (raw?.enabled === false) {
    displayMode = 'disabled';
  } else if (raw?.mediaType === 'image') {
    displayMode = 'image';
  } else if (raw?.mediaType === 'video') {
    displayMode = hasRealLegacyVideo ? 'video' : 'image';
  } else if (defaults?.displayMode && VALID_DISPLAY_MODES.includes(defaults.displayMode)) {
    displayMode = defaults.displayMode;
  } else {
    displayMode = defaults?.enabled === false ? 'disabled' : defaults?.mediaType === 'video' ? 'video' : 'image';
  }

  const posterUrl = normalizeMediaAssetUrl(raw?.posterUrl || defaults?.posterUrl, DEFAULT_HERO_IMAGE);

  const candidateImageUrl =
    raw?.imageUrl ||
    (raw?.mediaType === 'image' && raw?.mediaUrl ? raw.mediaUrl : '') ||
    defaults?.imageUrl ||
    posterUrl ||
    DEFAULT_HERO_IMAGE;
  const imageUrl = normalizeMediaAssetUrl(candidateImageUrl, DEFAULT_HERO_IMAGE);

  const rawVideoCandidate =
    raw?.videoUrl !== undefined
      ? raw.videoUrl
      : raw?.mediaType === 'video' && raw?.mediaUrl
      ? raw.mediaUrl
      : defaults?.videoUrl || '';
  const cleanedVideo = isDeadDefaultPromoVideo(rawVideoCandidate)
    ? ''
    : normalizeMediaAssetUrl(rawVideoCandidate, '');

  const enabled = displayMode !== 'disabled';
  const mediaType: 'video' | 'image' = displayMode === 'video' ? 'video' : 'image';
  const mediaUrl =
    displayMode === 'video'
      ? cleanedVideo
      : displayMode === 'image'
      ? imageUrl
      : normalizeMediaAssetUrl(raw?.mediaUrl, '') || imageUrl;

  const desktopBehavior: PromoDesktopBehavior =
    raw?.desktopBehavior && VALID_DESKTOP_BEHAVIORS.includes(raw.desktopBehavior)
      ? raw.desktopBehavior
      : defaults?.desktopBehavior || 'autoplay_muted';

  const mobileBehavior: PromoMobileBehavior =
    raw?.mobileBehavior && VALID_MOBILE_BEHAVIORS.includes(raw.mobileBehavior)
      ? raw.mobileBehavior
      : defaults?.mobileBehavior || 'autoplay_muted';

  return {
    enabled,
    displayMode,
    mediaType,
    mediaUrl,
    imageUrl,
    videoUrl: cleanedVideo,
    posterUrl,
    desktopBehavior,
    mobileBehavior,
    title: baseTitle,
    subtitle: baseSubtitle,
    ctaText: baseCtaText,
    destinationPath: baseDest,
    frequency: baseFreq,
    startDate: raw?.startDate ?? defaults?.startDate ?? '',
    endDate: raw?.endDate ?? defaults?.endDate ?? ''
  };
}

export function getActivePromoMediaUrl(campaign: PromoCampaignConfig): string {
  const normalized = normalizePromoCampaign(campaign);
  if (normalized.displayMode === 'disabled') return '';
  if (normalized.displayMode === 'video') {
    return normalized.videoUrl || (!isDeadDefaultPromoVideo(normalized.mediaUrl) ? normalized.mediaUrl : '');
  }
  return normalized.imageUrl || normalized.mediaUrl || normalized.posterUrl || DEFAULT_HERO_IMAGE;
}
