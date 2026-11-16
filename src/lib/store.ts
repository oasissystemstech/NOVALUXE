import { Category, Product, Order, Enquiry, SiteSettings, PromoCampaignConfig, BulkUploadHistoryEntry } from '../types';
import { supabase } from './supabase';
import { normalizeImageUrl } from './imageUtils';

export const INITIAL_PROMO_CAMPAIGN: PromoCampaignConfig = {
  enabled: true,
  mediaType: 'video',
  mediaUrl: '/videos/novaluxe-promo.mp4',
  posterUrl: '/images/hero/hero_beauty_cosmetics.jpg',
  title: 'NOVALUXE by Sennel',
  subtitle: 'Elevate your daily routine with curated cosmetics, skincare, and luxury fragrances in Monrovia.',
  ctaText: 'EXPLORE NOVALUXE',
  destinationPath: '/shop',
  frequency: 'once_per_session',
  startDate: '',
  endDate: ''
};

export const INITIAL_SETTINGS: SiteSettings = {
  businessName: 'NOVALUXE by Sennel',
  businessCategory: 'Cosmetics, beauty products, skincare, personal care, and everyday essentials',
  location: 'GSA Road, around the ELWA Roundabout, Monrovia, Liberia',
  email: 'sennelgroup@gmail.com',
  whatsapp: '+1 (605) 941-3997',
  whatsappRaw: '16059413997',
  phoneNumbers: ['+231 88 851 8375', '+231 88 611 7880'],
  currency: '$',
  deliveryFee: 3.0,
  pickupEnabled: true,
  announcementText: 'Welcome to NOVALUXE by Sennel • Monrovia, Liberia',
  announcementEnabled: true,
  heroHeadline: 'Your Beauty. Your Essentials. Your NOVALUXE.',
  heroSubtitle: 'Discover beauty, personal care, and everyday essentials thoughtfully brought together for your lifestyle.',
  heroImage: '/images/hero/hero_beauty_cosmetics.jpg',
  instagramUrl: 'https://www.instagram.com/sennel_bbm/',
  tiktokUrl: 'https://www.tiktok.com/@sennel_bbm',
  brandIntro:
    'At NOVALUXE, beauty and everyday essentials come together in one convenient shopping experience. Explore a thoughtful selection of products designed to complement your beauty, personal care, and everyday lifestyle.',
  aboutStory:
    'NOVALUXE by Sennel is a premier cosmetics, beauty, personal care, and everyday essentials retail business based in Monrovia, Liberia, located along GSA Road around the ELWA Roundabout. Founded with a commitment to effortless elegance and everyday self-care, we carefully curate quality cosmetics, nurturing skincare, alluring fragrances, and daily wellness essentials that elevate your routine.',
  mission:
    'To make beauty, personal care, and everyday essentials conveniently accessible through a thoughtful product selection and a customer-focused shopping experience.',
  vision:
    'To become a trusted and recognizable destination for beauty and everyday essentials, connecting customers with products that complement their lifestyles.',
  promoCampaign: INITIAL_PROMO_CAMPAIGN
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-skincare',
    name: 'Skincare',
    slug: 'skincare',
    description: 'Nourishing cleansers, serums, hydrating creams, and skin elixirs.',
    imageUrl: '/images/categories/skincare.jpg',
    isActive: true,
    displayOrder: 1,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-makeup',
    name: 'Makeup',
    slug: 'makeup',
    description: 'Satin lipsticks, luminous compacts, and vibrant cosmetic palettes.',
    imageUrl: '/images/categories/makeup.jpg',
    isActive: true,
    displayOrder: 2,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-fragrances',
    name: 'Fragrances',
    slug: 'fragrances',
    description: 'Captivating eau de parfums and signature scents crafted for lasting presence.',
    imageUrl: '/images/categories/fragrances.jpg',
    isActive: true,
    displayOrder: 3,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-bodycare',
    name: 'Body Care',
    slug: 'body-care',
    description: 'Ultra-rich botanical butters, nourishing oils, and silky body polishers.',
    imageUrl: '/images/categories/bodycare.jpg',
    isActive: true,
    displayOrder: 4,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-haircare',
    name: 'Hair Care',
    slug: 'hair-care',
    description: 'Moisture treatments, botanical scalp elixirs, and restorative oils.',
    imageUrl: '/images/categories/bodycare.jpg',
    isActive: true,
    displayOrder: 5,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-personalcare',
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Gentle daily cleansers, body washes, and refreshing hygiene essentials.',
    imageUrl: '/images/categories/bodycare.jpg',
    isActive: true,
    displayOrder: 6,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-essentials',
    name: 'Everyday Essentials',
    slug: 'everyday-essentials',
    description: 'Thoughtfully selected wellness, beauty tools, and daily staples.',
    imageUrl: '/images/hero/hero_beauty_cosmetics.jpg',
    isActive: true,
    displayOrder: 7,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-avalon-eclat',
    name: 'Avalon Éclat Eau de Parfum',
    slug: 'avalon-eclat-eau-de-parfum',
    description:
      'A warm, luminous fragrance with delicate top notes of sparkling bergamot and golden amber, descending into smooth cedarwood and velvety vanilla. Handcrafted for unforgettable allure.',
    price: 65.0,
    currency: 'USD',
    categoryId: 'cat-fragrances',
    sku: 'NVL-FRG-001',
    stockQuantity: 18,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    images: ['/images/products/avalon_eclat.jpg'],
    variants: [
      { id: 'v1', productId: 'prod-avalon-eclat', variantName: 'Size', variantValue: '50ml EDP', priceAdjustment: 0, stockQuantity: 10 },
      { id: 'v2', productId: 'prod-avalon-eclat', variantName: 'Size', variantValue: '100ml EDP', priceAdjustment: 25, stockQuantity: 8 }
    ],
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'prod-flora-serum',
    name: 'Flora Botanical Hydrating Serum',
    slug: 'flora-botanical-hydrating-serum',
    description:
      'Infused with pure botanical elixir, multi-weight hyaluronic acid, and plant extracts. Restores natural skin barrier moisture, plumps fine lines, and imparts a dewy, youthful glow.',
    price: 34.0,
    currency: 'USD',
    categoryId: 'cat-skincare',
    sku: 'NVL-SKN-002',
    stockQuantity: 24,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    images: ['/images/products/flora_serum.jpg'],
    variants: [
      { id: 'v3', productId: 'prod-flora-serum', variantName: 'Size', variantValue: '30ml Dropper', priceAdjustment: 0, stockQuantity: 15 },
      { id: 'v4', productId: 'prod-flora-serum', variantName: 'Size', variantValue: '50ml Deluxe', priceAdjustment: 14, stockQuantity: 9 }
    ],
    createdAt: '2026-02-10T12:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z'
  },
  {
    id: 'prod-flora-cream',
    name: 'Flora Jasmine & Ceramide Daily Cream',
    slug: 'flora-jasmine-ceramide-daily-cream',
    description:
      'Ultra-nourishing daily facial moisturizer formulated with restorative ceramides, jasmine essence, and squalane. Light on the skin with deep 24-hour hydration.',
    price: 28.0,
    currency: 'USD',
    categoryId: 'cat-skincare',
    sku: 'NVL-SKN-003',
    stockQuantity: 30,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    images: ['/images/products/flora_cream.jpg'],
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z'
  },
  {
    id: 'prod-luxe-lipstick',
    name: 'Luxe Elixir Velvet Satin Lipstick',
    slug: 'luxe-elixir-velvet-satin-lipstick',
    description:
      'Rich, high-pigment satin formula encased in a weighted gold bullet. Glides smoothly across the lips with all-day comfortable wear and velvety botanical hydration.',
    price: 18.0,
    currency: 'USD',
    categoryId: 'cat-makeup',
    sku: 'NVL-MKP-004',
    stockQuantity: 42,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    images: ['/images/products/luxe_lipstick.jpg'],
    variants: [
      { id: 'v5', productId: 'prod-luxe-lipstick', variantName: 'Shade', variantValue: 'Deep Berry Velvet', priceAdjustment: 0, stockQuantity: 14 },
      { id: 'v6', productId: 'prod-luxe-lipstick', variantName: 'Shade', variantValue: 'Warm Spiced Nude', priceAdjustment: 0, stockQuantity: 16 },
      { id: 'v7', productId: 'prod-luxe-lipstick', variantName: 'Shade', variantValue: 'Monrovia Sunset Red', priceAdjustment: 0, stockQuantity: 12 }
    ],
    createdAt: '2026-02-20T11:00:00Z',
    updatedAt: '2026-02-20T11:00:00Z'
  },
  {
    id: 'prod-rosegold-palette',
    name: 'Celestial Rose Gold Eyeshadow Palette',
    slug: 'celestial-rose-gold-eyeshadow-palette',
    description:
      'An exquisite nine-pan collection of buttery mattes, molten metallics, and radiant rose gold foils. Blendable, non-creasing textures designed for daytime subtlety or sultry evening drama.',
    price: 32.0,
    currency: 'USD',
    categoryId: 'cat-makeup',
    sku: 'NVL-MKP-005',
    stockQuantity: 15,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    images: ['/images/products/rosegold_palette.jpg'],
    createdAt: '2026-01-20T14:30:00Z',
    updatedAt: '2026-01-20T14:30:00Z'
  },
  {
    id: 'prod-aura-eclipse',
    name: 'Aura Eclipse Intense Parfum',
    slug: 'aura-eclipse-intense-parfum',
    description:
      'A deeply sophisticated artisanal fragrance presented in a multifaceted crystal decanter with brushed gold cap. Notes of dark plum, smoky oud, iris root, and warm amber resin.',
    price: 75.0,
    currency: 'USD',
    categoryId: 'cat-fragrances',
    sku: 'NVL-FRG-006',
    stockQuantity: 12,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    images: ['/images/products/aura_eclipse.jpg'],
    variants: [
      { id: 'v8', productId: 'prod-aura-eclipse', variantName: 'Size', variantValue: '100ml Decanter', priceAdjustment: 0, stockQuantity: 12 }
    ],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'prod-botanical-body-oil',
    name: 'Botanical Nourishment Organic Body Oil',
    slug: 'botanical-nourishment-organic-body-oil',
    description:
      'Cold-pressed golden jojoba, sea buckthorn, and sweet almond oil blended to lock in radiant suppleness. Leaves skin silky soft with zero greasy residue and a calming lavender undertone.',
    price: 24.0,
    currency: 'USD',
    categoryId: 'cat-bodycare',
    sku: 'NVL-BDY-007',
    stockQuantity: 28,
    isAvailable: true,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: true,
    images: ['/images/products/botanical_body_oil.jpg'],
    variants: [
      { id: 'v9', productId: 'prod-botanical-body-oil', variantName: 'Size', variantValue: '200ml Glass Pump', priceAdjustment: 0, stockQuantity: 28 }
    ],
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-02-15T08:00:00Z'
  },
  {
    id: 'prod-plant-petal-butter',
    name: 'Plant & Petal Ultra-Rich Shea Body Butter',
    slug: 'plant-petal-ultra-rich-shea-body-butter',
    description:
      'Whipped raw African shea butter enriched with sweet jasmine flower extracts and virgin coconut oil. Deeply melts into dry skin for long-lasting hydration and velvet texture.',
    price: 22.0,
    currency: 'USD',
    categoryId: 'cat-bodycare',
    sku: 'NVL-BDY-008',
    stockQuantity: 35,
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    images: ['/images/products/plant_petal_butter.jpg'],
    createdAt: '2026-01-25T11:00:00Z',
    updatedAt: '2026-01-25T11:00:00Z'
  },
  {
    id: 'prod-luminous-compact',
    name: 'Luminous Silk Finishing Powder & Puff',
    slug: 'luminous-silk-finishing-powder-puff',
    description:
      'Micro-milled featherweight setting powder that gently blurs imperfections, eliminates excess shine, and delivers a radiant soft-focus finish that never cakes.',
    price: 21.0,
    currency: 'USD',
    categoryId: 'cat-makeup',
    sku: 'NVL-MKP-009',
    stockQuantity: 22,
    isAvailable: true,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    images: ['/images/products/luminous_compact.jpg'],
    createdAt: '2026-01-18T13:00:00Z',
    updatedAt: '2026-01-18T13:00:00Z'
  },
  {
    id: 'prod-herbal-hair-oil',
    name: 'Restorative Herbal Hair & Scalp Elixir',
    slug: 'restorative-herbal-hair-scalp-elixir',
    description:
      'Stimulating botanical scalp and hair therapy enriched with rosemary, castor oil, and peppermint essence. Strengthens roots, adds mirror shine, and promotes healthy hair growth.',
    price: 26.0,
    currency: 'USD',
    categoryId: 'cat-haircare',
    sku: 'NVL-HRC-010',
    stockQuantity: 19,
    isAvailable: true,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    images: ['/images/products/herbal_hair_oil.jpg'],
    createdAt: '2026-02-18T16:00:00Z',
    updatedAt: '2026-02-18T16:00:00Z'
  },
  {
    id: 'prod-gentle-cleanser',
    name: 'Gentle Purifying Facial Cleansing Gel',
    slug: 'gentle-purifying-facial-cleansing-gel',
    description:
      'Sulfate-free pH-balanced cleanser that washes away daily buildup and cosmetics without stripping the skin of moisture. Leaves skin refreshed, soft, and balanced.',
    price: 16.0,
    currency: 'USD',
    categoryId: 'cat-personalcare',
    sku: 'NVL-PER-011',
    stockQuantity: 40,
    isAvailable: true,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    images: ['/images/products/gentle_cleanser.jpg'],
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'prod-hydrating-mist',
    name: 'Daily Moisture Rosewater Balance Mist',
    slug: 'daily-moisture-rosewater-balance-mist',
    description:
      'Everyday hydration mist with pure damask rose distillate, aloe vera, and glycerin. Perfect for a refreshing pick-me-up throughout the day or to set makeup effortlessly.',
    price: 15.0,
    currency: 'USD',
    categoryId: 'cat-essentials',
    sku: 'NVL-ESS-012',
    stockQuantity: 30,
    isAvailable: true,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: true,
    images: ['/images/products/hydrating_mist.jpg'],
    createdAt: '2026-01-08T09:00:00Z',
    updatedAt: '2026-01-08T09:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderReference: 'NVL-2026-7841',
    customerName: 'Fatima Kamara',
    customerPhone: '+231 88 542 1920',
    customerEmail: 'fatima.k@example.com',
    deliveryLocation: 'Sinkor, 12th Street',
    deliveryAddress: 'Beachside Villa Apt 4B, Sinkor, Monrovia',
    deliveryMethod: 'Delivery',
    deliveryFee: 3.0,
    subtotal: 99.0,
    totalAmount: 102.0,
    currency: '$',
    orderStatus: 'Confirmed',
    paymentStatus: 'Pending Verification',
    customerNotes: 'Please call when arriving at the gate.',
    items: [
      {
        id: 'item-1',
        orderId: 'ord-1001',
        productId: 'prod-avalon-eclat',
        productName: 'Avalon Éclat Eau de Parfum',
        selectedVariant: '50ml EDP',
        quantity: 1,
        unitPrice: 65.0,
        subtotal: 65.0,
        imageUrl: '/images/products/avalon_eclat.jpg'
      },
      {
        id: 'item-2',
        orderId: 'ord-1001',
        productId: 'prod-flora-serum',
        productName: 'Flora Botanical Hydrating Serum',
        selectedVariant: '30ml Dropper',
        quantity: 1,
        unitPrice: 34.0,
        subtotal: 34.0,
        imageUrl: '/images/products/flora_serum.jpg'
      }
    ],
    createdAt: '2026-03-02T14:20:00Z',
    updatedAt: '2026-03-02T15:10:00Z'
  },
  {
    id: 'ord-1002',
    orderReference: 'NVL-2026-9214',
    customerName: 'Marcus Dennis',
    customerPhone: '+231 77 623 8812',
    deliveryLocation: 'ELWA Roundabout / GSA Road',
    deliveryAddress: 'Direct Store Pickup at NOVALUXE counter',
    deliveryMethod: 'Pickup',
    deliveryFee: 0.0,
    subtotal: 50.0,
    totalAmount: 50.0,
    currency: '$',
    orderStatus: 'Ready for Pickup',
    paymentStatus: 'Paid',
    customerNotes: 'Will pickup in the afternoon around 3 PM.',
    items: [
      {
        id: 'item-3',
        orderId: 'ord-1002',
        productId: 'prod-flora-cream',
        productName: 'Flora Jasmine & Ceramide Daily Cream',
        quantity: 1,
        unitPrice: 28.0,
        subtotal: 28.0,
        imageUrl: '/images/products/flora_cream.jpg'
      },
      {
        id: 'item-4',
        orderId: 'ord-1002',
        productId: 'prod-plant-petal-butter',
        productName: 'Plant & Petal Ultra-Rich Shea Body Butter',
        quantity: 1,
        unitPrice: 22.0,
        subtotal: 22.0,
        imageUrl: '/images/products/plant_petal_butter.jpg'
      }
    ],
    createdAt: '2026-03-03T09:45:00Z',
    updatedAt: '2026-03-03T11:00:00Z'
  }
];

