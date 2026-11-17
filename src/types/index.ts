export type ProductVariant = {
  id: string;
  productId: string;
  variantName: string; // e.g., 'Size', 'Shade', 'Fragrance'
  variantValue: string; // e.g., '50ml', 'Velvet Plum', 'Vanilla Amber'
  priceAdjustment: number;
  stockQuantity: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  categoryId: string;
  sku: string;
  stockQuantity: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  images: string[];
  variants?: ProductVariant[];
  brand?: string;
  productType?: string;
  sizeOrVolume?: string;
  specifications?: string;
  keyIngredients?: string[];
  features?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
};

export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  selectedVariant?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
};

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Ready for Pickup'
  | 'Out for Delivery'
  | 'Completed'
  | 'Cancelled';

export type PaymentStatus = 'Unpaid' | 'Pending Verification' | 'Paid';

export type Order = {
  id: string;
  orderReference: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryLocation: string; // Area in Monrovia
  deliveryAddress: string;
  deliveryMethod: 'Delivery' | 'Pickup';
  deliveryFee: number;
  subtotal: number;
  totalAmount: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  customerNotes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type Enquiry = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  status: 'New' | 'Replied' | 'Archived';
  createdAt: string;
};

export type PromoFrequency = 'once_per_session' | 'once_per_day' | 'always';

export type PromoDisplayMode = 'image' | 'video' | 'disabled';
export type PromoDesktopBehavior = 'autoplay_muted' | 'click_to_play' | 'hide';
export type PromoMobileBehavior = 'autoplay_muted' | 'click_to_play' | 'poster_fallback' | 'hide';

export type PromoCampaignConfig = {
  enabled: boolean;
  displayMode?: PromoDisplayMode;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl: string;
  desktopBehavior?: PromoDesktopBehavior;
  mobileBehavior?: PromoMobileBehavior;
  title: string;
  subtitle: string;
  ctaText: string;
  destinationPath: string;
  frequency: PromoFrequency;
  startDate: string;
  endDate: string;
};

export type BulkUploadHistoryEntry = {
  id: string;
  createdAt: string;
  uploadedCount: number;
  processedCount: number;
  awaitingReviewCount: number;
  savedCount: number;
  failedCount: number;
  notes?: string;
};

export type SiteSettings = {
  businessName: string;
  businessCategory: string;
  location: string;
  email: string;
  whatsapp: string;
  whatsappRaw: string;
  phoneNumbers: string[];
  currency: string;
  deliveryFee: number;
  pickupEnabled: boolean;
  announcementText: string;
  announcementEnabled: boolean;
  heroHeadline: string;
  heroSubtitle: string;
  heroImage: string;
  instagramUrl: string;
  tiktokUrl: string;
  brandIntro: string;
  aboutStory: string;
  mission: string;
  vision: string;
  promoCampaign: PromoCampaignConfig;
};

export type CartItem = {
  product: Product;
  selectedVariant: ProductVariant | null;
  quantity: number;
};
