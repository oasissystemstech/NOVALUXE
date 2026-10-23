import React from 'react';

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
  const heightMap = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16'
  };

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
          <linearGradient id="novaluxeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="25%" stopColor="#C084FC" />
            <stop offset="55%" stopColor="#F5D061" />
            <stop offset="85%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Star Gold Glow Gradient */}
          <linearGradient id="starGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="40%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          {/* Subtitle Gold Gradient */}
          <linearGradient id="taglineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E2D4B7" />
            <stop offset="50%" stopColor="#F5E6C8" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Decorative 4-Point Star Symbol */}
        <g transform="translate(14, 25)" filter="url(#glow)">
          {/* Outer Diamond Flare */}
          <path
            d="M 0 -13 Q 0 0 13 0 Q 0 0 0 13 Q 0 0 -13 0 Q 0 0 0 -13 Z"
            fill="url(#starGoldGrad)"
          />
          {/* Inner Accent Core */}
          <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
          {/* Subtle Diagonal Radiance */}
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#FDE68A" strokeWidth="0.8" opacity="0.8" />
          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#FDE68A" strokeWidth="0.8" opacity="0.8" />
        </g>

        {/* NOVALUXE Wordmark */}
        <text
          x="38"
          y="35"
          fill="url(#novaluxeGrad)"
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="30"
          fontWeight="700"
          letterSpacing="4"
        >
          NOVALUXE
        </text>

        {/* Delicate Separator Dot */}
        <circle cx="218" cy="27" r="1.5" fill="#EAB308" opacity="0.7" />

        {/* "by Sennel" Tagline */}
        <text
          x="40"
          y="49"
          fill="url(#taglineGrad)"
          fontFamily="'DM Sans', -apple-system, sans-serif"
          fontSize="10"
          fontWeight="500"
          letterSpacing="4.5"
          opacity="0.95"
        >
          BY SENNEL
        </text>

        {/* Subtle accent underline dot */}
        <line x1="126" y1="46" x2="160" y2="46" stroke="#CA8A04" strokeWidth="0.6" opacity="0.4" />
      </svg>
    </div>
  );
};
