import React, { useId } from 'react';
import { useTheme } from '../context/ThemeContext';

interface NovaluxeLogoProps {
  className?: string;
  variant?: 'badge' | 'transparent';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const NovaluxeLogo: React.FC<NovaluxeLogoProps> = ({
  className = '',
  variant = 'transparent',
  size = 'md'
}) => {
  const { isDark } = useTheme();
  const uid = useId().replace(/:/g, '');

  const heightMap = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16'
  };

  // Badge variant always sits on a dark #08070B pill surface
  const useLightText = variant === 'badge' || isDark;

  return (
    <div
      className={`inline-flex items-center select-none ${
        variant === 'badge'
          ? 'bg-[#08070B] px-3.5 py-1.5 rounded-lg border border-[#3B2D54]/50 shadow-md'
          : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 280 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heightMap[size]} w-auto transition-transform hover:scale-[1.02] duration-200`}
        aria-label="NOVALUXE by Sennel Logo"
      >
        <defs>
          {/* Purple to Gold Gradient */}
          <linearGradient id={`novaluxeGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={useLightText ? '#A855F7' : '#8B42C9'} />
            <stop offset="28%" stopColor={useLightText ? '#C084FC' : '#7C3AED'} />
            <stop offset="58%" stopColor={useLightText ? '#F5D061' : '#C99A35'} />
            <stop offset="85%" stopColor={useLightText ? '#EAB308' : '#B58420'} />
            <stop offset="100%" stopColor={useLightText ? '#D97706' : '#9A6F18'} />
          </linearGradient>

          {/* Star Gold Glow Gradient */}
          <linearGradient id={`starGoldGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={useLightText ? '#FFFBEB' : '#F5D061'} />
            <stop offset="40%" stopColor={useLightText ? '#FDE047' : '#C99A35'} />
            <stop offset="100%" stopColor={useLightText ? '#CA8A04' : '#9A6F18'} />
          </linearGradient>

          {/* Subtitle Gradient */}
          <linearGradient id={`taglineGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={useLightText ? '#E2D4B7' : '#746B78'} />
            <stop offset="50%" stopColor={useLightText ? '#F5E6C8' : '#211B25'} />
            <stop offset="100%" stopColor={useLightText ? '#D4AF37' : '#9A6F18'} />
          </linearGradient>

          <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Decorative 4-Point Star Symbol */}
        <g transform="translate(14, 25)" filter={`url(#glow-${uid})`}>
          <path
            d="M 0 -13 Q 0 0 13 0 Q 0 0 0 13 Q 0 0 -13 0 Q 0 0 0 -13 Z"
            fill={`url(#starGoldGrad-${uid})`}
          />
          <circle cx="0" cy="0" r="2.2" fill={useLightText ? '#FFFFFF' : '#211B25'} />
          <line x1="-5" y1="-5" x2="5" y2="5" stroke={useLightText ? '#FDE68A' : '#C99A35'} strokeWidth="0.8" opacity="0.8" />
          <line x1="5" y1="-5" x2="-5" y2="5" stroke={useLightText ? '#FDE68A' : '#C99A35'} strokeWidth="0.8" opacity="0.8" />
        </g>

        {/* NOVALUXE Wordmark */}
        <text
          x="38"
          y="35"
          fill={`url(#novaluxeGrad-${uid})`}
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="30"
          fontWeight="700"
          letterSpacing="4"
        >
          NOVALUXE
        </text>

        {/* Delicate Separator Dot */}
        <circle cx="218" cy="27" r="1.5" fill={useLightText ? '#EAB308' : '#C99A35'} opacity="0.8" />

        {/* "by Sennel" Tagline */}
        <text
          x="40"
          y="49"
          fill={`url(#taglineGrad-${uid})`}
          fontFamily="'DM Sans', -apple-system, sans-serif"
          fontSize="10"
          fontWeight="600"
          letterSpacing="4.5"
          opacity="0.95"
        >
          BY SENNEL
        </text>

        {/* Subtle accent underline */}
        <line x1="126" y1="46" x2="160" y2="46" stroke={useLightText ? '#CA8A04' : '#C99A35'} strokeWidth="0.8" opacity="0.5" />
      </svg>
    </div>
  );
};
