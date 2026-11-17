import React, { useState } from 'react';
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  Truck,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Minus,
  Plus,
  Share2
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { handleImageError } from '../lib/imageUtils';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onViewProduct: (product: Product) => void;
  onNavigateToCheckout: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onViewProduct,
  onNavigateToCheckout
}) => {
  const { categories, products, settings } = useSettings();
  const { addToCart } = useCart();

  const category = categories.find(c => c.id === product.categoryId);
  const relatedProducts = products
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 3);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0
      ? product.variants.find(v => v.stockQuantity > 0) || product.variants[0]
      : null
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const availableStock = selectedVariant
    ? Math.min(product.stockQuantity, selectedVariant.stockQuantity)
    : product.stockQuantity;
  const isOutOfStock = !product.isAvailable || availableStock <= 0;
  const isLimited = !isOutOfStock && availableStock <= 5;

  const currentPrice = product.price + (selectedVariant?.priceAdjustment || 0);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedVariant, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedVariant, quantity);
    onNavigateToCheckout();
  };

  // WhatsApp enquiry link for this specific product
  const whatsappProductMessage = encodeURIComponent(
    `Hello NOVALUXE by Sennel,\nI would like to inquire about: *${product.name}* (SKU: ${product.sku || 'N/A'})${
      selectedVariant ? ` - Option: ${selectedVariant.variantValue}` : ''
    }.\nPrice: ${settings.currency}${currentPrice.toFixed(2)}.\nIs this item available for delivery or pickup at your Monrovia store?`
  );
  const whatsappUrl = `https://wa.me/${settings.whatsappRaw}?text=${whatsappProductMessage}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-[#746B78] dark:text-[#9C8EB2]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[#211B25] dark:text-[#C5B9D8] hover:text-[#8B42C9] dark:hover:text-[#F5D061] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalogue</span>
        </button>
        <span aria-hidden="true">/</span>
        <span>{category?.name || 'Essentials'}</span>
        <span aria-hidden="true">/</span>
        <span className="text-[#211B25] dark:text-[#F3EFEA] font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main PDP Grid: Gallery Left, Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="product-image-container rounded-3xl bg-[#F2EBDD] dark:bg-[#140D1F] border border-[#E4DDD0] dark:border-[#2B1D3E] relative shadow-xl">
            <img
              src={product.images[activeImageIdx] || product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
            {product.isNewArrival && (
              <span className="absolute top-4 left-4 bg-[#C99A35] dark:bg-[#F5D061] text-[#0A0710] font-bold text-xs uppercase px-3 py-1 rounded-full shadow-md z-10">
                New Arrival
              </span>
            )}
          </div>

          {/* Gallery Thumbnails if multiple images exist */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-[#F2EBDD] dark:bg-[#140D1F] ${
                    activeImageIdx === idx
                      ? 'border-[#C99A35] dark:border-[#F5D061] scale-102'
                      : 'border-[#E4DDD0] dark:border-[#2B1D3E] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="product-image-container !p-1 w-full h-full">
                    <img
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-[#8B42C9] dark:text-[#A855F7] font-semibold">
              {category?.name || 'Everyday Essentials'}
              {product.brand ? ` · ${product.brand}` : ''}
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA] leading-tight">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#746B78] dark:text-[#9C8EB2]">
              {product.sku && <span>SKU: {product.sku}</span>}
              {product.sizeOrVolume && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.sizeOrVolume}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              {isOutOfStock ? (
                <span className="text-red-600 dark:text-red-400 font-semibold">Out of Stock</span>
              ) : isLimited ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Limited Stock ({product.stockQuantity} remaining)
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">In Stock & Ready</span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="pt-2 pb-4 border-b border-[#E4DDD0] dark:border-[#261B36]">
            <span className="text-3xl font-serif font-bold text-[#C99A35] dark:text-[#F5D061] tabular-nums">
              {settings.currency}{currentPrice.toFixed(2)}
            </span>
          </div>

          {/* Variant Selection if available */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#211B25] dark:text-[#D8CCE8] uppercase tracking-wider block">
                Select {product.variants[0].variantName}:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map(variant => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariant(variant);
                        const nextCap = Math.min(product.stockQuantity, variant.stockQuantity);
                        if (nextCap > 0 && quantity > nextCap) {
                          setQuantity(nextCap);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-bold shadow-md'
                          : variant.stockQuantity <= 0
                          ? 'bg-[#F2EBDD]/60 dark:bg-[#140E1F] text-[#9B91A1] dark:text-[#6E6381] border border-[#E4DDD0] dark:border-[#2B1D3E] opacity-70'
                          : 'bg-[#F2EBDD] dark:bg-[#181124] text-[#211B25] dark:text-[#D8CCE8] hover:bg-[#EAE0CC] dark:hover:bg-[#251A38] border border-[#E4DDD0] dark:border-[#34244C]'
                      }`}
                    >
                      {variant.variantValue}
                      {variant.priceAdjustment > 0 && (
                        <span className="ml-1 opacity-80">
                          (+{settings.currency}{variant.priceAdjustment.toFixed(2)})
                        </span>
                      )}
                      {variant.stockQuantity <= 0 && <span className="ml-1 opacity-75">(Sold out)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Stepper */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#211B25] dark:text-[#D8CCE8] uppercase tracking-wider block">
              Quantity:
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#E4DDD0] dark:border-[#3B2D54] rounded-xl bg-[#F2EBDD] dark:bg-[#160F22] px-2 py-1">
                <button
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1.5 text-[#746B78] dark:text-[#8C829B] hover:text-[#211B25] dark:hover:text-[#F3EFEA] disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA] tabular-nums">
                  {quantity}
                </span>
                <button
                  disabled={quantity >= availableStock || isOutOfStock}
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="p-1.5 text-[#746B78] dark:text-[#8C829B] hover:text-[#211B25] dark:hover:text-[#F3EFEA] disabled:opacity-30 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-[#746B78] dark:text-[#8C829B]">
                Max per order: {Math.max(0, availableStock)}
              </span>
            </div>
          </div>

          {/* Purchase Actions */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isOutOfStock
                    ? 'bg-[#EAE0CC] dark:bg-[#1C1428] text-[#746B78] dark:text-[#6E6381] cursor-not-allowed'
                    : addedSuccess
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] hover:opacity-95 shadow-lg'
                }`}
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isOutOfStock ? 'Out of Stock' : 'Add to Bag'}</span>
                  </>
                )}
              </button>

              <button
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-xs tracking-wider uppercase border border-[#D4CBB8] dark:border-[#4C3668] bg-white dark:bg-transparent text-[#211B25] dark:text-[#E2D4B7] hover:text-[#8B42C9] dark:hover:text-[#FFFFFF] hover:bg-[#FAF8F4] dark:hover:bg-[#1E142F] transition-all cursor-pointer"
              >
                Buy Now
              </button>
            </div>

            {/* Direct WhatsApp Enquiry Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-50 dark:bg-[#141F18] border border-emerald-200 dark:border-[#235835] text-emerald-700 dark:text-[#25D366] hover:bg-emerald-100 dark:hover:bg-[#192A20] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Inquire about this item on WhatsApp</span>
            </a>
          </div>

          {/* Description & Extended Details */}
          <div className="space-y-4 pt-4 border-t border-[#E4DDD0] dark:border-[#261B36]">
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-[#211B25] dark:text-[#D8CCE8] font-semibold">
                Product Details & Care
              </h3>
              <p className="text-sm text-[#746B78] dark:text-[#C5B9D8] leading-relaxed">
                {product.description}
              </p>
            </div>

            {product.specifications && (
              <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                <strong className="text-[#211B25] dark:text-[#D8CCE8]">Specifications:</strong> {product.specifications}
              </p>
            )}

            {product.keyIngredients && product.keyIngredients.length > 0 && (
              <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                <strong className="text-[#211B25] dark:text-[#D8CCE8]">Key Ingredients:</strong>{' '}
                {product.keyIngredients.join(' · ')}
              </p>
            )}

            {product.features && product.features.length > 0 && (
              <ul className="space-y-1 text-xs text-[#746B78] dark:text-[#C5B9D8] list-disc pl-4">
                {product.features.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-[#E4DDD0] dark:border-[#261B36] space-y-2.5 text-xs text-[#746B78] dark:text-[#9C8EB2]">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#C99A35] dark:text-[#F5D061] shrink-0" />
              <span>Monrovia city delivery & store pickup available at ELWA Roundabout.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#8B42C9] dark:text-[#A855F7] shrink-0" />
              <span>Original cosmetics, skincare and essentials curated by NOVALUXE.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products from Same Category */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-[#E4DDD0] dark:border-[#261B36] space-y-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8B42C9] dark:text-[#A855F7] font-semibold mb-1">
              You May Also Love
            </p>
            <h2 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
              Related {category?.name || 'Essentials'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map(rel => (
              <ProductCard
                key={rel.id}
                product={rel}
                onViewDetails={onViewProduct}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
