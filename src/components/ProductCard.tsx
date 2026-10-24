import React from 'react';
import { ShoppingBag, Eye, Check, AlertCircle } from 'lucide-react';
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
    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    addToCart(product, defaultVariant, 1);
  };

  return (
    <div
      onClick={() => onViewDetails(product)}
      className="group bg-[#120D1A] rounded-2xl border border-[#261B36] hover:border-[#4C386A] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
    >
      {/* Product Image Slot */}
      <div className="relative aspect-[4/3] bg-[#1A1226] overflow-hidden">
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
            className="p-2.5 rounded-full bg-[#181124] text-[#F3EFEA] hover:text-[#F5D061] hover:bg-[#251A38] border border-[#3B2D54] transition-colors shadow-lg"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isOutOfStock && (
            <button
              onClick={handleQuickAdd}
              className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 shadow-lg"
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
          <div className="flex items-center gap-2 text-xs text-[#9C8EB2] tracking-wider uppercase font-medium mb-1.5">
            <span>{category?.name || 'Essentials'}</span>
            {product.isNewArrival && (
              <>
                <span aria-hidden="true" className="text-[#3B2D54]">·</span>
                <span className="text-[#F5D061] normal-case tracking-normal">New Arrival</span>
              </>
            )}
            {product.isBestSeller && (
              <>
                <span aria-hidden="true" className="text-[#3B2D54]">·</span>
                <span className="text-[#C084FC] normal-case tracking-normal">Favourite</span>
              </>
            )}
          </div>

          {/* Product Title */}
          <h3 className="text-base font-medium text-[#F3EFEA] group-hover:text-[#F5D061] transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Availability Status */}
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {isOutOfStock ? (
              <span className="text-red-400 font-medium">Out of stock</span>
            ) : isLimited ? (
              <span className="text-amber-400 font-medium">Limited availability</span>
            ) : (
              <span className="text-[#A79DB8]">In stock</span>
            )}
          </div>
        </div>

        {/* Price & Primary CTA */}
        <div className="mt-4 pt-3 border-t border-[#221633] flex items-center justify-between">
          <div>
            <span className="text-lg font-serif font-semibold text-[#F5D061] tabular-nums">
              {settings.currency}{product.price.toFixed(2)}
            </span>
          </div>

          <button
            disabled={isOutOfStock}
            onClick={handleQuickAdd}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isOutOfStock
                ? 'bg-[#1C1428] text-[#6E6381] cursor-not-allowed'
                : 'bg-[#221637] text-[#E2D4B7] hover:bg-[#322050] hover:text-[#FFFFFF]'
            }`}
          >
            {isOutOfStock ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>
    </div>
  );
};
