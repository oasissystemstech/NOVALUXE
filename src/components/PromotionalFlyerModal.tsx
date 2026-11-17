import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Play, Pause, ArrowRight, Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { PromoCampaignConfig } from '../types';
import { DEFAULT_HERO_IMAGE, handleImageError } from '../lib/imageUtils';
import {
  getActivePromoMediaUrl,
  inferVideoMimeType,
  normalizePromoCampaign
} from '../lib/promoUtils';

interface PromotionalFlyerModalProps {
  onNavigate: (path: string, param?: string) => void;
  forceOpen?: boolean;
  onClosePreview?: () => void;
  previewConfig?: PromoCampaignConfig;
  previewViewport?: 'desktop' | 'mobile';
}

const SESSION_DISMISS_KEY = 'novaluxe_promo_dismissed_session';
const DAILY_SHOWN_KEY = 'novaluxe_promo_last_shown_at';

function isWithinDateWindow(startDate: string, endDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;
  return true;
}

function shouldShowByFrequency(frequency: PromoCampaignConfig['frequency']): boolean {
  try {
    if (frequency === 'always') return true;
    if (frequency === 'once_per_session') {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) !== '1';
    }
    if (frequency === 'once_per_day') {
      const last = localStorage.getItem(DAILY_SHOWN_KEY);
      if (!last) return true;
      const elapsedMs = Date.now() - Number(last);
      return Number.isNaN(elapsedMs) || elapsedMs >= 24 * 60 * 60 * 1000;
    }
  } catch {
    return true;
  }
  return true;
}

function recordDismissal(frequency: PromoCampaignConfig['frequency']) {
  try {
    if (frequency === 'once_per_session') {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } else if (frequency === 'once_per_day') {
      localStorage.setItem(DAILY_SHOWN_KEY, String(Date.now()));
    }
  } catch {}
}

