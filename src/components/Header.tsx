import React, { useState } from 'react';
import { Search, ShoppingBag, Menu, X } from 'lucide-react';
import { NovaluxeLogo } from './NovaluxeLogo';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  onOpenSearch
}) => {
  const { cartCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F4]/95 dark:bg-[#0C0813]/90 backdrop-blur-md border-b border-[#E2D9C8] dark:border-[#281C38] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Lockup */}
        <div
          onClick={() => handleLinkClick('/')}
          className="cursor-pointer shrink-0 py-1"
        >
          <NovaluxeLogo size="md" variant="transparent" />
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map(link => {
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.path}
                onClick={() => handleLinkClick(link.path)}
                className={`relative py-1 whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#8B42C9] dark:text-[#F5D061] font-semibold'
                    : 'text-[#574E5D] hover:text-[#211B25] dark:text-[#D8CCE8] dark:hover:text-[#FFFFFF]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#EAB308] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Theme Switcher, Search & Shopping Bag) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Switcher Button */}
          <ThemeToggleButton />

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="p-2 text-[#574E5D] hover:text-[#8B42C9] hover:bg-[#F2EBDD] dark:text-[#D8CCE8] dark:hover:text-[#F5D061] dark:hover:bg-[#1E152D] rounded-full transition-colors cursor-pointer"
            aria-label="Search products"
            title="Search products"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Cart Bag Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-[#574E5D] hover:text-[#8B42C9] hover:bg-[#F2EBDD] dark:text-[#D8CCE8] dark:hover:text-[#F5D061] dark:hover:bg-[#1E152D] rounded-full transition-colors cursor-pointer"
            aria-label="View shopping bag"
            title="View shopping bag"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-bold text-[10px] rounded-full flex items-center justify-center tabular-nums shadow-sm">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#574E5D] hover:text-[#211B25] hover:bg-[#F2EBDD] dark:text-[#D8CCE8] dark:hover:text-[#F3EFEA] dark:hover:bg-[#1E152D] rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF8F4] dark:bg-[#0F0A18] border-b border-[#E2D9C8] dark:border-[#281C38] px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-1">
            {navLinks.map(link => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#F2EBDD] text-[#8B42C9] dark:bg-[#221637] dark:text-[#F5D061] font-semibold'
                      : 'text-[#574E5D] hover:bg-[#F2EBDD]/60 hover:text-[#211B25] dark:text-[#D8CCE8] dark:hover:bg-[#1A1227] dark:hover:text-[#FFFFFF]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E2D9C8] dark:border-[#261A39] flex items-center justify-between text-xs text-[#746B78] dark:text-[#8C829B] px-3">
            <span>Monrovia, Liberia</span>
            <button
              onClick={() => handleLinkClick('/shop')}
              className="text-[#8B42C9] dark:text-[#F5D061] font-medium"
            >
              Browse Catalogue →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