export const INITIAL_ENQUIRIES: Enquiry[] = [
  {
    id: 'enq-1',
    fullName: 'Clarice Cooper',
    phone: '+231 88 123 4567',
    email: 'ccooper@example.com',
    subject: 'Bulk cosmetics order enquiry',
    message: 'Hello NOVALUXE team, do you offer bridal makeup packages or wholesale rates for event gift bags?',
    status: 'New',
    createdAt: '2026-03-01T16:15:00Z'
  }
];

// Local Repository Manager
const STORAGE_KEYS = {
  PRODUCTS: 'novaluxe_products_v1',
  CATEGORIES: 'novaluxe_categories_v1',
  ORDERS: 'novaluxe_orders_v1',
  ENQUIRIES: 'novaluxe_enquiries_v1',
  SETTINGS: 'novaluxe_settings_v1',
  BULK_HISTORY: 'novaluxe_bulk_upload_history_v1'
};

class StoreRepository {
  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // Settings
  getSettings(): SiteSettings {
    const raw = this.get<SiteSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    return {
      ...INITIAL_SETTINGS,
      ...raw,
      heroImage: normalizeImageUrl(raw.heroImage, '/images/hero/hero_beauty_cosmetics.jpg'),
      promoCampaign: {
        ...INITIAL_PROMO_CAMPAIGN,
        ...(raw.promoCampaign || {})
      }
    };
  }

