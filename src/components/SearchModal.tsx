import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { Product } from '../types';
import { handleImageError } from '../lib/imageUtils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const { products, categories, settings } = useSettings();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = query.trim()
    ? products.filter(p => {
        const q = query.toLowerCase();
        const cat = categories.find(c => c.id === p.categoryId)?.name.toLowerCase() || '';
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          cat.includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#FAF8F4] dark:bg-[#120D1B] border border-[#E2D9C8] dark:border-[#3B2D54] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-5 py-4 border-b border-[#E2D9C8] dark:border-[#2A1E3D]">
          <Search className="w-5 h-5 text-[#8B42C9] dark:text-[#A855F7] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search skincare, makeup, fragrances, essentials..."
            className="w-full bg-transparent text-[#211B25] dark:text-[#F3EFEA] placeholder-[#746B78] dark:placeholder-[#8C829B] text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#746B78] hover:text-[#211B25] dark:text-[#8C829B] dark:hover:text-[#F3EFEA] p-1 mr-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-wider text-[#574E5D] hover:text-[#211B25] dark:text-[#A79DB8] dark:hover:text-[#F3EFEA] px-2 py-1 rounded bg-[#F2EBDD] dark:bg-[#20172F] cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-sm text-[#746B78] dark:text-[#8C829B]">
              <p>Type keywords to discover NOVALUXE beauty and everyday essentials</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['Serum', 'Lipstick', 'Eau de Parfum', 'Body Butter', 'Hydration'].map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#F2EBDD] text-[#211B25] hover:bg-[#8B42C9] hover:text-white dark:bg-[#1F162E] dark:text-[#D8CCE8] dark:hover:bg-[#2F2148] dark:hover:text-[#F5D061] transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-base text-[#211B25] dark:text-[#D8CCE8] font-medium">No products match "{query}"</p>
              <p className="text-xs text-[#746B78] dark:text-[#8C829B] mt-1">Try another keyword or browse our shop catalogue</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-2 text-xs font-medium text-[#746B78] dark:text-[#8C829B] uppercase tracking-wider">
                Products ({filteredProducts.length})
              </div>
              {filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F2EBDD] dark:hover:bg-[#1F162E] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-[#F2EBDD] dark:bg-[#251A38] overflow-hidden shrink-0 border border-[#E2D9C8] dark:border-[#3B2D54]/50">
                        <div className="product-image-container !p-1 w-full h-full">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#8B42C9] dark:text-[#A855F7] tracking-wider uppercase font-medium">
                          {category?.name || 'Essentials'}
                        </p>
                        <h4 className="text-sm font-medium text-[#211B25] dark:text-[#F3EFEA] group-hover:text-[#8B42C9] dark:group-hover:text-[#F5D061] transition-colors truncate">
                          {product.name}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-medium text-[#9A6F18] dark:text-[#F5D061] tabular-nums">
                        {settings.currency}{product.price.toFixed(2)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#746B78] group-hover:text-[#211B25] dark:text-[#8C829B] dark:group-hover:text-[#F3EFEA] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
