import React, { useState } from 'react';
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

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBackToCart,
  onOrderPlaced
}) => {
  const { cart, subtotal, clearCart } = useCart();
  const { settings, products } = useSettings();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [selectedArea, setSelectedArea] = useState(MONROVIA_DISTRICTS[0]);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const deliveryFee = deliveryMethod === 'Delivery' ? settings.deliveryFee : 0;
  const finalTotal = subtotal + deliveryFee;

  const handleSubmitOrder = (e: React.FormEvent) => {
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

    if (!phone.trim() || phone.trim().length < 6) {
      setErrorMessage('Please provide a valid phone number for delivery contact.');
      return;
    }

    if (deliveryMethod === 'Delivery' && !address.trim()) {
      setErrorMessage('Please provide your street address or landmark in Monrovia.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Server/database validation of current prices and stock
      const latestProducts = store.getProducts();
      let calculatedSubtotal = 0;

      const orderItems = cart.map(item => {
        const liveProduct = latestProducts.find(p => p.id === item.product.id);
        const livePrice = liveProduct ? liveProduct.price : item.product.price;
        const liveAdj = item.selectedVariant?.priceAdjustment || 0;
        const unitPrice = livePrice + liveAdj;
        const lineTotal = unitPrice * item.quantity;
        calculatedSubtotal += lineTotal;

        return {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          orderId: '',
          productId: item.product.id,
          productName: item.product.name,
          selectedVariant: item.selectedVariant ? `${item.selectedVariant.variantName}: ${item.selectedVariant.variantValue}` : undefined,
          quantity: item.quantity,
          unitPrice,
          subtotal: lineTotal,
          imageUrl: item.product.images[0]
        };
      });

      const total = calculatedSubtotal + deliveryFee;

      const newOrder = store.createOrder({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        deliveryLocation: deliveryMethod === 'Pickup' ? 'Store Counter (ELWA Roundabout)' : selectedArea,
        deliveryAddress: deliveryMethod === 'Pickup' ? 'NOVALUXE by Sennel Store Counter, GSA Road near ELWA Roundabout, Monrovia' : address.trim(),
        deliveryMethod,
        deliveryFee,
        subtotal: calculatedSubtotal,
        totalAmount: total,
        currency: settings.currency,
        orderStatus: 'Confirmed',
        paymentStatus: 'Pending Verification',
        customerNotes: notes.trim() || undefined,
        items: orderItems
      });

      clearCart();
      setIsSubmitting(false);
      onOrderPlaced(newOrder);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'An error occurred while creating your order. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToCart}
          className="inline-flex items-center gap-1.5 text-xs text-[#9C8EB2] hover:text-[#F5D061] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Shopping Bag</span>
        </button>
        <h1 className="text-3xl font-serif font-bold text-[#F3EFEA] mt-2">
          Checkout & Order Confirmation
        </h1>
        <p className="text-xs text-[#9C8EB2] mt-1">
          Complete your customer details to submit your order and open official WhatsApp confirmation.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Customer & Delivery Form Left */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Method Choice */}
            <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3EFEA]">
                1. Delivery Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('Delivery')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    deliveryMethod === 'Delivery'
                      ? 'bg-[#221637] border-[#A855F7] shadow-md'
                      : 'bg-[#181124] border-[#2E2044] hover:bg-[#1E152D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Truck className="w-5 h-5 text-[#F5D061]" />
                    <span className="text-xs font-semibold text-[#F5D061] tabular-nums">
                      +{settings.currency}{settings.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F3EFEA]">Local Monrovia Delivery</h3>
                    <p className="text-[11px] text-[#9C8EB2] mt-0.5">
                      Direct courier dispatch across Greater Monrovia
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod('Pickup')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    deliveryMethod === 'Pickup'
                      ? 'bg-[#221637] border-[#A855F7] shadow-md'
                      : 'bg-[#181124] border-[#2E2044] hover:bg-[#1E152D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Store className="w-5 h-5 text-[#A855F7]" />
                    <span className="text-xs font-semibold text-emerald-400">Free</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F3EFEA]">Store Counter Pickup</h3>
                    <p className="text-[11px] text-[#9C8EB2] mt-0.5">
                      GSA Road around ELWA Roundabout, Monrovia
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3EFEA]">
                2. Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-[#C5B9D8]">
                    Full Name <span className="text-[#F5D061]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Fatima Kamara"
                    className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#C5B9D8]">
                    Phone Number (WhatsApp preferred) <span className="text-[#F5D061]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +231 88 851 8375"
                    className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#C5B9D8]">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Destination */}
            {deliveryMethod === 'Delivery' ? (
              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3EFEA]">
                  3. Monrovia Delivery Location
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#C5B9D8]">
                      Area / District in Monrovia <span className="text-[#F5D061]">*</span>
                    </label>
                    <select
                      value={selectedArea}
                      onChange={e => setSelectedArea(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7] cursor-pointer"
                    >
                      {MONROVIA_DISTRICTS.map(area => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#C5B9D8]">
                      Street Address & Specific Landmark <span className="text-[#F5D061]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="e.g. 12th Street beachside, near the blue building, yellow gate"
                      className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F3EFEA]">
                  3. Pickup Counter Details
                </h2>
                <div className="p-4 rounded-xl bg-[#1A1227] border border-[#34244C] space-y-2 text-xs text-[#C5B9D8]">
                  <p className="font-semibold text-[#F5D061]">NOVALUXE by Sennel Counter</p>
                  <p>Location: GSA Road, around the ELWA Roundabout, Monrovia, Liberia.</p>
                  <p className="text-[#9C8EB2]">
                    Your items will be prepared and held for you at the counter once submitted.
                  </p>
                </div>
              </div>
            )}

            {/* Additional Order Notes */}
            <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-2">
              <label className="text-xs font-medium text-[#C5B9D8]">
                Additional Instructions / Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special handling, preferred delivery window or call instructions..."
                className="w-full px-4 py-2.5 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
              />
            </div>
          </div>

          {/* Order Summary & Submit Button Right */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-5 sticky top-24">
              <h2 className="text-base font-serif font-semibold text-[#F3EFEA] uppercase tracking-wider border-b border-[#261B36] pb-3">
                Items In Your Order ({cart.length})
              </h2>

              <div className="divide-y divide-[#261B36] max-h-72 overflow-y-auto pr-1">
                {cart.map((item, idx) => {
                  const unitPrice = item.product.price + (item.selectedVariant?.priceAdjustment || 0);
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-[#F3EFEA] truncate">{item.product.name}</p>
                        {item.selectedVariant && (
                          <p className="text-[11px] text-[#A855F7]">{item.selectedVariant.variantValue}</p>
                        )}
                        <p className="text-[11px] text-[#8C829B]">
                          Qty: {item.quantity} × {settings.currency}{unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold text-[#F5D061] tabular-nums shrink-0">
                        {settings.currency}{lineTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#261B36] space-y-2 text-xs">
                <div className="flex justify-between text-[#C5B9D8]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-[#F3EFEA] tabular-nums">
                    {settings.currency}{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-[#C5B9D8]">
                  <span>Delivery Method</span>
                  <span className="font-semibold text-[#F3EFEA]">
                    {deliveryMethod === 'Pickup' ? 'Free Pickup' : `${settings.currency}${deliveryFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#261B36] flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-[#F3EFEA]">Total Amount</span>
                  <span className="text-2xl font-serif font-bold text-[#F5D061] tabular-nums">
                    {settings.currency}{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#CA8A04] hover:opacity-95 text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Processing Order...' : 'Submit Order & Continue to WhatsApp'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="p-3.5 rounded-xl bg-[#181124] border border-[#2D1E42] text-[11px] text-[#9C8EB2] space-y-1">
                <p className="font-medium text-[#E2D4B7]">What happens next?</p>
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
