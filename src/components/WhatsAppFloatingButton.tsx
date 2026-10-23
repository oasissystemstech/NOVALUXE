import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const WhatsAppFloatingButton: React.FC = () => {
  const { settings } = useSettings();
  const [showTooltip, setShowTooltip] = useState(false);

  const defaultMessage = encodeURIComponent(
    'Hello NOVALUXE by Sennel,\nI would like to inquire about your cosmetics, beauty products, and everyday essentials in Monrovia.'
  );

  const whatsappUrl = `https://wa.me/${settings.whatsappRaw || '16059413997'}?text=${defaultMessage}`;

  return (
    <aside
      aria-label="Customer Support"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 select-none"
    >
      {/* Modern Greeting Tooltip */}
      {showTooltip && (
        <div className="hidden sm:flex items-center gap-2.5 bg-[#120D1B]/95 text-[#F3EFEA] border border-[#3B2D54] px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-medium animate-in fade-in slide-in-from-right-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#25D366] shrink-0 animate-pulse" />
            <span className="text-[#C5B9D8]">
              Chat with <strong className="text-[#F3EFEA] font-semibold">NOVALUXE</strong> on WhatsApp
            </span>
          </div>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-[#8C829B] hover:text-[#F3EFEA] p-0.5 ml-1 rounded transition-colors"
            aria-label="Dismiss tooltip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modern Official WhatsApp Hover Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        className="group relative flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 rounded-full transition-transform duration-200 hover:scale-108 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-[#0C0813]"
        aria-label="Chat with NOVALUXE on WhatsApp (+1 605 941-3997)"
        title="Chat with NOVALUXE on WhatsApp"
        style={{
          filter: 'drop-shadow(0 10px 20px rgba(37, 211, 102, 0.35))'
        }}
      >
        {/* Soft Ambient Radiance Glow */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 group-hover:opacity-70 blur-md transition-opacity duration-300 pointer-events-none" />

        {/* Authentic WhatsApp Vector Icon */}
        <svg
          viewBox="0 0 60 60"
          className="relative w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* WhatsApp Radial Brand Gradient */}
            <radialGradient
              id="waBgGrad"
              cx="50%"
              cy="25%"
              r="75%"
              fx="50%"
              fy="25%"
            >
              <stop offset="0%" stopColor="#29E370" />
              <stop offset="45%" stopColor="#25D366" />
              <stop offset="100%" stopColor="#1EBE5D" />
            </radialGradient>

            {/* Subtle Top Specular Glass Reflection */}
            <linearGradient id="waSpecular" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Background Circle with Green Gradient */}
          <circle cx="30" cy="30" r="28" fill="url(#waBgGrad)" />

          {/* Subtle Glass Rim Overlay */}
          <circle cx="30" cy="30" r="27.5" stroke="url(#waSpecular)" strokeWidth="1" />

          {/* Official WhatsApp Speech Bubble and Handset */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M30 13C20.611 13 13 20.611 13 30c0 3.357.976 6.488 2.658 9.123L13.6 46.4l7.518-1.973A16.892 16.892 0 0030 47c9.389 0 17-7.611 17-17s-7.611-17-17-17zm0 31.127c-2.702 0-5.237-.752-7.397-2.058l-.53-.319-5.496 1.442 1.467-5.358-.35-.556A14.072 14.072 0 0115.854 30c0-7.805 6.341-14.146 14.146-14.146 7.805 0 14.146 6.341 14.146 14.146 0 7.805-6.341 14.146-14.146 14.146zm7.75-10.593c-.425-.213-2.514-1.241-2.904-1.383-.39-.142-.673-.213-.956.213-.283.425-1.098 1.383-1.346 1.666-.248.284-.495.319-.92.107-.425-.213-1.793-.661-3.416-2.109-1.262-1.216-2.115-2.718-2.363-3.143-.247-.425-.026-.654.186-.865.19-.191.425-.495.637-.743.212-.249.283-.425.425-.708.141-.283.07-.531-.035-.744-.107-.212-.956-2.302-1.311-3.153-.343-.829-.694-.717-.956-.73-.247-.013-.53-.016-.814-.016-.283 0-.742.107-1.132.531-.389.425-1.488 1.453-1.488 3.543 0 2.09 1.523 4.107 1.735 4.391.213.283 2.997 4.577 7.261 6.418 1.015.438 1.806.7 2.422.897 1.02.324 1.947.278 2.68.169.818-.123 2.515-1.028 2.869-2.02.354-.99.354-1.84.248-2.018-.106-.177-.389-.284-.814-.496z"
            fill="#FFFFFF"
          />
        </svg>

        {/* Small Online Ping Badge */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0C0813] shadow-sm" />
      </a>
    </aside>
  );
};
