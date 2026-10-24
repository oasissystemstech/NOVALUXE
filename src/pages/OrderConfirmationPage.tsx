import React, { useState } from 'react';
import {
  CheckCircle,
  MessageCircle,
  Copy,
  Check,
  Store,
  Truck,
  ExternalLink,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { Order } from '../types';
import { useSettings } from '../context/SettingsContext';
import { handleImageError } from '../lib/imageUtils';

interface OrderConfirmationPageProps {
  order: Order;
  onNavigateHome: () => void;
  onNavigateToShop: () => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  order,
  onNavigateHome,
  onNavigateToShop
}) => {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  // Generate the official structured WhatsApp order message
  const itemsListText = order.items
    .map(
      (item, i) =>
        `${i + 1}. ${item.productName}${item.selectedVariant ? ` (${item.selectedVariant})` : ''} - Qty: ${item.quantity} x ${order.currency}${item.unitPrice.toFixed(2)} = ${order.currency}${item.subtotal.toFixed(2)}`
    )
    .join('\n');

  const rawMessage = `*NEW ORDER - NOVALUXE BY SENNEL*
----------------------------------------
*Order Reference:* ${order.orderReference}
*Customer Name:* ${order.customerName}
*Phone Number:* ${order.customerPhone}${order.customerEmail ? `\n*Email:* ${order.customerEmail}` : ''}

*ORDERED ITEMS:*
${itemsListText}

*Subtotal:* ${order.currency}${order.subtotal.toFixed(2)}
*Delivery Method:* ${order.deliveryMethod} (${order.deliveryMethod === 'Pickup' ? 'Free Counter Pickup' : `${order.currency}${order.deliveryFee.toFixed(2)}`})
*Total Amount:* ${order.currency}${order.totalAmount.toFixed(2)}

*Destination Area:* ${order.deliveryLocation}
*Address / Landmark:* ${order.deliveryAddress}${order.customerNotes ? `\n*Special Notes:* ${order.customerNotes}` : ''}
----------------------------------------
_Sent via NOVALUXE Official Website_`;

  const encodedMessage = encodeURIComponent(rawMessage);
  const whatsappUrl = `https://wa.me/${settings.whatsappRaw}?text=${encodedMessage}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(rawMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Top Success Banner */}
      <div className="bg-[#120D1B] rounded-3xl border border-[#2B1D3E] p-8 sm:p-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-[#F5D061] font-semibold">
            Order Submitted Successfully
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
            Thank You, {order.customerName}!
          </h1>
          <p className="text-xs text-[#9C8EB2] max-w-md mx-auto">
            Your order has been recorded in our database. Please tap the button below to transmit your order details directly to our WhatsApp service for rapid fulfillment.
          </p>
        </div>

        {/* Order Reference Box */}
        <div className="inline-block bg-[#1B1327] border border-[#3C2856] rounded-2xl px-6 py-3 my-2">
          <span className="text-xs text-[#9C8EB2] block uppercase tracking-wider">Order Reference</span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-[#F5D061] tracking-wider">
            {order.orderReference}
          </span>
        </div>

        {/* Primary WhatsApp Action Button */}
        <div className="pt-2 max-w-md mx-auto space-y-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-[#0A0710] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Send Order via WhatsApp (+1 605 941-3997)</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={handleCopyMessage}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1A1227] hover:bg-[#241935] text-[#D8CCE8] border border-[#34244C] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Order Message Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#8C829B]" />
                <span>Copy Message Text (in case WhatsApp Web is used)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Itemized Order Receipt Snapshot */}
      <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#261B36] gap-2">
          <div>
            <h2 className="text-base font-serif font-bold text-[#F3EFEA]">
              Itemized Receipt Snapshot
            </h2>
            <p className="text-xs text-[#9C8EB2]">
              Recorded on {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs">
            <span className="text-[#9C8EB2]">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#201533] text-[#F5D061] font-semibold border border-[#3A2954]">
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Ordered items */}
        <div className="divide-y divide-[#221633]">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {item.imageUrl && (
                  <div className="w-12 h-12 rounded-lg bg-[#1A1227] overflow-hidden shrink-0 border border-[#34244C]/50">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-[#F3EFEA] truncate">{item.productName}</p>
                  {item.selectedVariant && (
                    <p className="text-[11px] text-[#A855F7]">{item.selectedVariant}</p>
                  )}
                  <p className="text-[11px] text-[#8C829B]">
                    Quantity: {item.quantity} × {order.currency}{item.unitPrice.toFixed(2)}
                  </p>
                </div>
              </div>
              <span className="font-semibold text-[#F5D061] tabular-nums shrink-0">
                {order.currency}{item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Financial Recap */}
        <div className="pt-4 border-t border-[#261B36] space-y-2 text-xs">
          <div className="flex justify-between text-[#C5B9D8]">
            <span>Subtotal</span>
            <span className="font-semibold text-[#F3EFEA] tabular-nums">
              {order.currency}{order.subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[#C5B9D8]">
            <span>Delivery Fee ({order.deliveryMethod})</span>
            <span className="font-semibold text-[#F3EFEA] tabular-nums">
              {order.deliveryMethod === 'Pickup' ? 'Free' : `${order.currency}${order.deliveryFee.toFixed(2)}`}
            </span>
          </div>
          <div className="pt-2 border-t border-[#221633] flex justify-between items-baseline text-sm">
            <span className="font-bold text-[#F3EFEA]">Total</span>
            <span className="text-xl font-serif font-bold text-[#F5D061] tabular-nums">
              {order.currency}{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Customer & Destination Summary */}
        <div className="pt-4 border-t border-[#261B36] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#171022] border border-[#2D1E42] space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-[#A855F7] font-semibold">Customer</p>
            <p className="font-medium text-[#F3EFEA]">{order.customerName}</p>
            <p className="text-[#C5B9D8]">{order.customerPhone}</p>
            {order.customerEmail && <p className="text-[#8C829B]">{order.customerEmail}</p>}
          </div>

          <div className="p-4 rounded-xl bg-[#171022] border border-[#2D1E42] space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-[#F5D061] font-semibold">
              {order.deliveryMethod === 'Pickup' ? 'Store Counter' : 'Delivery Address'}
            </p>
            <p className="font-medium text-[#F3EFEA]">{order.deliveryLocation}</p>
            <p className="text-[#C5B9D8]">{order.deliveryAddress}</p>
            {order.customerNotes && (
              <p className="text-[#8C829B] italic mt-1">Note: {order.customerNotes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Footnotes */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          onClick={onNavigateHome}
          className="text-xs text-[#9C8EB2] hover:text-[#F3EFEA] transition-colors"
        >
          ← Return to Homepage
        </button>
        <button
          onClick={onNavigateToShop}
          className="px-6 py-2.5 rounded-xl bg-[#1A1227] hover:bg-[#251A38] text-[#F5D061] border border-[#3A2954] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Continue Browsing Products</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
