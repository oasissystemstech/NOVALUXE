import React from 'react';
import { ArrowLeft, Shield, FileText, Truck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface PolicyPageProps {
  policyType: 'privacy' | 'terms' | 'delivery-returns';
  onBack: () => void;
}

export const PolicyPages: React.FC<PolicyPageProps> = ({ policyType, onBack }) => {
  const { settings } = useSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#9C8EB2] hover:text-[#F5D061] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Previous Page</span>
      </button>

      {policyType === 'delivery-returns' && (
        <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-8 sm:p-12 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#201435] text-[#F5D061] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
                Delivery & Returns Policy
              </h1>
              <p className="text-xs text-[#9C8EB2]">NOVALUXE by Sennel • Monrovia, Liberia</p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#C5B9D8] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">1. Local Monrovia Delivery</h2>
              <p>
                We offer courier delivery across Greater Monrovia, including Sinkor, Congo Town, Paynesville, GSA Road, Old Road, Central Monrovia, Bushrod Island, and surrounding districts.
              </p>
              <p>
                Standard local delivery rates are configured at checkout ({settings.currency}{settings.deliveryFee.toFixed(2)}). Our dispatch team coordinates via WhatsApp or direct phone call prior to arrival.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">2. Store Counter Pickup</h2>
              <p>
                Customers are welcome to select free Counter Pickup at our official business location on GSA Road, around the ELWA Roundabout, Monrovia, Liberia. Orders are typically prepared for pickup shortly after order confirmation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">3. Order Inspection & Returns</h2>
              <p>
                For hygiene, cosmetics, and personal care safety, products cannot be returned once opened, tested, or seal-broken. Customers are encouraged to inspect products upon delivery or pickup. If an item is damaged or incorrectly fulfilled, please notify us within 24 hours via WhatsApp with photos for immediate resolution.
              </p>
            </section>
          </div>
        </div>
      )}

      {policyType === 'terms' && (
        <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-8 sm:p-12 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#201435] text-[#A855F7] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
                Terms and Conditions
              </h1>
              <p className="text-xs text-[#9C8EB2]">NOVALUXE by Sennel • Monrovia, Liberia</p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#C5B9D8] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">1. Store Acceptance</h2>
              <p>
                By browsing the NOVALUXE website, viewing products, and submitting orders, you agree to these Terms and Conditions. NOVALUXE by Sennel operates as a retail business located in Monrovia, Liberia.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">2. Pricing & Currency</h2>
              <p>
                All prices are displayed in {settings.currency} (USD) as standard. Prices and stock availability are subject to verification upon order placement. In the rare event of an inventory discrepancy, our team will inform you prior to delivery.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">3. Ordering Process</h2>
              <p>
                Orders submitted online generate a unique order reference. Order details are transmitted via WhatsApp for confirmation and dispatch scheduling. An order becomes binding once confirmed by our store team.
              </p>
            </section>
          </div>
        </div>
      )}

      {policyType === 'privacy' && (
        <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-8 sm:p-12 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#201435] text-[#25D366] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
                Privacy Policy
              </h1>
              <p className="text-xs text-[#9C8EB2]">NOVALUXE by Sennel • Monrovia, Liberia</p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#C5B9D8] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">1. Information We Collect</h2>
              <p>
                We collect customer contact details (such as your full name, phone number, optional email address, and delivery location) solely to process your orders, schedule local delivery in Monrovia, and respond to your enquiries.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">2. Use of Information</h2>
              <p>
                Your personal details are used strictly for customer service, order fulfillment, and direct communication regarding your purchases. We do not sell, rent, or distribute your private information to third parties.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[#F3EFEA]">3. Contact & Security</h2>
              <p>
                For questions regarding your data privacy, you may contact our official team directly at {settings.email} or via WhatsApp at {settings.whatsapp}.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
