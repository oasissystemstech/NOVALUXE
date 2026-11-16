import React from 'react';
import { ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { handleImageError, DEFAULT_PRODUCT_IMAGE } from '../lib/imageUtils';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetails
}) => {
  const { categories, settings } = useSettings();
  const { addToCart } = useCart();
  const category = categories.find(c => c.id === product.categoryId);

  const isOutOfStock = !product.isAvailable || product.stockQuantity <= 0;
  const isLimited = !isOutOfStock && product.stockQuantity <= 5;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const defaultVariant =
      product.variants && product.variants.length > 0
        ? product.variants.find(v => v.stockQuantity > 0) || product.variants[0]
        : null;
    addToCart(product, defaultVariant, 1);
  };

  return (
    <div
      onClick={() => onViewDetails(product)}
      className="group bg-white dark:bg-[#120D1A] rounded-2xl border border-[#E4DDD0] hover:border-[#8B42C9]/50 dark:border-[#261B36] dark:hover:border-[#4C386A] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer shadow-xs dark:shadow-none"
    >
      {/* Product Image Slot */}
      <div className="relative aspect-[4/3] bg-[#F2EBDD] dark:bg-[#1A1226] overflow-hidden">
        <img
          src={product.images[0] || DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Hover Quick Action Buttons */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4">
          <button
            onClick={e => {
              e.stopPropagation();
              onViewDetails(product);
            }}
            className="p-2.5 rounded-full bg-white/95 dark:bg-[#181124] text-[#211B25] dark:text-[#F3EFEA] hover:text-[#8B42C9] dark:hover:text-[#F5D061] border border-[#E4DDD0] dark:border-[#3B2D54] transition-colors shadow-lg cursor-pointer"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isOutOfStock && (
            <button
              onClick={handleQuickAdd}
              className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-lg cursor-pointer"
              title="Add to Bag"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Line */}
          <div className="flex items-center gap-2 text-xs text-[#746B78] dark:text-[#9C8EB2] tracking-wider uppercase font-medium mb-1.5">
            <span>{category?.name || 'Essentials'}</span>
            {product.isNewArrival && (
              <>
                <span aria-hidden="true" className="text-[#DFD5C2] dark:text-[#3B2D54]">·</span>
                <span className="text-[#9A6F18] dark:text-[#F5D061] normal-case tracking-normal">New Arrival</span>
              </>
            )}
            {product.isBestSeller && (
              <>
                <span aria-hidden="true" className="text-[#DFD5C2] dark:text-[#3B2D54]">·</span>
                <span className="text-[#8B42C9] dark:text-[#C084FC] normal-case tracking-normal">Favourite</span>
              </>
            )}
          </div>

          {/* Product Title */}
          <h3 className="text-base font-medium text-[#211B25] dark:text-[#F3EFEA] group-hover:text-[#8B42C9] dark:group-hover:text-[#F5D061] transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Availability Status */}
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {isOutOfStock ? (
              <span className="text-red-600 dark:text-red-400 font-medium">Out of stock</span>
            ) : isLimited ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Limited availability</span>
            ) : (
              <span className="text-[#746B78] dark:text-[#A79DB8]">In stock</span>
            )}
          </div>
        </div>

        {/* Price & Primary CTA */}
        <div className="mt-4 pt-3 border-t border-[#EDE6D8] dark:border-[#221633] flex items-center justify-between">
          <div>
            <span className="text-lg font-serif font-semibold text-[#9A6F18] dark:text-[#F5D061] tabular-nums">
              {settings.currency}{product.price.toFixed(2)}
            </span>
          </div>

          <button
            disabled={isOutOfStock}
            onClick={handleQuickAdd}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isOutOfStock
                ? 'bg-[#F2EBDD] text-[#A298A8] dark:bg-[#1C1428] dark:text-[#6E6381] cursor-not-allowed'
                : 'bg-[#F2EBDD] text-[#211B25] hover:bg-[#8B42C9] hover:text-white dark:bg-[#221637] dark:text-[#E2D4B7] dark:hover:bg-[#322050] dark:hover:text-[#FFFFFF]'
            }`}
          >
            {isOutOfStock ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>
    </div>
  );
};