export const PromotionalFlyerModal: React.FC<PromotionalFlyerModalProps> = ({
  onNavigate,
  forceOpen = false,
  onClosePreview,
  previewConfig,
  previewViewport
}) => {
  const { settings, isHydratedRemote } = useSettings();
  const campaign = normalizePromoCampaign(previewConfig || settings.promoCampaign);

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (previewViewport) return previewViewport === 'mobile';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(max-width: 767px)').matches;
    }
    return false;
  });

  const [isOpen, setIsOpen] = useState<boolean>(forceOpen);
  const [videoFailed, setVideoFailed] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (previewViewport) {
      setIsMobileViewport(previewViewport === 'mobile');
      return;
    }
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const updateMatch = () => setIsMobileViewport(mq.matches);
    updateMatch();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', updateMatch);
      return () => mq.removeEventListener('change', updateMatch);
    }
    mq.addListener(updateMatch);
    return () => mq.removeListener(updateMatch);
  }, [previewViewport]);

  const activeDeviceBehavior = isMobileViewport
    ? campaign.mobileBehavior || 'autoplay_muted'
    : campaign.desktopBehavior || 'autoplay_muted';

  const isDisabledForPlatform =
    campaign.displayMode === 'disabled' ||
    !campaign.enabled ||
    (!forceOpen && activeDeviceBehavior === 'hide');

  // Reset error & playback state whenever the active promotional media URL or mode changes
  const activeMediaUrl = getActivePromoMediaUrl(campaign);
  useEffect(() => {
    setVideoFailed(false);
    setAutoplayBlocked(false);
    setIsPaused(false);
  }, [activeMediaUrl, campaign.displayMode, isMobileViewport]);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setVideoFailed(false);
      return;
    }

    // Wait for remote Supabase settings hydration so stale local defaults do not flash on mobile/fresh browsers
    if (!isHydratedRemote) {
      return;
    }

    if (isDisabledForPlatform) {
      setIsOpen(false);
      return;
    }

    if (!isWithinDateWindow(campaign.startDate, campaign.endDate)) {
      setIsOpen(false);
      return;
    }

    if (!shouldShowByFrequency(campaign.frequency)) {
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    forceOpen,
    isHydratedRemote,
    isDisabledForPlatform,
    campaign.startDate,
    campaign.endDate,
    campaign.frequency
  ]);

  const showPosterOnlyOnMobile =
    campaign.displayMode === 'video' &&
    isMobileViewport &&
    campaign.mobileBehavior === 'poster_fallback';

  const showVideo =
    campaign.displayMode === 'video' &&
    Boolean(activeMediaUrl) &&
    !videoFailed &&
    !showPosterOnlyOnMobile &&
    activeDeviceBehavior !== 'hide';

  // Ensure mobile Safari & Chrome inline playback + autoplay or explicit tap-to-play overlay
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!isOpen || !showVideo || !videoEl) return;

    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoEl.playsInline = true;
    videoEl.muted = isMuted;
    videoEl.defaultMuted = true;

    if (activeDeviceBehavior === 'click_to_play') {
      setIsPaused(true);
      setAutoplayBlocked(true);
      return;
    }

    let cancelled = false;
    const startPlayback = async () => {
      try {
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        if (!cancelled) {
          setIsPaused(false);
          setAutoplayBlocked(false);
        }
      } catch {
        // Mobile Low Power Mode / Data Saver blocked autoplay:
        // Keep the <video> mounted and present an interactive Tap-to-Play button instead of falling back to an image.
        if (!cancelled) {
          setIsPaused(true);
          setAutoplayBlocked(true);
        }
      }
    };

    startPlayback();
    return () => {
      cancelled = true;
    };
  }, [isOpen, showVideo, activeMediaUrl, activeDeviceBehavior]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleDismiss = () => {
    if (!forceOpen) {
      recordDismissal(campaign.frequency);
    }
    setIsOpen(false);
    if (onClosePreview) onClosePreview();
  };

  const handleExplore = () => {
    if (!forceOpen) {
      recordDismissal(campaign.frequency);
    }
    setIsOpen(false);
    if (onClosePreview) onClosePreview();
    onNavigate(campaign.destinationPath || '/shop');
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.defaultMuted = nextMuted;
    }
  };

  const togglePlayPause = async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      try {
        videoEl.playsInline = true;
        await videoEl.play();
        setIsPaused(false);
        setAutoplayBlocked(false);
      } catch {
        setIsPaused(true);
      }
    } else {
      videoEl.pause();
      setIsPaused(true);
    }
  };

  if (!isOpen) return null;
  if (!forceOpen && isDisabledForPlatform) return null;

  const fallbackPoster = campaign.posterUrl || DEFAULT_HERO_IMAGE;
  const activeImageSrc =
    campaign.displayMode === 'image'
      ? campaign.imageUrl || activeMediaUrl || fallbackPoster
      : fallbackPoster;
  const videoMime = inferVideoMimeType(activeMediaUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-flyer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={handleDismiss}
      />

      {/* Modal Container */}
      <div
        className={`relative z-10 w-full ${
          previewViewport === 'mobile' ? 'max-w-[360px]' : 'max-w-xl'
        } rounded-3xl overflow-hidden bg-[#120D1B] border border-[#4C346E] shadow-2xl shadow-black/60 flex flex-col max-h-[92vh]`}
      >
        {/* Top Bar with Subtle Gold Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#8B42C9] via-[#F5D061] to-[#C99A35]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close promotional flyer"
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-[#F3EFEA] border border-[#4C346E]/80 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media Stage */}
        <div className="relative bg-[#09060F] flex items-center justify-center overflow-hidden min-h-[220px]">
          {showVideo ? (
            <>
              <video
                ref={videoRef}
                key={activeMediaUrl}
                poster={fallbackPoster}
                autoPlay={activeDeviceBehavior === 'autoplay_muted'}
                muted={isMuted}
                playsInline
                loop
                preload={activeDeviceBehavior === 'click_to_play' ? 'metadata' : 'auto'}
                onLoadedData={() => setVideoFailed(false)}
                onPlay={() => {
                  setIsPaused(false);
                  setAutoplayBlocked(false);
                }}
                onPause={() => setIsPaused(true)}
                onError={() => setVideoFailed(true)}
                className="w-full max-h-[55vh] object-contain bg-black"
              >
                <source src={activeMediaUrl} type={videoMime} />
                {videoMime !== 'video/mp4' && <source src={activeMediaUrl} />}
              </video>

              {/* Prominent Tap-to-Play Overlay when Mobile Browser Policy or Click-to-Play Pauses Autoplay */}
              {(autoplayBlocked || isPaused) && (
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label="Play promotional video"
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/35 hover:bg-black/45 transition-colors cursor-pointer"
                >
                  <span className="w-14 h-14 rounded-full bg-[#120D1B]/90 border border-[#F5D061]/70 text-[#F5D061] flex items-center justify-center shadow-2xl">
                    <Play className="w-6 h-6 ml-0.5" />
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/75 text-[11px] font-semibold tracking-wider uppercase text-[#F3EFEA] border border-white/15">
                    Tap to Play Video
                  </span>
                </button>
              )}

              {/* Custom Minimal Playback & Audio Controls */}
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPaused ? 'Play promotional video' : 'Pause promotional video'}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-[#F3EFEA] border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute promotional video' : 'Mute promotional video'}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-[#F5D061] border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </>
          ) : (
            <div className="relative w-full flex items-center justify-center bg-gradient-to-br from-[#170D28] via-[#10091C] to-[#08050E]">
              <img
                src={activeImageSrc}
                alt={campaign.title || 'NOVALUXE by Sennel Promotion'}
                referrerPolicy="no-referrer"
                onError={e => handleImageError(e, DEFAULT_HERO_IMAGE)}
                className="w-full max-h-[52vh] object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#120D1B] via-transparent to-black/20 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Flyer Editorial Footer & CTA */}
        <div className="p-6 sm:p-7 space-y-4 text-center bg-gradient-to-b from-[#140E21] to-[#0E0918]">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#F5D061]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured Collection · Monrovia</span>
          </div>

          <div className="space-y-1.5">
            <h2
              id="promo-flyer-title"
              className="text-xl sm:text-2xl font-serif font-bold text-[#F3EFEA] text-balance"
            >
              {campaign.title || 'NOVALUXE by Sennel'}
            </h2>
            {campaign.subtitle && (
              <p className="text-xs sm:text-sm text-[#C5B9D8] max-w-md mx-auto leading-relaxed">
                {campaign.subtitle}
              </p>
            )}
          </div>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleExplore}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#CA8A04] hover:opacity-95 text-[#0A0710] font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <span>{campaign.ctaText || 'EXPLORE NOVALUXE'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-[#9C8EB2] hover:text-[#F3EFEA] px-3 py-2 transition-colors cursor-pointer"
            >
              Continue to Storefront
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
