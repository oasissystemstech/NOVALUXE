import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant | null, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'novaluxe_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (product: Product, variant: ProductVariant | null = null, quantity = 1) => {
    if (!product.isAvailable || product.stockQuantity <= 0) {
      return;
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(item => {
        const sameProduct = item.product.id === product.id;
        const sameVariant = (item.selectedVariant?.id || null) === (variant?.id || null);
        return sameProduct && sameVariant;
      });

      if (existingIdx >= 0) {
        const next = [...prev];
        const nextQty = Math.min(product.stockQuantity, next[existingIdx].quantity + quantity);
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: nextQty
        };
        return next;
      } else {
        const initialQty = Math.min(product.stockQuantity, quantity);
        return [...prev, { product, selectedVariant: variant, quantity: initialQty }];
      }
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart(prev =>
      prev.filter(item => {
        const matchProduct = item.product.id === productId;
        const matchVariant = (item.selectedVariant?.id || undefined) === variantId;
        return !(matchProduct && matchVariant);
      })
    );
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        const matchProduct = item.product.id === productId;
        const matchVariant = (item.selectedVariant?.id || undefined) === variantId;
        if (matchProduct && matchVariant) {
          const maxStock = item.selectedVariant?.stockQuantity ?? item.product.stockQuantity;
          return {
            ...item,
            quantity: Math.min(maxStock, quantity)
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = item.product.price + (item.selectedVariant?.priceAdjustment || 0);
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartCount,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
