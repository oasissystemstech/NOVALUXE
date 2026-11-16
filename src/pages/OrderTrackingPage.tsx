import React, { useState } from 'react';
import {
  Search,
  PackageCheck,
  ShieldCheck,
  AlertCircle,
  Truck,
  Store,
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { Order } from '../types';
import { store } from '../lib/store';
import { useSettings } from '../context/SettingsContext';

interface OrderTrackingPageProps {
  onNavigateToShop: () => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ onNavigateToShop }) => {
  const { settings } = useSettings();
  const [orderReference, setOrderReference] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setTrackedOrder(null);

    const cleanRef = orderReference.trim().toUpperCase();
    const cleanDigits = customerPhone.replace(/\D/g, '');

    if (cleanRef.length < 6) {
      setErrorMessage('Please enter your complete NOVALUXE order reference (e.g., NVL-2026-7841).');
      return;
    }
    if (cleanDigits.length < 7) {
      setErrorMessage('Please enter the full phone number used when placing your order.');
      return;
    }

    setIsSearching(true);
    try {
      const order = await store.lookupOrderByReference(cleanRef, customerPhone.trim());
      if (!order) {
        setErrorMessage(
          'No matching order was found. Please verify your exact order reference and full phone number.'
        );
      } else {
        setTrackedOrder(order);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to verify order right now. Please try again shortly.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[#8B42C9] dark:text-[#F5D061] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Customer Order Tracking</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
          Track Your Order
        </h1>
        <p className="text-xs text-[#746B78] dark:text-[#9C8EB2] max-w-md mx-auto leading-relaxed">
          Enter your order reference and the exact full phone number used at checkout to verify and view your current order status.
        </p>
      </div>

      {/* Lookup Form Card */}
      <form
        onSubmit={handleTrackOrder}
        className="bg-white dark:bg-[#120D1B] rounded-3xl border border-[#E4DDD0] dark:border-[#2B1D3E] p-6 sm:p-8 space-y-5 shadow-sm dark:shadow-none"
      >
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
              Order Reference <span className="text-[#C99A35] dark:text-[#F5D061]">*</span>
            </label>
            <input
              type="text"
              required
              value={orderReference}
              onChange={e => setOrderReference(e.target.value)}
              placeholder="e.g. NVL-2026-7841"
              className="w-full px-4 py-3 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs font-mono uppercase text-[#211B25] dark:text-[#F3EFEA] placeholder-[#9B91A1] dark:placeholder-[#6D5D82] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#211B25] dark:text-[#C5B9D8]">
              Full Phone Number <span className="text-[#C99A35] dark:text-[#F5D061]">*</span>
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="e.g. +231 88 542 1920"
              className="w-full px-4 py-3 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] placeholder-[#9B91A1] dark:placeholder-[#6D5D82] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B42C9] via-[#A855F7] to-[#C99A35] dark:from-[#A855F7] dark:via-[#C084FC] dark:to-[#CA8A04] hover:opacity-95 text-white dark:text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{isSearching ? 'Verifying Order...' : 'Verify & Track Order'}</span>
        </button>
      </form>

      {/* Verified Minimized Tracking Card */}
      {trackedOrder && (
        <div className="bg-white dark:bg-[#120D1B] rounded-3xl border border-[#E4DDD0] dark:border-[#2B1D3E] p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4DDD0] dark:border-[#261B36]">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#8B42C9] dark:text-[#A855F7] font-semibold flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Order Status Summary</span>
              </span>
              <h2 className="text-xl font-mono font-bold text-[#9E751C] dark:text-[#F5D061] mt-0.5">
                {trackedOrder.orderReference}
              </h2>
              <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2]">
                Placed {new Date(trackedOrder.createdAt).toLocaleDateString()} • Updated{' '}
                {new Date(trackedOrder.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#F2EBDD] dark:bg-[#201533] text-[#9E751C] dark:text-[#F5D061] text-xs font-semibold border border-[#E4DDD0] dark:border-[#3A2954]">
                {trackedOrder.orderStatus}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FAF8F4] dark:bg-[#1A1227] text-[#524858] dark:text-[#C5B9D8] text-xs font-medium border border-[#E4DDD0] dark:border-[#34244C]">
                Payment: {trackedOrder.paymentStatus}
              </span>
            </div>
          </div>

          {/* Fulfillment summary without PII */}
          <div className="p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#181124] border border-[#E4DDD0] dark:border-[#2D1E42] flex items-center gap-3 text-xs">
            {trackedOrder.deliveryMethod === 'Pickup' ? (
              <Store className="w-5 h-5 text-[#8B42C9] dark:text-[#A855F7] shrink-0" />
            ) : (
              <Truck className="w-5 h-5 text-[#C99A35] dark:text-[#F5D061] shrink-0" />
            )}
            <div>
              <p className="font-semibold text-[#211B25] dark:text-[#F3EFEA]">
                {trackedOrder.deliveryMethod === 'Pickup' ? 'Store Counter Pickup' : 'Monrovia Courier Delivery'}
              </p>
              <p className="text-[#746B78] dark:text-[#9C8EB2]">{trackedOrder.deliveryLocation}</p>
            </div>
          </div>

          {/* Items */}
          <div className="divide-y divide-[#E4DDD0] dark:divide-[#221633]">
            {trackedOrder.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs gap-4">
                <div>
                  <p className="font-medium text-[#211B25] dark:text-[#F3EFEA]">{item.productName}</p>
                  {item.selectedVariant && (
                    <p className="text-[11px] text-[#8B42C9] dark:text-[#A855F7]">{item.selectedVariant}</p>
                  )}
                  <p className="text-[11px] text-[#746B78] dark:text-[#8C829B]">
                    Qty: {item.quantity} × {trackedOrder.currency}
                    {item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <span className="font-semibold text-[#9E751C] dark:text-[#F5D061] tabular-nums shrink-0">
                  {trackedOrder.currency}
                  {item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-[#E4DDD0] dark:border-[#261B36] space-y-2 text-xs">
            <div className="flex justify-between text-[#524858] dark:text-[#C5B9D8]">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums">
                {trackedOrder.currency}
                {trackedOrder.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[#524858] dark:text-[#C5B9D8]">
              <span>Delivery ({trackedOrder.deliveryMethod})</span>
              <span className="font-semibold tabular-nums">
                {trackedOrder.deliveryMethod === 'Pickup'
                  ? 'Free'
                  : `${trackedOrder.currency}${trackedOrder.deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E4DDD0] dark:border-[#221633] flex justify-between items-baseline text-sm">
              <span className="font-bold text-[#211B25] dark:text-[#F3EFEA]">Total</span>
              <span className="text-xl font-serif font-bold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                {trackedOrder.currency}
                {trackedOrder.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href={`https://wa.me/${settings.whatsappRaw}?text=${encodeURIComponent(
                `Hello NOVALUXE, I would like an update on my order ${trackedOrder.orderReference}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366]/15 dark:bg-[#25D366]/20 text-emerald-700 dark:text-[#25D366] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#25D366]/25 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ask Support on WhatsApp</span>
            </a>

            <button
              onClick={onNavigateToShop}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#3A2954] text-xs font-semibold text-[#9E751C] dark:text-[#F5D061] inline-flex items-center justify-center gap-1.5 hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] transition-colors cursor-pointer"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
