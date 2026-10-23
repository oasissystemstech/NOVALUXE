import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Shield,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { NovaluxeLogo } from './NovaluxeLogo';
import { TikTokIcon } from './TikTokIcon';
import { useSettings } from '../context/SettingsContext';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#07050A] border-t border-[#231735] text-[#C4B7D7] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <div
              onClick={() => onNavigate('/')}
              className="cursor-pointer inline-block"
            >
              <NovaluxeLogo size="lg" variant="transparent" />
            </div>
            <p className="text-xs text-[#9C8EB2] leading-relaxed max-w-sm">
              Cosmetics, beauty products, skincare, personal care, and everyday essentials curated for your modern lifestyle in Monrovia, Liberia.
            </p>

            {/* Social Media Links */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#181024] hover:bg-[#A855F7]/20 border border-[#3A2A54] flex items-center justify-center text-[#E2D4B7] hover:text-[#FFFFFF] transition-colors"
                aria-label="Follow NOVALUXE on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={settings.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#181024] hover:bg-[#000000] border border-[#3A2A54] hover:border-[#00F2EA]/40 flex items-center justify-center transition-all group"
                aria-label="Follow NOVALUXE on TikTok"
              >
                <TikTokIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
              </a>
              <a
                href={`https://wa.me/${settings.whatsappRaw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#181024] hover:bg-[#25D366]/20 border border-[#3A2A54] flex items-center justify-center text-[#E2D4B7] hover:text-[#25D366] transition-colors"
                aria-label="Contact NOVALUXE on WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold text-[#F3EFEA] tracking-wider uppercase mb-4">
              Explore Store
            </h3>
            <ul className="space-y-2.5 text-xs text-[#A79DB8]">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/shop')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Shop All Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/about')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/contact')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Contact & Orders
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/cart')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Shopping Bag
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Policies */}
          <div>
            <h3 className="text-sm font-semibold text-[#F3EFEA] tracking-wider uppercase mb-4">
              Customer Care
            </h3>
            <ul className="space-y-2.5 text-xs text-[#A79DB8]">
              <li>
                <button
                  onClick={() => onNavigate('/delivery-returns')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Delivery & Returns Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/terms')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/privacy')}
                  className="hover:text-[#F5D061] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <a
                  href={`https://wa.me/${settings.whatsappRaw}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#25D366] transition-colors inline-flex items-center gap-1 text-xs"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Official Business Information */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-semibold text-[#F3EFEA] tracking-wider uppercase mb-4">
              Official Location & Contacts
            </h3>
            <div className="flex items-start gap-2.5 text-xs text-[#A79DB8]">
              <MapPin className="w-4 h-4 text-[#A855F7] shrink-0 mt-0.5" />
              <span>{settings.location}</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#A79DB8]">
              <Mail className="w-4 h-4 text-[#A855F7] shrink-0 mt-0.5" />
              <a
                href={`mailto:${settings.email}`}
                className="hover:text-[#F5D061] transition-colors"
              >
                {settings.email}
              </a>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#A79DB8]">
              <Phone className="w-4 h-4 text-[#A855F7] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {settings.phoneNumbers.map((phone, idx) => (
                  <div key={idx}>
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-[#F5D061] transition-colors">
                      {phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#A79DB8]">
              <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
              <a
                href={`https://wa.me/${settings.whatsappRaw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#25D366] transition-colors"
              >
                WhatsApp: {settings.whatsapp}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Discreet Administrative Access */}
        <div className="pt-8 mt-8 border-t border-[#1C132B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A6E8E]">
          <p>© {currentYear} NOVALUXE by Sennel. All rights reserved. Monrovia, Liberia.</p>

          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">GSA Road around the ELWA Roundabout</span>

            {/* Discreet Administrative Access Icon */}
            <button
              onClick={() => onNavigate('/admin')}
              className="text-[#65587A] hover:text-[#A855F7] p-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              title="NOVALUXE Staff Portal"
              aria-label="Administrative Portal"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="text-[11px]">Staff Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
