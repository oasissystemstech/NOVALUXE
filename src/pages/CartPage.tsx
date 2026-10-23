import React from 'react';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

interface CartPageProps {
  onNavigateToShop: () => void;
  onNavigateToCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onNavigateToShop,
  onNavigateToCheckout
}) => {
  const { cart, updateQuantity, removeFromCart, clearCart, subtotal, cartCount } = useCart();
  const { settings } = useSettings();

  const estimatedDelivery = settings.deliveryFee;
  const estimatedTotal = subtotal + (cart.length > 0 ? estimatedDelivery : 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#181124] border border-[#2D1E42] text-[#8C829B] flex items-center justify-center mx-auto">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#F3EFEA]">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-sm text-[#9C8EB2] max-w-md mx-auto">
          Explore our collection of luxury cosmetics, skincare, fragrances, and everyday essentials curated in Monrovia.
        </p>
        <button
          onClick={onNavigateToShop}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
        >
          <span>Explore Shop Catalogue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#261B36] gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#F3EFEA]">
            Shopping Bag ({cartCount} {cartCount === 1 ? 'item' : 'items'})
          </h1>
          <p className="text-xs text-[#9C8EB2] mt-1">
            Review your selected beauty and personal care items before checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-[#8C829B] hover:text-red-400 self-start sm:self-auto transition-colors"
        >
          Empty Entire Bag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Item List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="divide-y divide-[#261B36] bg-[#120D1B] rounded-2xl border border-[#261B36] p-6">
            {cart.map((item, idx) => {
              const unitPrice = item.product.price + (item.selectedVariant?.priceAdjustment || 0);
              const lineTotal = unitPrice * item.quantity;
              const maxStock = item.selectedVariant?.stockQuantity ?? item.product.stockQuantity;

              return (
                <div
                  key={`${item.product.id}-${item.selectedVariant?.id || 'base'}-${idx}`}
                  className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#1A1227] border border-[#34244C]/60 overflow-hidden shrink-0">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-medium text-[#F3EFEA] truncate">
                        {item.product.name}
                      </h3>
                      {item.selectedVariant && (
                        <p className="text-xs text-[#A855F7] font-medium">
                          {item.selectedVariant.variantName}: {item.selectedVariant.variantValue}
                        </p>
                      )}
                      <p className="text-xs text-[#9C8EB2] tabular-nums">
                        Unit Price: {settings.currency}{unitPrice.toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)}
                        className="text-xs text-[#8C829B] hover:text-red-400 inline-flex items-center gap-1 pt-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#221633]">
                    <div className="flex items-center border border-[#3B2D54] rounded-lg bg-[#160F22]">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariant?.id)}
                        className="p-1.5 text-[#8C829B] hover:text-[#F3EFEA] transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-semibold text-[#F3EFEA] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        disabled={item.quantity >= maxStock}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariant?.id)}
                        className="p-1.5 text-[#8C829B] hover:text-[#F3EFEA] disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-serif font-bold text-[#F5D061] tabular-nums">
                        {settings.currency}{lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onNavigateToShop}
            className="inline-flex items-center gap-1.5 text-xs text-[#A79DB8] hover:text-[#F5D061] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>
        </div>

        {/* Order Summary Panel */}
        <div className="lg:col-span-4">
          <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-5 sticky top-24">
            <h2 className="text-base font-serif font-semibold text-[#F3EFEA] uppercase tracking-wider border-b border-[#261B36] pb-3">
              Order Summary
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-[#C5B9D8]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#F3EFEA] tabular-nums">
                  {settings.currency}{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#C5B9D8]">
                <span>Estimated Monrovia Delivery</span>
                <span className="font-semibold text-[#F3EFEA] tabular-nums">
                  {settings.currency}{estimatedDelivery.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#8C829B]">
                Free pickup is also selectable at ELWA Roundabout counter during checkout.
              </p>
            </div>

            <div className="pt-4 border-t border-[#261B36] flex justify-between items-baseline">
              <span className="text-sm font-semibold text-[#F3EFEA]">Estimated Total</span>
              <span className="text-2xl font-serif font-bold text-[#F5D061] tabular-nums">
                {settings.currency}{estimatedTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onNavigateToCheckout}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] hover:opacity-95 text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
