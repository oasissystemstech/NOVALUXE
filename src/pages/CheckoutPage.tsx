import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Store
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { store } from '../lib/store';
import { Order } from '../types';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderPlaced: (order: Order) => void;
}

const MONROVIA_DISTRICTS = [
  'GSA Road / ELWA Roundabout',
  'Sinkor (1st - 24th Streets)',
  'Congo Town / Tubman Boulevard',
  'Paynesville / Red Light',
  'Central Monrovia / Mamba Point',
  'Bushrod Island / Duala',
  'Gardnersville / Somalia Drive',
  'Old Road / James Spriggs',
  'Brewerville / Virginia',
  'Thinkers Village / Robertsfield Highway'
];

function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBackToCart,
  onOrderPlaced
}) => {
  const { cart, subtotal, clearCart } = useCart();
  const { settings, refreshProducts } = useSettings();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [selectedArea, setSelectedArea] = useState(MONROVIA_DISTRICTS[0]);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Stable request identifier per cart state to block accidental duplicate submissions
  const cartSignature = cart
    .map(i => `${i.product.id}:${i.selectedVariant?.id || ''}:${i.quantity}`)
    .join('|');
  const clientRequestIdRef = useRef<string>(createClientRequestId());

  useEffect(() => {
    clientRequestIdRef.current = createClientRequestId();
  }, [cartSignature, deliveryMethod]);

  const deliveryFee = deliveryMethod === 'Delivery' ? settings.deliveryFee : 0;
  const finalTotal = subtotal + deliveryFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (cart.length === 0) {
      setErrorMessage('Your shopping bag is empty.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Please provide a valid phone number (minimum 7 digits) for delivery contact.');
      return;
    }

    if (deliveryMethod === 'Delivery' && !address.trim()) {
      setErrorMessage('Please provide your street address or landmark in Monrovia.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prices, availability, stock, variants, and totals are calculated strictly on the server/database
      const confirmedOrder = await store.submitCheckoutOrder({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        deliveryLocation: deliveryMethod === 'Pickup' ? 'Store Counter (ELWA Roundabout)' : selectedArea,
        deliveryAddress:
          deliveryMethod === 'Pickup'
            ? 'NOVALUXE by Sennel Store Counter, GSA Road near ELWA Roundabout, Monrovia'
            : address.trim(),
        deliveryMethod,
        customerNotes: notes.trim() || undefined,
        clientRequestId: clientRequestIdRef.current,
        items: cart.map(item => ({
          productId: item.product.id,
          slug: item.product.slug,
          variantId: item.selectedVariant?.id,
          variantName: item.selectedVariant?.variantName,
          variantValue: item.selectedVariant?.variantValue,
          quantity: item.quantity,
          imageUrl: item.product.images[0]
        }))
      });

      clearCart();
      refreshProducts();
      setIsSubmitting(false);
      onOrderPlaced(confirmedOrder);
    } catch (err: any) {
      setIsSubmitting(false);
      refreshProducts();
      setErrorMessage(err?.message || 'An error occurred while creating your order. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToCart}
          className="inline-flex items-center gap-1.5 text-xs text-[#746B78] dark:text-[#9C8EB2] hover:text-[#8B42C9] dark:hover:text-[#F5D061] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Shopping Bag</span>
        </button>
        <h1 className="text-3xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA] mt-2">
          Checkout & Order Confirmation
        </h1>
        <p className="text-xs text-[#746B78] dark:text-[#9C8EB2] mt-1">
          Complete your customer details to submit your order and open official WhatsApp confirmation.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Customer & Delivery Form Left */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Method Choice */}
            <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#211B25] dark:text-[#F3EFEA]">
                1. Delivery Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('Delivery')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    deliveryMethod === 'Delivery'
                      ? 'bg-[#F2EBDD] dark:bg-[#221637] border-[#8B42C9] dark:border-[#A855F7] shadow-md'
                      : 'bg-[#FAF8F4] dark:bg-[#181124] border-[#E4DDD0] dark:border-[#2E2044] hover:bg-[#F2EBDD]/60 dark:hover:bg-[#1E152D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Truck className="w-5 h-5 text-[#C99A35] dark:text-[#F5D061]" />
                    <span className="text-xs font-semibold text-[#C99A35] dark:text-[#F5D061] tabular-nums">
                      +{settings.currency}{settings.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA]">Local Monrovia Delivery</h3>
                    <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2] mt-0.5">
                      Direct courier dispatch across Greater Monrovia
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod('Pickup')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    deliveryMethod === 'Pickup'
                      ? 'bg-[#F2EBDD] dark:bg-[#221637] border-[#8B42C9] dark:border-[#A855F7] shadow-md'
                      : 'bg-[#FAF8F4] dark:bg-[#181124] border-[#E4DDD0] dark:border-[#2E2044] hover:bg-[#F2EBDD]/60 dark:hover:bg-[#1E152D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Store className="w-5 h-5 text-[#8B42C9] dark:text-[#A855F7]" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Free</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA]">Store Counter Pickup</h3>
                    <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2] mt-0.5">
                      GSA Road around ELWA Roundabout, Monrovia
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#211B25] dark:text-[#F3EFEA]">
                2. Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
                    Full Name <span className="text-[#C99A35] dark:text-[#F5D061]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Fatima Kamara"
                    className="w-full px-4 py-2.5 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
                    Phone Number (WhatsApp preferred) <span className="text-[#C99A35] dark:text-[#F5D061]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +231 88 851 8375"
                    className="w-full px-4 py-2.5 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full px-4 py-2.5 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Destination */}
            {deliveryMethod === 'Delivery' ? (
              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#211B25] dark:text-[#F3EFEA]">
                  3. Monrovia Delivery Location
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
                      Area / District in Monrovia <span className="text-[#C99A35] dark:text-[#F5D061]">*</span>
                    </label>
                    <select
                      value={selectedArea}
                      onChange={e => setSelectedArea(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7] cursor-pointer"
                    >
                      {MONROVIA_DISTRICTS.map(area => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
                      Street Address & Specific Landmark <span className="text-[#C99A35] dark:text-[#F5D061]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="e.g. 12th Street beachside, near the blue building, yellow gate"
                      className="w-full px-4 py-2.5 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#211B25] dark:text-[#F3EFEA]">
                  3. Pickup Counter Details
                </h2>
                <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] space-y-2 text-xs text-[#746B78] dark:text-[#C5B9D8]">
                  <p className="font-semibold text-[#C99A35] dark:text-[#F5D061]">NOVALUXE by Sennel Counter</p>
                  <p>Location: GSA Road, around the ELWA Roundabout, Monrovia, Liberia.</p>
                  <p className="text-[#746B78] dark:text-[#9C8EB2]">
                    Your items will be prepared and held for you at the counter once submitted.
                  </p>
                </div>
              </div>
            )}

            {/* Additional Order Notes */}
            <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-2">
              <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
                Additional Instructions / Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special handling, preferred delivery window or call instructions..."
                className="w-full px-4 py-2.5 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
              />
            </div>
          </div>

          {/* Order Summary & Submit Button Right */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-5 sticky top-24">
              <h2 className="text-base font-serif font-semibold text-[#211B25] dark:text-[#F3EFEA] uppercase tracking-wider border-b border-[#E4DDD0] dark:border-[#261B36] pb-3">
                Items In Your Order ({cart.length})
              </h2>

              <div className="divide-y divide-[#E4DDD0] dark:divide-[#261B36] max-h-72 overflow-y-auto pr-1">
                {cart.map((item, idx) => {
                  const unitPrice = item.product.price + (item.selectedVariant?.priceAdjustment || 0);
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-[#211B25] dark:text-[#F3EFEA] truncate">{item.product.name}</p>
                        {item.selectedVariant && (
                          <p className="text-[11px] text-[#8B42C9] dark:text-[#A855F7]">{item.selectedVariant.variantValue}</p>
                        )}
                        <p className="text-[11px] text-[#746B78] dark:text-[#8C829B]">
                          Qty: {item.quantity} × {settings.currency}{unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold text-[#C99A35] dark:text-[#F5D061] tabular-nums shrink-0">
                        {settings.currency}{lineTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#E4DDD0] dark:border-[#261B36] space-y-2 text-xs">
                <div className="flex justify-between text-[#746B78] dark:text-[#C5B9D8]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-[#211B25] dark:text-[#F3EFEA] tabular-nums">
                    {settings.currency}{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-[#746B78] dark:text-[#C5B9D8]">
                  <span>Delivery Method</span>
                  <span className="font-semibold text-[#211B25] dark:text-[#F3EFEA]">
                    {deliveryMethod === 'Pickup' ? 'Free Pickup' : `${settings.currency}${deliveryFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E4DDD0] dark:border-[#261B36] flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA]">Total Amount</span>
                  <span className="text-2xl font-serif font-bold text-[#C99A35] dark:text-[#F5D061] tabular-nums">
                    {settings.currency}{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8B42C9] via-[#A855F7] to-[#C99A35] dark:from-[#A855F7] dark:via-[#C084FC] dark:to-[#CA8A04] hover:opacity-95 text-white dark:text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Processing Order...' : 'Submit Order & Continue to WhatsApp'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="p-3.5 rounded-xl bg-[#FAF8F4] dark:bg-[#181124] border border-[#E4DDD0] dark:border-[#2D1E42] text-[11px] text-[#746B78] dark:text-[#9C8EB2] space-y-1">
                <p className="font-medium text-[#211B25] dark:text-[#E2D4B7]">What happens next?</p>
                <p>
                  1. Your order reference will be generated and recorded securely in our database.
                </p>
                <p>
                  2. You can immediately open WhatsApp to transmit the structured order details to NOVALUXE for dispatch confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