  updateSettings(settings: Partial<SiteSettings>): SiteSettings {
    const current = this.getSettings();
    const updated: SiteSettings = {
      ...current,
      ...settings,
      promoCampaign: settings.promoCampaign
        ? { ...current.promoCampaign, ...settings.promoCampaign }
        : current.promoCampaign
    };
    this.set(STORAGE_KEYS.SETTINGS, updated);

    if (supabase) {
      Promise.resolve(
        supabase
          .from('site_settings')
          .upsert(
            {
              setting_key: 'general_config',
              setting_value: updated
            },
            { onConflict: 'setting_key' }
          )
      )
        .then(({ error }: any) => {
          if (error) console.info('Supabase settings sync note:', error.message);
        })
        .catch(() => {});
    }

    return updated;
  }

  // Categories
  getCategories(): Category[] {
    const raw = this.get<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    return raw.map(c => ({
      ...c,
      imageUrl: normalizeImageUrl(c.imageUrl, '/images/categories/skincare.jpg')
    }));
  }

  saveCategory(cat: Category): Category {
    const list = this.getCategories();
    const index = list.findIndex(c => c.id === cat.id);
    if (index >= 0) {
      list[index] = cat;
    } else {
      list.push(cat);
    }
    this.set(STORAGE_KEYS.CATEGORIES, list);

    // Sync to Supabase categories table if supabase is configured
    if (supabase) {
      Promise.resolve(
        supabase
          .from('categories')
          .upsert(
            {
              name: cat.name,
              slug: cat.slug,
              description: cat.description,
              image_url: cat.imageUrl,
              is_active: cat.isActive,
              display_order: cat.displayOrder
            },
            { onConflict: 'slug' }
          )
      )
        .then(({ error }: any) => {
          if (error) console.info('Supabase category sync note:', error.message);
        })
        .catch(() => {});
    }

    return cat;
  }

