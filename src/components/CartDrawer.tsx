import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

interface CartDrawerProps {
  onNavigateToCart: () => void;
  onNavigateToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateToCart,
  onNavigateToCheckout
}) => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, subtotal, cartCount } = useCart();
  const { settings } = useSettings();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#100B18] border-l border-[#3B2D54] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A1E3D]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#A855F7]" />
              <h2 className="text-lg font-serif font-semibold text-[#F3EFEA]">Your Shopping Bag</h2>
              <span className="text-xs text-[#E2D4B7] bg-[#221735] px-2 py-0.5 rounded-full font-medium">
                {cartCount}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#8C829B] hover:text-[#F3EFEA] rounded-lg hover:bg-[#1E152D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-[#261B36]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#1E152D] flex items-center justify-center mb-4 text-[#8C829B]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-medium text-[#F3EFEA]">Your bag is empty</h3>
                <p className="text-xs text-[#8C829B] mt-1 max-w-xs">
                  Discover our premium beauty, skincare, and everyday essentials curated in Monrovia.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 text-xs font-semibold tracking-wider uppercase text-[#0D0B12] bg-[#F5D061] hover:bg-[#F3C543] rounded-lg transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.map((item, idx) => {
                const itemPrice = item.product.price + (item.selectedVariant?.priceAdjustment || 0);
                const itemTotal = itemPrice * item.quantity;
                return (
                  <div key={`${item.product.id}-${item.selectedVariant?.id || 'base'}-${idx}`} className="py-4 flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-[#1C1428] border border-[#3B2D54]/50 overflow-hidden shrink-0">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-[#F3EFEA] truncate">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)}
                            className="text-[#8C829B] hover:text-red-400 p-0.5 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {item.selectedVariant && (
                          <p className="text-xs text-[#A855F7] mt-0.5 font-medium">
                            {item.selectedVariant.variantName}: {item.selectedVariant.variantValue}
                          </p>
                        )}
                        <p className="text-xs text-[#E2D4B7] mt-1 tabular-nums">
                          {settings.currency}{itemPrice.toFixed(2)} each
                        </p>
                      </div>

                      {/* Quantity Controls and Line Total */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-[#3B2D54] rounded-md bg-[#160F22]">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariant?.id)}
                            className="p-1 text-[#8C829B] hover:text-[#F3EFEA] transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-medium text-[#F3EFEA] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariant?.id)}
                            className="p-1 text-[#8C829B] hover:text-[#F3EFEA] transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-[#F5D061] tabular-nums">
                          {settings.currency}{itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-[#2A1E3D] bg-[#0C0813] space-y-4">
              <div className="space-y-1.5 text-xs text-[#A79DB8]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-sm font-semibold text-[#F3EFEA] tabular-nums">
                    {settings.currency}{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[#8C829B]">
                  <span>Local Monrovia Delivery / Pickup</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onNavigateToCart();
                  }}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#3B2D54] text-xs font-medium text-[#E2D4B7] hover:bg-[#1E152D] hover:text-[#F3EFEA] transition-colors"
                >
                  View Full Cart
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onNavigateToCheckout();
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#A855F7] to-[#CA8A04] hover:opacity-95 text-xs font-semibold text-[#0B0910] flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
