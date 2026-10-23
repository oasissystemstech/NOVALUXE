import React from 'react';
import {
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Instagram,
  Heart,
  Truck,
  ShieldCheck,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ProductCard } from '../components/ProductCard';
import { TikTokIcon } from '../components/TikTokIcon';
import { Product } from '../types';
interface HomePageProps {
  onNavigate: (path: string, param?: string) => void;
  onViewProduct: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onViewProduct
}) => {
  const { settings, categories, products } = useSettings();

  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 4);
  const newArrivals = products.filter(p => p.isNewArrival).slice(0, 4);
  const bestSellers = products.filter(p => p.isBestSeller).slice(0, 4);

  // Curated Instagram Showcase Items
  const instagramPosts = [
    {
      id: 'ig-1',
      title: 'Luxury Perfume Notes & Scent Layering',
      image: '/src/assets/images/category_fragrance_1792778553981.jpg',
      likes: '412',
      tag: '#NOVALUXEBeauty'
    },
    {
      id: 'ig-2',
      title: 'Dewy Morning Skincare Essentials',
      image: '/src/assets/images/category_skincare_1792778552269.jpg',
      likes: '589',
      tag: '#FloraHydration'
    },
    {
      id: 'ig-3',
      title: 'Velvet Lipsticks for Every Skin Tone',
      image: '/src/assets/images/category_makeup_1792778553083.jpg',
      likes: '624',
      tag: '#LuxeLips'
    },
    {
      id: 'ig-4',
      title: 'Botanical Body Care Routine in Monrovia',
      image: '/src/assets/images/category_bodycare_1792778553219.jpg',
      likes: '348',
      tag: '#MonroviaGlow'
    }
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center bg-[#0C0813] border-b border-[#231735] overflow-hidden">
        {/* Background Image with Measured Luxury Scrim */}
        <div className="absolute inset-0">
          <img
            src={settings.heroImage}
            alt="NOVALUXE Beauty & Essentials"
            className="w-full h-full object-cover object-center brightness-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C0813] via-[#0C0813]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0813] via-transparent to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#F5D061] bg-[#1F142E]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#4C346E]/60 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>Cosmetics • Beauty • Everyday Essentials</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#F3EFEA] tracking-tight leading-[1.1] text-balance">
              {settings.heroHeadline}
            </h1>

            <p className="text-base sm:text-lg text-[#C5B9D8] leading-relaxed max-w-xl font-normal">
              {settings.heroSubtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('/shop')}
                className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#D97706] hover:opacity-95 text-[#0A0710] font-semibold text-sm tracking-wide flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Shop Now</span>
              </button>
              <button
                onClick={() => onNavigate('/about')}
                className="px-6 py-3.5 rounded-xl bg-[#181124]/90 hover:bg-[#251A38] text-[#E2D4B7] hover:text-[#FFFFFF] border border-[#463364] font-medium text-sm transition-all cursor-pointer"
              >
                Discover NOVALUXE
              </button>
            </div>

            {/* Quick Regional Trust Marker */}
            <div className="pt-4 flex items-center gap-6 text-xs text-[#9C8EB2]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#F5D061]" />
                <span>Monrovia Store Pickup Available</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#A855F7]" />
                <span>Local Monrovia Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#A855F7] font-semibold mb-1">
              Curated Collections
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
              Explore by Category
            </h2>
          </div>
          <button
            onClick={() => onNavigate('/shop')}
            className="text-xs font-semibold text-[#F5D061] hover:text-[#F3C543] flex items-center gap-1 group cursor-pointer"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.filter(c => c.isActive).slice(0, 4).map(category => (
            <div
              key={category.id}
              onClick={() => onNavigate('/shop', category.slug)}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-[#140D1F] border border-[#2B1D3E] hover:border-[#634887] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            >
              <img
                src={category.imageUrl}
                alt={category.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0813] via-[#0C0813]/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 space-y-1">
                <h3 className="text-lg font-serif font-semibold text-[#F3EFEA] group-hover:text-[#F5D061] transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-[#C5B9D8] line-clamp-1">
                  {category.description}
                </p>
                <div className="pt-2 flex items-center text-xs font-medium text-[#F5D061] gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#F5D061] font-semibold mb-1">
              Handpicked Selection
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
              Featured Essentials
            </h2>
          </div>
          <button
            onClick={() => onNavigate('/shop')}
            className="text-xs font-semibold text-[#A855F7] hover:text-[#C084FC] flex items-center gap-1 group cursor-pointer"
          >
            <span>See Catalogue</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onViewDetails={onViewProduct}
            />
          ))}
        </div>
      </section>

      {/* 4. EDITORIAL BRAND INTRODUCTION SECTION */}
      <section className="bg-gradient-to-b from-[#110B1C] to-[#0D0916] border-y border-[#281C3B] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-0.5 bg-gradient-to-r from-[#A855F7] to-[#EAB308] mx-auto rounded-full" />
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#F3EFEA] tracking-tight leading-snug">
            Thoughtfully Curated for Your Everyday Beauty & Lifestyle
          </h2>
          <p className="text-base text-[#C5B9D8] leading-relaxed max-w-2xl mx-auto">
            {settings.brandIntro}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/about')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#4C3668] text-[#E2D4B7] hover:text-[#FFFFFF] hover:bg-[#1E142F] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <span>Discover Our Story & Values</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#F5D061] font-semibold mb-1">
                Just Arrived in Monrovia
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
                New Arrivals
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/shop')}
              className="text-xs font-semibold text-[#A855F7] hover:text-[#C084FC] flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={onViewProduct}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. CUSTOMER FAVOURITES / BEST SELLERS */}
      {bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#A855F7] font-semibold mb-1">
                Most Loved
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
                Customer Favourites
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/shop')}
              className="text-xs font-semibold text-[#F5D061] hover:text-[#F3C543] flex items-center gap-1 cursor-pointer"
            >
              <span>Browse All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={onViewProduct}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. CUSTOMER BENEFITS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#120D1B] rounded-3xl border border-[#2B1E3E] p-8 sm:p-12">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
              The NOVALUXE Shopping Experience
            </h2>
            <p className="text-xs text-[#9C8EB2] mt-2">
              Designed for effortless retail convenience in Monrovia
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#1A1227] border border-[#34244C]/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#281A3F] text-[#F5D061] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F3EFEA]">Convenient Shopping</h3>
              <p className="text-xs text-[#A79DB8] leading-relaxed">
                Browse our full catalogue anytime without requiring an account. Instant ordering with straightforward checkout.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1227] border border-[#34244C]/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#281A3F] text-[#A855F7] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F3EFEA]">Thoughtful Variety</h3>
              <p className="text-xs text-[#A79DB8] leading-relaxed">
                From high-pigment cosmetics to hydrating botanical skincare and lasting fragrances, all in one place.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1227] border border-[#34244C]/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#281A3F] text-[#F5D061] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F3EFEA]">Monrovia Delivery & Pickup</h3>
              <p className="text-xs text-[#A79DB8] leading-relaxed">
                Choose convenient local delivery across Monrovia or quick store counter pickup at GSA Road near ELWA Roundabout.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1227] border border-[#34244C]/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#281A3F] text-[#25D366] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F3EFEA]">Direct WhatsApp Support</h3>
              <p className="text-xs text-[#A79DB8] leading-relaxed">
                Connect directly with our team on WhatsApp for order confirmation, product guidance, and fast assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. INSTAGRAM SHOWCASE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#E1306C] font-semibold mb-1">
              <Instagram className="w-4 h-4" />
              <span>@sennel_bbm</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F3EFEA]">
              Follow the NOVALUXE Experience
            </h2>
            <p className="text-xs text-[#9C8EB2] mt-1">
              Discover our latest beauty essentials, product highlights, and updates on Instagram.
            </p>
          </div>

          <a
            href={settings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#1E142F] hover:bg-[#2F1F47] text-[#F3EFEA] border border-[#483363] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Instagram className="w-4 h-4 text-[#E1306C]" />
            <span>Follow on Instagram</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#9C8EB2]" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {instagramPosts.map(post => (
            <a
              key={post.id}
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-2xl overflow-hidden aspect-square bg-[#171022] border border-[#2B1D3E] block hover:border-[#A855F7] transition-all duration-300"
            >
              <img
                src={post.image}
                alt={post.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4">
                <span className="text-[11px] font-semibold text-[#F5D061] tracking-wide self-start">
                  {post.tag}
                </span>
                <div>
                  <p className="text-xs text-[#F3EFEA] font-medium line-clamp-2">
                    {post.title}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#E2D4B7]">
                    <Heart className="w-3.5 h-3.5 fill-[#E1306C] text-[#E1306C]" />
                    <span>{post.likes}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 9. TIKTOK INTEGRATION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#170C28] via-[#1E1333] to-[#120B20] rounded-3xl border border-[#3C2956] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs uppercase tracking-widest text-[#F5D061] font-semibold">
              Trending Content
            </span>
            <h3 className="text-2xl font-serif font-bold text-[#F3EFEA]">
              Connect with NOVALUXE on TikTok
            </h3>
            <p className="text-xs text-[#C5B9D8] max-w-lg">
              Watch product demonstrations, beauty tips, unboxings, and store highlights on our official TikTok profile <span className="text-[#F5D061] font-medium">@sennel_bbm</span>.
            </p>
          </div>

          <a
            href={settings.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-[#000000] hover:bg-[#121212] text-[#F3EFEA] border border-[#44305E] hover:border-[#00F2EA]/40 text-xs font-semibold flex items-center gap-2.5 transition-all shadow-lg shrink-0 cursor-pointer group"
          >
            <TikTokIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span>Follow @sennel_bbm on TikTok</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#9C8EB2] group-hover:text-[#FFFFFF] transition-colors" />
          </a>
        </div>
      </section>
    </div>
  );
};