  deleteCategory(id: string): void {
    const list = this.getCategories().filter(c => c.id !== id);
    this.set(STORAGE_KEYS.CATEGORIES, list);
  }

  // Products
  getProducts(): Product[] {
    const raw = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return raw.map(p => ({
      ...p,
      images: p.images && p.images.length > 0
        ? p.images.map(img => normalizeImageUrl(img, '/images/products/avalon_eclat.jpg'))
        : ['/images/products/avalon_eclat.jpg']
    }));
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id || p.slug === id);
  }

  saveProduct(prod: Product): Product {
    const list = this.getProducts();
    const index = list.findIndex(p => p.id === prod.id);
    const now = new Date().toISOString();
    const toSave: Product = {
      ...prod,
      slug:
        prod.slug ||
        `${prod.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`,
      updatedAt: now,
      createdAt: prod.createdAt || now
    };
    if (index >= 0) {
      list[index] = toSave;
    } else {
      list.unshift(toSave);
    }
    this.set(STORAGE_KEYS.PRODUCTS, list);

    // Sync to Supabase products & product_images tables if configured
    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toSave.categoryId);
      const basePayload: Record<string, any> = {
        name: toSave.name,
        slug: toSave.slug,
        description: toSave.description,
        price: toSave.price,
        currency: toSave.currency || 'USD',
        sku: toSave.sku,
        stock_quantity: toSave.stockQuantity,
        is_available: toSave.isAvailable,
        is_featured: toSave.isFeatured,
        is_new_arrival: toSave.isNewArrival,
        is_best_seller: toSave.isBestSeller
      };
      if (isUuid) {
        basePayload.category_id = toSave.categoryId;
      }

      const extendedPayload: Record<string, any> = {
        ...basePayload,
        brand: toSave.brand || null,
        product_type: toSave.productType || null,
        size_or_volume: toSave.sizeOrVolume || null,
        specifications: toSave.specifications || null,
        key_ingredients: toSave.keyIngredients || [],
        features: toSave.features || [],
        tags: toSave.tags || []
      };

      const sb = supabase;
      Promise.resolve(
        sb
          .from('products')
          .upsert(extendedPayload, { onConflict: 'slug' })
          .select('id')
          .single()
      )
        .then(async ({ data, error }: any) => {
          let productRow = data;
          if (error && (error.message?.includes('column') || error.message?.includes('schema cache'))) {
            const retry = await sb
              .from('products')
              .upsert(basePayload, { onConflict: 'slug' })
              .select('id')
              .single();
            productRow = retry.data;
            if (retry.error) {
              console.info('Supabase product sync note:', retry.error.message);
              return;
            }
          } else if (error) {
            console.info('Supabase product sync note:', error.message);
            return;
          }
          if (productRow?.id && toSave.images?.length > 0) {
            await sb.from('product_images').delete().eq('product_id', productRow.id);
            await sb.from('product_images').insert(
              toSave.images.map((imgUrl, idx) => ({
                product_id: productRow.id,
                image_url: imgUrl,
                alt_text: toSave.name,
                display_order: idx
              }))
            );
          }
        })
        .catch(() => {});
    }

    return toSave;
  }

  deleteProduct(id: string): void {
    const list = this.getProducts().filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, list);
  }

  // Bulk Upload History
  getBulkUploadHistory(): BulkUploadHistoryEntry[] {
    return this.get<BulkUploadHistoryEntry[]>(STORAGE_KEYS.BULK_HISTORY, []);
  }

  addBulkUploadHistory(entry: BulkUploadHistoryEntry): BulkUploadHistoryEntry[] {
    const list = this.getBulkUploadHistory();
    const updated = [entry, ...list].slice(0, 50);
    this.set(STORAGE_KEYS.BULK_HISTORY, updated);

    if (supabase) {
      Promise.resolve(
        supabase.from('bulk_upload_history').insert({
          uploaded_count: entry.uploadedCount,
          processed_count: entry.processedCount,
          awaiting_review_count: entry.awaitingReviewCount,
          saved_count: entry.savedCount,
          failed_count: entry.failedCount,
          notes: entry.notes || null
        })
      ).catch(() => {});
    }

    return updated;
  }

  updateBulkUploadHistoryEntry(id: string, patch: Partial<BulkUploadHistoryEntry>): BulkUploadHistoryEntry[] {
    const list = this.getBulkUploadHistory();
    const next = list.map(item => (item.id === id ? { ...item, ...patch } : item));
    this.set(STORAGE_KEYS.BULK_HISTORY, next);
    return next;
  }

  async fetchBulkUploadHistoryFromSupabase(): Promise<BulkUploadHistoryEntry[]> {
    const localList = this.getBulkUploadHistory();
    if (!supabase) return localList;
    try {
      const { data, error } = await supabase
        .from('bulk_upload_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: BulkUploadHistoryEntry[] = data.map((row: any) => ({
          id: row.id,
          createdAt: row.created_at,
          uploadedCount: Number(row.uploaded_count || 0),
          processedCount: Number(row.processed_count || 0),
          awaitingReviewCount: Number(row.awaiting_review_count || 0),
          savedCount: Number(row.saved_count || 0),
          failedCount: Number(row.failed_count || 0),
          notes: row.notes || undefined
        }));
        this.set(STORAGE_KEYS.BULK_HISTORY, mapped);
        return mapped;
      }
    } catch {
      // Fall back to local history when offline or unauthenticated in Supabase Auth
    }
    return localList;
  }

  // Catalog Hydration from Supabase (public read)
  async syncCatalogFromSupabase(): Promise<{ categories?: Category[]; products?: Product[] }> {
    if (!supabase) return {};
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('products')
          .select('*, product_images(*), product_variants(*)')
          .order('created_at', { ascending: false })
      ]);

      const result: { categories?: Category[]; products?: Product[] } = {};

      if (!catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0) {
        const mappedCats: Category[] = catRes.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description || '',
          imageUrl: normalizeImageUrl(row.image_url, '/images/categories/skincare.jpg'),
          isActive: Boolean(row.is_active ?? true),
          displayOrder: Number(row.display_order || 0),
          createdAt: row.created_at || new Date().toISOString()
        }));
        this.set(STORAGE_KEYS.CATEGORIES, mappedCats);
        result.categories = mappedCats;
      }

      if (!prodRes.error && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
        const mappedProds: Product[] = prodRes.data.map((row: any) => {
          const imgs = Array.isArray(row.product_images)
            ? [...row.product_images]
                .sort((a: any, b: any) => Number(a.display_order || 0) - Number(b.display_order || 0))
                .map((img: any) => normalizeImageUrl(img.image_url, '/images/products/avalon_eclat.jpg'))
            : [];

          const variants = Array.isArray(row.product_variants)
            ? row.product_variants.map((v: any) => ({
                id: v.id,
                productId: v.product_id || row.id,
                variantName: v.variant_name,
                variantValue: v.variant_value,
                priceAdjustment: Number(v.price_adjustment || 0),
                stockQuantity: Number(v.stock_quantity || 0)
              }))
            : undefined;

          return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description || '',
            price: Number(row.price || 0),
            currency: row.currency || 'USD',
            categoryId: row.category_id || '',
            sku: row.sku || '',
            stockQuantity: Number(row.stock_quantity || 0),
            isAvailable: Boolean(row.is_available ?? true),
            isFeatured: Boolean(row.is_featured ?? false),
            isNewArrival: Boolean(row.is_new_arrival ?? false),
            isBestSeller: Boolean(row.is_best_seller ?? false),
            images: imgs.length > 0 ? imgs : ['/images/products/avalon_eclat.jpg'],
            variants: variants && variants.length > 0 ? variants : undefined,
            brand: row.brand || undefined,
            productType: row.product_type || undefined,
            sizeOrVolume: row.size_or_volume || undefined,
            specifications: row.specifications || undefined,
            keyIngredients: Array.isArray(row.key_ingredients) ? row.key_ingredients : undefined,
            features: Array.isArray(row.features) ? row.features : undefined,
            tags: Array.isArray(row.tags) ? row.tags : undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || row.created_at || new Date().toISOString()
          };
        });
        this.set(STORAGE_KEYS.PRODUCTS, mappedProds);
        result.products = mappedProds;
      }

      return result;
    } catch {
      return {};
    }
  }

  // Orders
  getOrders(): Order[] {
    const raw = this.get<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return raw.map(o => ({
      ...o,
      items: o.items.map(item => ({
        ...item,
        imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl, '/images/products/avalon_eclat.jpg') : undefined
      }))
    }));
  }

  getOrder(refOrId: string): Order | undefined {
    return this.getOrders().find(o => o.id === refOrId || o.orderReference === refOrId);
  }

  recordConfirmedOrderLocally(confirmedOrder: Order): Order {
    const orders = this.getOrders();
    const existingIdx = orders.findIndex(o => o.orderReference === confirmedOrder.orderReference);
    if (existingIdx >= 0) {
      orders[existingIdx] = confirmedOrder;
    } else {
      orders.unshift(confirmedOrder);
    }
    this.set(STORAGE_KEYS.ORDERS, orders);

    const products = this.getProducts();
    for (const item of confirmedOrder.items) {
      const pIdx = products.findIndex(p => p.id === item.productId || p.name === item.productName);
      if (pIdx >= 0) {
        products[pIdx].stockQuantity = Math.max(0, products[pIdx].stockQuantity - item.quantity);
      }
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);

    return confirmedOrder;
  }

  async submitCheckoutOrder(payload: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryLocation: string;
    deliveryAddress: string;
    deliveryMethod: 'Delivery' | 'Pickup';
    customerNotes?: string;
    clientRequestId: string;
    items: Array<{
      productId: string;
      slug: string;
      variantId?: string;
      variantName?: string;
      variantValue?: string;
      quantity: number;
      imageUrl?: string;
    }>;
  }): Promise<Order> {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        deliveryLocation: payload.deliveryLocation,
        deliveryAddress: payload.deliveryAddress,
        deliveryMethod: payload.deliveryMethod,
        customerNotes: payload.customerNotes,
        clientRequestId: payload.clientRequestId,
        items: payload.items.map(i => ({
          productId: i.productId,
          slug: i.slug,
          variantId: i.variantId,
          variantName: i.variantName,
          variantValue: i.variantValue,
          quantity: i.quantity
        }))
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.order) {
      throw new Error(data?.error || 'Unable to process your order. Please review your bag and try again.');
    }

    const imageByProductId = new Map<string, string>();
    for (const reqItem of payload.items) {
      if (reqItem.productId && reqItem.imageUrl) {
        imageByProductId.set(reqItem.productId, reqItem.imageUrl);
      }
    }

    const confirmedOrder: Order = {
      id: data.order.id,
      orderReference: data.order.orderReference,
      customerId: data.order.customerId,
      customerName: data.order.customerName,
      customerPhone: data.order.customerPhone,
      customerEmail: data.order.customerEmail || undefined,
      deliveryLocation: data.order.deliveryLocation,
      deliveryAddress: data.order.deliveryAddress,
      deliveryMethod: data.order.deliveryMethod,
      deliveryFee: Number(data.order.deliveryFee || 0),
      subtotal: Number(data.order.subtotal || 0),
      totalAmount: Number(data.order.totalAmount || 0),
      currency: data.order.currency || '$',
      orderStatus: data.order.orderStatus || 'Confirmed',
      paymentStatus: data.order.paymentStatus || 'Pending Verification',
      customerNotes: data.order.customerNotes || undefined,
      items: Array.isArray(data.order.items)
        ? data.order.items.map((item: any) => ({
            id: item.id,
            orderId: item.orderId || data.order.id,
            productId: item.productId || '',
            productName: item.productName,
            selectedVariant: item.selectedVariant || undefined,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            subtotal: Number(item.subtotal || 0),
            imageUrl: imageByProductId.get(item.productId) || undefined
          }))
        : [],
      createdAt: data.order.createdAt || new Date().toISOString(),
      updatedAt: data.order.updatedAt || new Date().toISOString()
    };

    return this.recordConfirmedOrderLocally(confirmedOrder);
  }

  async lookupOrderByReference(orderReference: string, customerPhone: string): Promise<Order | null> {
    const cleanRef = orderReference.trim().toUpperCase();
    const cleanDigits = customerPhone.replace(/\D/g, '');
    if (cleanRef.length < 6 || cleanDigits.length < 7) return null;

    const res = await fetch('/api/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderReference: cleanRef,
        customerPhone: customerPhone.trim()
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      throw new Error(data?.error || 'Too many lookup attempts. Please wait and try again later.');
    }

    if (res.status >= 500) {
      throw new Error(
        data?.error || 'Order tracking service is temporarily unavailable. Please try again shortly.'
      );
    }

    if (res.ok && data?.success && data?.order) {
      return {
        id: data.order.orderReference,
        orderReference: data.order.orderReference,
        customerName: 'Verified Customer',
        customerPhone: 'Protected',
        deliveryLocation: data.order.deliveryLocation,
        deliveryAddress: 'Protected until courier dispatch',
        deliveryMethod: data.order.deliveryMethod,
        deliveryFee: Number(data.order.deliveryFee || 0),
        subtotal: Number(data.order.subtotal || 0),
        totalAmount: Number(data.order.totalAmount || 0),
        currency: data.order.currency || '$',
        orderStatus: data.order.orderStatus,
        paymentStatus: data.order.paymentStatus,
        items: Array.isArray(data.order.items)
          ? data.order.items.map((item: any, idx: number) => ({
              id: `track-item-${idx}`,
              orderId: data.order.orderReference,
              productId: '',
              productName: item.productName,
              selectedVariant: item.selectedVariant || undefined,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0),
              subtotal: Number(item.subtotal || 0)
            }))
          : [],
        createdAt: data.order.createdAt,
        updatedAt: data.order.updatedAt
      };
    }

    return null;
  }

  async syncAdminOrdersFromSupabase(): Promise<Order[]> {
    const localOrders = this.getOrders();
    if (!supabase) return localOrders;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: Order[] = data.map((row: any) => ({
          id: row.id,
          orderReference: row.order_reference,
          customerId: row.customer_id || undefined,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerEmail: row.customer_email || undefined,
          deliveryLocation: row.delivery_location,
          deliveryAddress: row.delivery_address,
          deliveryMethod: row.delivery_method,
          deliveryFee: Number(row.delivery_fee || 0),
          subtotal: Number(row.subtotal || 0),
          totalAmount: Number(row.total_amount || 0),
          currency: row.currency || '$',
          orderStatus: row.order_status,
          paymentStatus: row.payment_status,
          customerNotes: row.customer_notes || undefined,
          items: Array.isArray(row.order_items)
            ? row.order_items.map((item: any) => ({
                id: item.id,
                orderId: item.order_id || row.id,
                productId: item.product_id || '',
                productName: item.product_name,
                selectedVariant: item.selected_variant || undefined,
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.unit_price || 0),
                subtotal: Number(item.subtotal || 0)
              }))
            : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at || row.created_at
        }));
        this.set(STORAGE_KEYS.ORDERS, mapped);
        return mapped;
      }
    } catch {
      // Keep local orders if admin Supabase Auth session is unavailable
    }
    return localOrders;
  }

  updateOrderStatus(orderId: string, status: Order['orderStatus'], paymentStatus?: Order['paymentStatus']): Order | undefined {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId || o.orderReference === orderId);
    if (index >= 0) {
      orders[index].orderStatus = status;
      if (paymentStatus) {
        orders[index].paymentStatus = paymentStatus;
      }
      orders[index].updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.ORDERS, orders);

      // Sync status change to Supabase (requires authenticated NOVALUXE admin session)
      if (supabase) {
        const updatePayload: Record<string, any> = { order_status: status };
        if (paymentStatus) {
          updatePayload.payment_status = paymentStatus;
        }
        Promise.resolve(
          supabase
            .from('orders')
            .update(updatePayload)
            .eq('order_reference', orders[index].orderReference)
        )
          .then(() => {})
          .catch(() => {});
      }

      return orders[index];
    }
    return undefined;
  }

  // Enquiries
  getEnquiries(): Enquiry[] {
    return this.get<Enquiry[]>(STORAGE_KEYS.ENQUIRIES, INITIAL_ENQUIRIES);
  }

  async syncAdminEnquiriesFromSupabase(): Promise<Enquiry[]> {
    const localEnquiries = this.getEnquiries();
    if (!supabase) return localEnquiries;
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: Enquiry[] = data.map((row: any) => ({
          id: row.id,
          fullName: row.full_name,
          phone: row.phone,
          email: row.email || undefined,
          subject: row.subject,
          message: row.message,
          status: row.status || 'New',
          createdAt: row.created_at
        }));
        this.set(STORAGE_KEYS.ENQUIRIES, mapped);
        return mapped;
      }
    } catch {
      // Keep local enquiries when offline
    }
    return localEnquiries;
  }

  createEnquiry(enquiry: Omit<Enquiry, 'id' | 'createdAt' | 'status'>): Enquiry {
    const list = this.getEnquiries();
    const newEnquiry: Enquiry = {
      ...enquiry,
      id: `enq-${Date.now()}`,
      status: 'New',
      createdAt: new Date().toISOString()
    };
    list.unshift(newEnquiry);
    this.set(STORAGE_KEYS.ENQUIRIES, list);

    // Sync to Supabase enquiries table
    if (supabase) {
      Promise.resolve(
        supabase
          .from('enquiries')
          .insert({
            full_name: newEnquiry.fullName,
            phone: newEnquiry.phone,
            email: newEnquiry.email || null,
            subject: newEnquiry.subject,
            message: newEnquiry.message,
            status: newEnquiry.status
          })
      )
        .then(({ error }: any) => {
          if (error) console.info('Supabase enquiry sync note:', error.message);
        })
        .catch(() => {});
    }

    return newEnquiry;
  }

  updateEnquiryStatus(id: string, status: Enquiry['status']): void {
    const list = this.getEnquiries();
    const index = list.findIndex(e => e.id === id);
    if (index >= 0) {
      list[index].status = status;
      this.set(STORAGE_KEYS.ENQUIRIES, list);
      if (supabase) {
        Promise.resolve(
          supabase.from('enquiries').update({ status }).eq('id', id)
        ).catch(() => {});
      }
    }
  }

  // Reset to initial seed
  resetDefaults(): void {
    this.set(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    this.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.set(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    this.set(STORAGE_KEYS.ENQUIRIES, INITIAL_ENQUIRIES);
  }
}

export const store = new StoreRepository();
