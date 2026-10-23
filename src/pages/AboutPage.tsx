import {
  MapPin,
  Sparkles,
  Heart,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  ShoppingBag,
  Quote
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { NovaluxeLogo } from '../components/NovaluxeLogo';
import ceoPhoto from '../assets/images/mercy_sennel_jolo_ceo.jpeg';

interface AboutPageProps {
  onNavigateToShop: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToShop }) => {
  const { settings } = useSettings();

  const coreValues = [
    {
      title: 'Customer Satisfaction',
      description: 'Listening closely to our customers and providing attentive, helpful service with every inquiry and order.'
    },
    {
      title: 'Convenience',
      description: 'Making beauty and essentials effortlessly accessible through direct digital discovery, counter pickup, and Monrovia city delivery.'
    },
    {
      title: 'Quality-Conscious Selection',
      description: 'Curating authentic cosmetics, gentle skincare formulations, and everyday essentials that perform reliably.'
    },
    {
      title: 'Trust & Transparency',
      description: 'Clear pricing, accurate stock availability, and genuine business practices rooted in the heart of Monrovia.'
    },
    {
      title: 'Continuous Improvement',
      description: 'Expanding our product variety, listening to community feedback, and upgrading our customer retail experience.'
    }
  ];

  return (
    <div className="space-y-16 py-10 pb-20">
      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#170E26] via-[#1F1433] to-[#120B20] border border-[#34244C] p-8 sm:p-14 lg:p-16">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#F5D061] bg-[#281842]/70 px-3.5 py-1.5 rounded-full border border-[#482E70]/50">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>About NOVALUXE by Sennel</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#F3EFEA] leading-tight">
              Elegance, Quality & Everyday Essentials in Monrovia
            </h1>

            <p className="text-sm sm:text-base text-[#C5B9D8] leading-relaxed">
              NOVALUXE is a cosmetics, beauty, personal care, and everyday essentials retail business based in Monrovia, Liberia. We are dedicated to introducing thoughtful, modern retail to our community.
            </p>
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-8 sm:p-12 space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#A855F7]">
            <Sparkles className="w-4 h-4" />
            <span>Our Story</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
            The NOVALUXE Philosophy
          </h2>

          <div className="space-y-4 text-sm text-[#C5B9D8] leading-relaxed">
            <p>
              {settings.aboutStory}
            </p>
            <p>
              From revitalizing morning skincare elixirs and velvet-finish makeup palettes to alluring signature fragrances and daily hygiene staples, our collections are chosen to reflect elegance, confidence, and real convenience.
            </p>
          </div>
        </div>
      </section>

      {/* Meet Our CEO Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#160E27] via-[#1B1130] to-[#110A1E] border border-[#3E2A5C] p-8 sm:p-12 lg:p-14 shadow-2xl">
          {/* Subtle ambient lighting */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F5D061]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#A855F7]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Side: CEO Photograph */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
                {/* Elegant subtle gold & purple radiant halo */}
                <div className="absolute -inset-1 bg-gradient-to-b from-[#F5D061]/30 via-[#A855F7]/25 to-[#F5D061]/10 rounded-3xl blur-xs opacity-75" />

                <div className="relative rounded-3xl overflow-hidden bg-[#181024] border border-[#482E70] shadow-2xl aspect-[3/4]">
                  <img
                    src={ceoPhoto}
                    alt="Mercy Nuch Sennel Jolo, Founder & Chief Executive Officer of NOVALUXE by Sennel"
                    referrerPolicy="no-referrer"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/NOVALUXE_CEO_ab7b33ed.jpeg';
                    }}
                    className="w-full h-full object-cover object-top filter brightness-[1.01] contrast-[1.02]"
                  />

                  {/* Scrim overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0C0717]/95 via-[#0C0717]/40 to-transparent" />

                  {/* Elegant bottom nameplate */}
                  <div className="absolute bottom-3.5 inset-x-3.5 bg-[#140D22]/90 backdrop-blur-md border border-[#3E295B] rounded-2xl px-4 py-2.5 text-center shadow-lg">
                    <p className="text-xs font-serif font-bold text-[#F3EFEA] tracking-wide">
                      Mercy Nuch Sennel Jolo
                    </p>
                    <p className="text-[10px] text-[#F5D061] font-semibold tracking-wider uppercase mt-0.5">
                      Founder &amp; Chief Executive Officer
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: CEO Profile Text */}
            <div className="lg:col-span-7 space-y-6">
              {/* Header Label and Titles */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#F5D061]">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
                  <span>LEADERSHIP</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#F3EFEA] tracking-tight">
                  Meet Our CEO
                </h2>

                <p className="text-xs sm:text-sm font-medium tracking-wide text-[#C084FC]">
                  Leadership, Vision &amp; Excellence
                </p>
              </div>

              {/* Prominent Full Name and Title */}
              <div className="p-4 rounded-2xl bg-[#1A112B] border border-[#34244C] space-y-1">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F5D061]">
                  Mercy Nuch Sennel Jolo
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C5B9D8]">
                  Founder &amp; Chief Executive Officer (CEO)
                </p>
                <p className="text-[11px] text-[#A79DB8]">
                  NOVALUXE by Sennel · Monrovia, Liberia
                </p>
              </div>

              {/* Short Professional Profile */}
              <div className="space-y-4 text-sm text-[#C5B9D8] leading-relaxed">
                <p>
                  Under the leadership of Mercy Nuch Sennel Jolo, NOVALUXE by Sennel was established with a singular, inspiring ambition: to redefine beauty, skincare, and everyday retail in Monrovia through curated luxury, authentic quality, and uncompromising customer care.
                </p>
                <p>
                  Driven by an entrepreneurial vision for excellence and personal care, Mercy envisions NOVALUXE as more than a store—it is a trusted destination where clients discover dependable, quality-conscious products that elevate their routines and inspire confidence.
                </p>
              </div>

              {/* Closing statement reflecting vision */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#140D21] border border-[#2F1F45] space-y-2">
                <div className="flex items-start gap-3">
                  <Quote className="w-5 h-5 text-[#F5D061] shrink-0 mt-0.5 opacity-90" />
                  <p className="text-xs sm:text-sm italic text-[#E8E1F2] leading-relaxed">
                    “Our dedication is to provide genuine quality, attentive service, and an exceptional shopping experience that brings convenience, beauty, and confidence to our community in Monrovia.”
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-serif font-semibold text-[#F5D061] tracking-wider">
                    — Mercy Nuch Sennel Jolo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission */}
          <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#201435] text-[#F5D061] flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#F3EFEA]">Our Mission</h3>
            <p className="text-sm text-[#C5B9D8] leading-relaxed">
              "{settings.mission}"
            </p>
          </div>

          {/* Vision */}
          <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#201435] text-[#A855F7] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#F3EFEA]">Our Vision</h3>
            <p className="text-sm text-[#C5B9D8] leading-relaxed">
              "{settings.vision}"
            </p>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#120D1B] rounded-3xl border border-[#261B36] p-8 sm:p-12 space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F5D061] mb-1">
              Guiding Principles
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
              Our Core Values
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((val, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#171022] border border-[#2E2044] space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#F5D061] shrink-0" />
                  <h4 className="text-sm font-semibold text-[#F3EFEA]">{val.title}</h4>
                </div>
                <p className="text-xs text-[#A79DB8] leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official Business Location & Storefront */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#170E28] to-[#120B20] rounded-3xl border border-[#34244C] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F5D061]">
              <MapPin className="w-4 h-4 text-[#F5D061]" />
              <span>Official Monrovia Location</span>
            </div>
            <h3 className="text-2xl font-serif font-bold text-[#F3EFEA]">
              Visit or Pickup in Monrovia
            </h3>
            <p className="text-sm text-[#C5B9D8]">
              {settings.location}
            </p>
            <p className="text-xs text-[#8C829B]">
              Store counter pickup is available during normal business hours. You can also submit orders online for convenient dispatch anywhere in Monrovia.
            </p>
          </div>

          <button
            onClick={onNavigateToShop}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] hover:opacity-95 text-[#0A0710] font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Our Products</span>
          </button>
        </div>
      </section>
    </div>
  );
};
