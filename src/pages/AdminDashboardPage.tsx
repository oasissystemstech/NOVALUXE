import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  MessageSquare,
  Globe,
  Settings,
  Database,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Search,
  RefreshCw,
  Copy,
  AlertCircle,
  Sparkles,
  Film,
  Eye,
  Monitor,
  Smartphone,
  Ban,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { store } from '../lib/store';
import {
  Product,
  Category,
  Order,
  OrderStatus,
  PaymentStatus,
  Enquiry,
  PromoFrequency,
  PromoDisplayMode,
  PromoDesktopBehavior,
  PromoMobileBehavior
} from '../types';
import { NovaluxeLogo } from '../components/NovaluxeLogo';
import { testSupabaseConnection, supabaseUrl } from '../lib/supabase';
import { ProductImageUploader } from '../components/ProductImageUploader';
import { CategoryImageUploader } from '../components/CategoryImageUploader';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AIBulkProductUploader } from '../components/AIBulkProductUploader';
import { PromotionalMediaUploader } from '../components/PromotionalMediaUploader';
import { PromotionalFlyerModal } from '../components/PromotionalFlyerModal';
import { DEFAULT_HERO_IMAGE, handleImageError } from '../lib/imageUtils';
import {
  inferVideoMimeType,
  isDeadDefaultPromoVideo,
  normalizePromoCampaign
} from '../lib/promoUtils';

interface AdminDashboardPageProps {
  onBackToStore: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onBackToStore }) => {
  const { isAdmin, adminUser, logout, persistenceStatus, recheckPersistenceStatus } = useAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';
  const {
    settings,
    updateSettings,
    categories,
    refreshCategories,
    products,
    refreshProducts,
    refreshAllFromSupabase,
    resetAll
  } = useSettings();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'products'
    | 'ai-bulk'
    | 'categories'
    | 'orders'
    | 'customers'
    | 'enquiries'
    | 'content'
    | 'promotions'
    | 'settings'
    | 'supabase'
  >('overview');

  const [orders, setOrders] = useState<Order[]>(() => store.getOrders());
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => store.getEnquiries());

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // Category modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);

  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Order filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Supabase copy feedback
  const [sqlCopied, setSqlCopied] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Promo live preview modal & viewport toggle
  const [isPromoPreviewOpen, setIsPromoPreviewOpen] = useState(false);
  const [promoPreviewViewport, setPromoPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [isUploadingPromoMedia, setIsUploadingPromoMedia] = useState(false);

  // Explicit persistence state & error banners
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productSaveError, setProductSaveError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categorySaveError, setCategorySaveError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    const result = await testSupabaseConnection();
    setConnectionResult(result);
    await recheckPersistenceStatus().catch(() => {});
    setTestingConnection(false);
  };

  // Settings form states
  const [settingsForm, setSettingsForm] = useState(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const refreshAllData = () => {
    refreshProducts();
    refreshCategories();
    setOrders(store.getOrders());
    setEnquiries(store.getEnquiries());
    refreshAllFromSupabase().catch(() => {});
    if (isAdmin) {
      store.syncAdminOrdersFromSupabase().then(setOrders).catch(() => {});
      store.syncAdminEnquiriesFromSupabase().then(setEnquiries).catch(() => {});
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    store.syncAdminOrdersFromSupabase().then(synced => {
      if (active) setOrders(synced);
    }).catch(() => {});
    store.syncAdminEnquiriesFromSupabase().then(synced => {
      if (active) setEnquiries(synced);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdmin]);

  // KPIs
  const totalProducts = products.length;
  const inStockProducts = products.filter(p => p.isAvailable && p.stockQuantity > 0).length;
  const outOfStockProducts = products.filter(p => !p.isAvailable || p.stockQuantity <= 0).length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Confirmed').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Order status updater
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
    setAdminActionError(null);
    try {
      await store.updateOrderStatusAsync(orderId, status, paymentStatus);
      const updated = store.getOrders();
      setOrders(updated);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated.find(o => o.id === orderId) || null);
      }
    } catch (err: any) {
      setAdminActionError(err?.message || 'Unable to update order status in Supabase.');
    }
  };

  // Save product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setProductSaveError(null);
    setIsSavingProduct(true);
    try {
      await store.saveProductAsync(editingProduct);
      await refreshAllFromSupabase().catch(() => {});
      refreshProducts();
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      setProductSaveError(err?.message || 'Unable to save product to Supabase. Check admin storage/DB authorization.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setAdminActionError(null);
    try {
      await store.deleteProductAsync(id);
      await refreshAllFromSupabase().catch(() => {});
      refreshProducts();
    } catch (err: any) {
      setAdminActionError(err?.message || 'Unable to delete product from Supabase.');
    }
  };

  // Save category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setCategorySaveError(null);
    setIsSavingCategory(true);
    try {
      await store.saveCategoryAsync(editingCategory);
      await refreshAllFromSupabase().catch(() => {});
      refreshCategories();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      setCategorySaveError(err?.message || 'Unable to save category to Supabase. Check admin storage/DB authorization.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    setAdminActionError(null);
    try {
      await store.deleteCategoryAsync(id);
      await refreshAllFromSupabase().catch(() => {});
      refreshCategories();
    } catch (err: any) {
      setAdminActionError(err?.message || 'Unable to delete category from Supabase.');
    }
  };

  // Save settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(false);
    setSettingsError(null);
    setIsSavingSettings(true);
    try {
      const normalizedPayload = {
        ...settingsForm,
        promoCampaign: normalizePromoCampaign(settingsForm.promoCampaign)
      };
      const saved = await updateSettings(normalizedPayload);
      setSettingsForm(saved);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to publish settings to Supabase.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && o.orderStatus !== orderStatusFilter) {
      return false;
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return (
        o.orderReference.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.deliveryLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Unique customers list from orders
  const customerList = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email?: string; location: string; totalSpent: number; orderCount: number }>();
    for (const o of orders) {
      const key = o.customerPhone.trim();
      if (!map.has(key)) {
        map.set(key, {
          name: o.customerName,
          phone: o.customerPhone,
          email: o.customerEmail,
          location: o.deliveryLocation,
          totalSpent: o.totalAmount,
          orderCount: 1
        });
      } else {
        const existing = map.get(key)!;
        existing.totalSpent += o.totalAmount;
        existing.orderCount += 1;
      }
    }
    return Array.from(map.values());
  }, [orders]);

  const promo = normalizePromoCampaign(settingsForm.promoCampaign);
  const updatePromoPatch = (patch: Partial<typeof promo>) => {
    setSettingsForm(prev => ({
      ...prev,
      promoCampaign: normalizePromoCampaign({
        ...prev.promoCampaign,
        ...patch
      })
    }));
  };
  const updatePromoField = <K extends keyof typeof promo>(key: K, value: (typeof promo)[K]) => {
    updatePromoPatch({ [key]: value });
  };
  const handleSelectDisplayMode = (mode: PromoDisplayMode) => {
    updatePromoPatch({
      displayMode: mode,
      enabled: mode !== 'disabled',
      mediaType: mode === 'image' ? 'image' : 'video'
    });
  };

  const SQL_MIGRATION_TEXT = `-- ==============================================================================
-- NOVALUXE BY SENNEL - HARDENED SUPABASE DATABASE SCHEMA & RLS
-- Idempotent & non-destructive: safe to re-run without overwriting settings.
-- ==============================================================================
create extension if not exists "uuid-ossp";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Core Tables
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  currency text default 'USD' not null,
  category_id uuid references public.categories(id) on delete set null,
  sku text,
  stock_quantity integer default 0 check (stock_quantity >= 0),
  is_available boolean default true,
  is_featured boolean default false,
  is_new_arrival boolean default false,
  is_best_seller boolean default false,
  brand text,
  product_type text,
  size_or_volume text,
  specifications text,
  key_ingredients jsonb default '[]'::jsonb,
  features jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products add column if not exists brand text;
alter table public.products add column if not exists product_type text;
alter table public.products add column if not exists size_or_volume text;
alter table public.products add column if not exists specifications text;
alter table public.products add column if not exists key_ingredients jsonb default '[]'::jsonb;
alter table public.products add column if not exists features jsonb default '[]'::jsonb;
alter table public.products add column if not exists tags jsonb default '[]'::jsonb;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.update_updated_at_column();

create table if not exists public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_name text not null,
  variant_value text not null,
  price_adjustment numeric(10, 2) default 0.00,
  stock_quantity integer default 0 check (stock_quantity >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_reference text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_location text not null,
  delivery_address text not null,
  delivery_method text not null check (delivery_method in ('Delivery', 'Pickup')),
  delivery_fee numeric(10, 2) default 0.00 check (delivery_fee >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  currency text default 'USD' not null,
  order_status text default 'Pending' check (order_status in ('Pending', 'Confirmed', 'Processing', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled')),
  payment_status text default 'Unpaid' check (payment_status in ('Unpaid', 'Pending Verification', 'Paid')),
  customer_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  selected_variant text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0)
);

create table if not exists public.enquiries (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  subject text not null,
  message text not null,
  status text default 'New' check (status in ('New', 'Replied', 'Archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.site_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text unique not null,
  setting_value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.admin_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  role text default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.bulk_upload_history (
  id uuid primary key default uuid_generate_v4(),
  uploaded_count integer not null default 0,
  processed_count integer not null default 0,
  awaiting_review_count integer not null default 0,
  saved_count integer not null default 0,
  failed_count integer not null default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.order_lookup_attempts (
  order_reference text primary key,
  failed_count integer not null default 0,
  window_started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  locked_until timestamp with time zone
);

-- Admin Authorization, Hardened Order Lookup & Atomic Checkout RPCs
create or replace function public.is_novaluxe_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_novaluxe_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.role = 'super_admin'
  );
$$;

-- Deprecated order_is_pending_checkout(uuid) has been removed.
-- Direct anonymous INSERT on customers, orders, and order_items is revoked.
-- Backend RPCs (create_checkout_order, lookup_order_by_reference, admin_login_rate_limit)
-- are executable ONLY by service_role.
-- Run the complete non-destructive hardening script in:
--   supabase/migrations/20261116_security_audit_and_hardening.sql
--   supabase/migrations/20261118_security_and_integrity_hardening.sql
-- Or the complete fresh schema in:
--   supabase/schema.sql
-- (Includes approved media host allowlist, request_fingerprint idempotency, atomic DB rate limits,
--  save_product_with_images, site_settings super_admin RBAC, and storage path-prefix rules.)
-- Remember to register your Supabase Auth Admin User UUID in public.admin_profiles:
--   insert into public.admin_profiles (user_id, role) values ('<AUTH-USER-UUID>', 'super_admin')
--   on conflict (user_id) do update set role = excluded.role;`;

  const navTabs: {
    id: typeof activeTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'ai-bulk', label: 'AI Bulk Upload', icon: Sparkles, count: 'AI' },
    { id: 'categories', label: 'Categories', icon: Layers, count: categories.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: pendingOrders },
    { id: 'customers', label: 'Customers', icon: Users, count: customerList.length },
    { id: 'enquiries', label: 'Enquiries', icon: MessageSquare, count: enquiries.length },
    { id: 'content', label: 'Hero & Content', icon: Globe },
    { id: 'promotions', label: 'Promotional Pop-Up', icon: Film },
    { id: 'settings', label: 'Business Settings', icon: Settings },
    { id: 'supabase', label: 'Supabase SQL', icon: Database }
  ];

  const inputClass =
    'w-full px-4 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] placeholder-[#9B91A1] dark:placeholder-[#6D5D82] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]';

  const modalInputClass =
    'w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-[#211B25] dark:text-[#F3EFEA] placeholder-[#9B91A1] dark:placeholder-[#6D5D82] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]';

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#09070D] text-[#211B25] dark:text-[#F3EFEA] flex flex-col transition-colors duration-200">
      {/* Top Admin Nav */}
      <div className="bg-white/90 dark:bg-[#100B18] border-b border-[#E4DDD0] dark:border-[#281C38] px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div onClick={onBackToStore} className="cursor-pointer">
            <NovaluxeLogo size="sm" variant="transparent" />
          </div>
          <span className="text-xs text-[#8B42C9] dark:text-[#E2D4B7] bg-[#F2EBDD] dark:bg-[#221735] border border-[#E4DDD0] dark:border-transparent px-2.5 py-0.5 rounded-full font-medium hidden sm:inline">
            Admin Console
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggleButton showLabel />
          <button
            onClick={onBackToStore}
            className="text-xs text-[#524858] dark:text-[#A79DB8] hover:text-[#211B25] dark:hover:text-[#F3EFEA] px-3 py-1.5 rounded-lg border border-[#E4DDD0] dark:border-[#34244C] transition-colors cursor-pointer"
          >
            ← View Storefront
          </button>
          <button
            onClick={logout}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Admin Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 bg-[#F2EBDD]/70 dark:bg-[#0D0914] border-b md:border-b-0 md:border-r border-[#E4DDD0] dark:border-[#241933] p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#746B78] dark:text-[#7C6E91] px-3 py-2">
            Navigation
          </div>

          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSettingsSaved(false);
                  setSettingsError(null);
                  setAdminActionError(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#25183B] text-[#8B42C9] dark:text-[#F5D061] font-semibold border border-[#8B42C9]/30 dark:border-[#482E70]/60 shadow-xs dark:shadow-none'
                    : 'text-[#524858] dark:text-[#C5B9D8] hover:bg-white/60 dark:hover:bg-[#181124] hover:text-[#211B25] dark:hover:text-[#FFFFFF]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#8B42C9] dark:text-[#F5D061]' : 'text-[#746B78] dark:text-[#8C829B]'
                    }`}
                  />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#F2EBDD] dark:bg-[#3A265E] text-[#8B42C9] dark:text-[#F5D061]'
                        : 'bg-[#E4DDD0]/70 dark:bg-[#181124] text-[#524858] dark:text-[#8C829B]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-5">
          {persistenceStatus.diagnostic && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold">Remote Supabase Admin Sync Notice</p>
                <p className="text-[11px] leading-relaxed">{persistenceStatus.diagnostic}</p>
              </div>
            </div>
          )}

          {adminActionError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminActionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdminActionError(null)}
                className="text-red-700 dark:text-red-200 hover:opacity-75 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Store Overview</h1>
                <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                  Real-time inventory and customer order activity in Monrovia.
                </p>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#120D1B] border border-[#E4DDD0] dark:border-[#261B36] space-y-1 shadow-xs dark:shadow-none">
                  <span className="text-xs text-[#746B78] dark:text-[#9C8EB2]">Total Products</span>
                  <p className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">{totalProducts}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {inStockProducts} in stock • {outOfStockProducts} out
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#120D1B] border border-[#E4DDD0] dark:border-[#261B36] space-y-1 shadow-xs dark:shadow-none">
                  <span className="text-xs text-[#746B78] dark:text-[#9C8EB2]">Active Orders</span>
                  <p className="text-2xl font-serif font-bold text-[#9E751C] dark:text-[#F5D061]">{pendingOrders}</p>
                  <p className="text-[11px] text-[#8B42C9] dark:text-[#A855F7]">{totalOrders} total recorded</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#120D1B] border border-[#E4DDD0] dark:border-[#261B36] space-y-1 shadow-xs dark:shadow-none">
                  <span className="text-xs text-[#746B78] dark:text-[#9C8EB2]">Total Sales Volume</span>
                  <p className="text-2xl font-serif font-bold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                    {settings.currency}
                    {totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2]">Monrovia retail orders</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#120D1B] border border-[#E4DDD0] dark:border-[#261B36] space-y-1 shadow-xs dark:shadow-none">
                  <span className="text-xs text-[#746B78] dark:text-[#9C8EB2]">Customer Enquiries</span>
                  <p className="text-2xl font-serif font-bold text-[#8B42C9] dark:text-[#A855F7]">{enquiries.length}</p>
                  <p className="text-[11px] text-[#746B78] dark:text-[#9C8EB2]">Received via website</p>
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4 shadow-xs dark:shadow-none">
                <div className="flex items-center justify-between border-b border-[#E4DDD0] dark:border-[#261B36] pb-3">
                  <h2 className="text-base font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Recent Orders</h2>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#9E751C] dark:text-[#F5D061] hover:underline cursor-pointer"
                  >
                    View All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#746B78] dark:text-[#8C829B] border-b border-[#E4DDD0] dark:border-[#241933]">
                        <th className="pb-2">Reference</th>
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Method</th>
                        <th className="pb-2">Total</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4DDD0] dark:divide-[#241933]">
                      {orders.slice(0, 5).map(o => (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="hover:bg-[#FAF8F4] dark:hover:bg-[#1A1227] cursor-pointer"
                        >
                          <td className="py-3 font-mono font-semibold text-[#9E751C] dark:text-[#F5D061]">{o.orderReference}</td>
                          <td className="py-3 text-[#211B25] dark:text-[#F3EFEA]">{o.customerName}</td>
                          <td className="py-3 text-[#524858] dark:text-[#C5B9D8]">{o.deliveryLocation}</td>
                          <td className="py-3 text-[#524858] dark:text-[#C5B9D8]">{o.deliveryMethod}</td>
                          <td className="py-3 font-semibold text-[#211B25] dark:text-[#F3EFEA] tabular-nums">
                            {o.currency}
                            {o.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full bg-[#F2EBDD] dark:bg-[#201533] text-[#9E751C] dark:text-[#F5D061] text-[10px] font-semibold border border-[#E4DDD0] dark:border-[#3A2954]">
                              {o.orderStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Product Management</h1>
                  <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                    Add, edit, change prices, and adjust stock for your Monrovia store catalogue.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveTab('ai-bulk')}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A1227] text-[#8B42C9] dark:text-[#F5D061] border border-[#E4DDD0] dark:border-[#34244C] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>AI Bulk Upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setProductSaveError(null);
                      setEditingProduct({
                        id: '',
                        name: '',
                        slug: '',
                        description: '',
                        price: 25.0,
                        currency: 'USD',
                        categoryId: categories[0]?.id || '',
                        sku: `NVL-${Math.floor(100 + Math.random() * 900)}`,
                        stockQuantity: 20,
                        isAvailable: true,
                        isFeatured: false,
                        isNewArrival: true,
                        isBestSeller: false,
                        images: ['/images/products/avalon_eclat.jpg'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Product</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] overflow-hidden shadow-xs dark:shadow-none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F4] dark:bg-[#171022] text-[#746B78] dark:text-[#8C829B] border-b border-[#E4DDD0] dark:border-[#241933]">
                        <th className="p-4">Product</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Stock</th>
                        <th className="p-4">Flags</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4DDD0] dark:divide-[#241933]">
                      {products.map(p => {
                        const cat = categories.find(c => c.id === p.categoryId);
                        return (
                          <tr key={p.id} className="hover:bg-[#FAF8F4] dark:hover:bg-[#1A1227]">
                            <td className="p-4 flex items-center gap-3">
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                                className="w-10 h-10 rounded-lg object-cover bg-[#F2EBDD] dark:bg-[#221735] shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-[#211B25] dark:text-[#F3EFEA]">{p.name}</p>
                                <p className="text-[11px] text-[#746B78] dark:text-[#8C829B]">
                                  SKU: {p.sku}
                                  {p.brand ? ` • ${p.brand}` : ''}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 text-[#524858] dark:text-[#C5B9D8]">{cat?.name || 'Essentials'}</td>
                            <td className="p-4 font-semibold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                              {settings.currency}
                              {p.price.toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  p.stockQuantity > 5
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : p.stockQuantity > 0
                                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                      : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                }`}
                              >
                                {p.stockQuantity} in stock
                              </span>
                            </td>
                            <td className="p-4 space-x-1">
                              {p.isFeatured && (
                                <span className="text-[10px] bg-purple-100 dark:bg-[#2E1E4B] text-[#8B42C9] dark:text-[#C084FC] px-1.5 py-0.5 rounded">
                                  Featured
                                </span>
                              )}
                              {p.isNewArrival && (
                                <span className="text-[10px] bg-amber-100 dark:bg-[#362716] text-[#9E751C] dark:text-[#F5D061] px-1.5 py-0.5 rounded">
                                  New
                                </span>
                              )}
                              {p.isBestSeller && (
                                <span className="text-[10px] bg-[#F2EBDD] dark:bg-[#221B35] text-[#524858] dark:text-[#E2D4B7] px-1.5 py-0.5 rounded">
                                  Favourite
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setProductSaveError(null);
                                  setEditingProduct({ ...p });
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 text-[#524858] dark:text-[#C5B9D8] hover:text-[#8B42C9] dark:hover:text-[#F5D061] rounded hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-[#746B78] dark:text-[#8C829B] hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI PRODUCT CATALOGUE / BULK UPLOAD */}
          {activeTab === 'ai-bulk' && <AIBulkProductUploader />}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Category Management</h1>
                  <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                    Organize your store collections (Skincare, Makeup, Fragrances, Body Care, etc.).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCategorySaveError(null);
                    setEditingCategory({
                      id: '',
                      name: '',
                      slug: '',
                      description: '',
                      imageUrl: '/images/categories/skincare.jpg',
                      isActive: true,
                      displayOrder: categories.length + 1,
                      createdAt: new Date().toISOString()
                    });
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(c => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] overflow-hidden flex flex-col justify-between shadow-xs dark:shadow-none"
                  >
                    <div className="h-32 bg-[#F2EBDD] dark:bg-[#1A1227] overflow-hidden relative">
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/75 dark:from-[#120D1B] via-transparent to-transparent" />
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">{c.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#F2EBDD] dark:bg-[#201533] text-[#9E751C] dark:text-[#F5D061]">
                          Order: {c.displayOrder}
                        </span>
                      </div>
                      <p className="text-xs text-[#746B78] dark:text-[#9C8EB2] line-clamp-2">{c.description}</p>
                      <div className="pt-3 border-t border-[#E4DDD0] dark:border-[#241933] flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setCategorySaveError(null);
                            setEditingCategory({ ...c });
                            setIsCategoryModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#FAF8F4] dark:bg-[#1F162E] border border-[#E4DDD0] dark:border-transparent text-xs text-[#211B25] dark:text-[#E2D4B7] hover:bg-[#F2EBDD] dark:hover:text-[#FFFFFF] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Order Management</h1>
                  <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                    Track, update status, and manage Monrovia delivery or pickup orders.
                  </p>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#120D1B] p-4 rounded-2xl border border-[#E4DDD0] dark:border-[#261B36]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#746B78] dark:text-[#8C829B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search by order ref, customer name, phone, area..."
                    className="w-full pl-10 pr-4 py-2 bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#F3EFEA] focus:outline-none focus:border-[#8B42C9] dark:focus:border-[#A855F7]"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value)}
                  className="bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] rounded-xl text-xs text-[#211B25] dark:text-[#E2D4B7] px-3 py-2 focus:outline-none"
                >
                  <option value="all">All Statuses ({orders.length})</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Order List Table */}
              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] overflow-hidden shadow-xs dark:shadow-none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F4] dark:bg-[#171022] text-[#746B78] dark:text-[#8C829B] border-b border-[#E4DDD0] dark:border-[#241933]">
                        <th className="p-4">Reference</th>
                        <th className="p-4">Customer & Phone</th>
                        <th className="p-4">Destination</th>
                        <th className="p-4">Items</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4DDD0] dark:divide-[#241933]">
                      {filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-[#FAF8F4] dark:hover:bg-[#1A1227]">
                          <td className="p-4 font-mono font-bold text-[#9E751C] dark:text-[#F5D061]">{o.orderReference}</td>
                          <td className="p-4">
                            <p className="font-semibold text-[#211B25] dark:text-[#F3EFEA]">{o.customerName}</p>
                            <p className="text-[11px] text-[#8B42C9] dark:text-[#A855F7]">{o.customerPhone}</p>
                          </td>
                          <td className="p-4 text-[#524858] dark:text-[#C5B9D8]">
                            <p>{o.deliveryLocation}</p>
                            <p className="text-[10px] text-[#746B78] dark:text-[#8C829B]">{o.deliveryMethod}</p>
                          </td>
                          <td className="p-4 text-[#524858] dark:text-[#C5B9D8]">{o.items.length} items</td>
                          <td className="p-4 font-semibold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                            {o.currency}
                            {o.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-4">
                            <select
                              value={o.orderStatus}
                              onChange={e => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                              className="bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#3A2854] text-[11px] text-[#9E751C] dark:text-[#F5D061] px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Processing">Processing</option>
                              <option value="Ready for Pickup">Ready for Pickup</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="px-3 py-1 rounded-lg bg-[#F2EBDD] dark:bg-[#221637] text-xs text-[#211B25] dark:text-[#E2D4B7] hover:opacity-90 cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Customer Directory</h1>
                <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                  Customer records collected through orders in Monrovia.
                </p>
              </div>

              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] overflow-hidden shadow-xs dark:shadow-none">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F4] dark:bg-[#171022] text-[#746B78] dark:text-[#8C829B] border-b border-[#E4DDD0] dark:border-[#241933]">
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Primary Delivery Area</th>
                      <th className="p-4">Orders Placed</th>
                      <th className="p-4 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DDD0] dark:divide-[#241933]">
                    {customerList.map((c, i) => (
                      <tr key={i} className="hover:bg-[#FAF8F4] dark:hover:bg-[#1A1227]">
                        <td className="p-4 font-semibold text-[#211B25] dark:text-[#F3EFEA]">{c.name}</td>
                        <td className="p-4 text-[#9E751C] dark:text-[#F5D061]">{c.phone}</td>
                        <td className="p-4 text-[#524858] dark:text-[#C5B9D8]">{c.location}</td>
                        <td className="p-4 text-[#524858] dark:text-[#C5B9D8]">{c.orderCount}</td>
                        <td className="p-4 text-right font-serif font-bold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                          {settings.currency}
                          {c.totalSpent.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ENQUIRIES */}
          {activeTab === 'enquiries' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">Customer Enquiries</h1>
                <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">Messages sent via the website contact form.</p>
              </div>

              <div className="space-y-4">
                {enquiries.length === 0 ? (
                  <p className="text-xs text-[#746B78] dark:text-[#8C829B]">No customer enquiries received yet.</p>
                ) : (
                  enquiries.map(enq => (
                    <div
                      key={enq.id}
                      className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-3 shadow-xs dark:shadow-none"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4DDD0] dark:border-[#241933] pb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[#211B25] dark:text-[#F3EFEA]">{enq.subject}</h3>
                          <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                            From: {enq.fullName} ({enq.phone}) {enq.email ? `• ${enq.email}` : ''}
                          </p>
                        </div>
                        <span className="text-[11px] text-[#8B42C9] dark:text-[#A855F7]">
                          {new Date(enq.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#524858] dark:text-[#C5B9D8] leading-relaxed">{enq.message}</p>
                      <div className="pt-2 flex gap-3">
                        <a
                          href={`https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-lg bg-[#25D366]/15 dark:bg-[#25D366]/20 text-emerald-700 dark:text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/25 inline-flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reply via WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: HERO & HOMEPAGE CONTENT */}
          {activeTab === 'content' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
                  Homepage & Brand Content
                </h1>
                <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                  Edit announcement bar, hero banner image & copy, and social media handles.
                </p>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4 shadow-xs dark:shadow-none"
              >
                {settingsSaved && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Content published to Supabase and live across all browsers!</span>
                  </div>
                )}

                {settingsError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{settingsError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Announcement Bar Text</label>
                  <input
                    type="text"
                    value={settingsForm.announcementText}
                    onChange={e => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="announcementToggle"
                    checked={settingsForm.announcementEnabled}
                    onChange={e => setSettingsForm({ ...settingsForm, announcementEnabled: e.target.checked })}
                    className="rounded bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#8B42C9] dark:text-[#A855F7]"
                  />
                  <label htmlFor="announcementToggle" className="text-xs text-[#524858] dark:text-[#C5B9D8]">
                    Show Announcement Bar
                  </label>
                </div>

                {/* Hero Banner Image Uploader */}
                <div className="space-y-2.5 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                    Homepage Hero Background Image
                  </label>
                  {settingsForm.heroImage && (
                    <div className="rounded-xl overflow-hidden border border-[#E4DDD0] dark:border-[#34244C] h-36 bg-[#FAF8F4] dark:bg-[#1A1227]">
                      <img
                        src={settingsForm.heroImage}
                        alt="Homepage Hero Preview"
                        onError={e => handleImageError(e, DEFAULT_HERO_IMAGE)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <PromotionalMediaUploader
                    mediaType="image"
                    folder="hero"
                    mediaUrl={settingsForm.heroImage || ''}
                    buttonLabel="Upload Hero Image"
                    placeholder="/images/hero/hero_beauty_cosmetics.jpg or https://..."
                    helperText="Uploaded to Supabase Storage (promotional-assets/hero) so it updates across all browsers."
                    onMediaChange={url => setSettingsForm({ ...settingsForm, heroImage: url })}
                    onUploadStateChange={setIsUploadingHeroImage}
                  />
                </div>

                <div className="space-y-1.5 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Hero Headline</label>
                  <input
                    type="text"
                    value={settingsForm.heroHeadline}
                    onChange={e => setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Hero Supporting Text</label>
                  <textarea
                    rows={2}
                    value={settingsForm.heroSubtitle}
                    onChange={e => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Brand Introduction Copy</label>
                  <textarea
                    rows={3}
                    value={settingsForm.brandIntro}
                    onChange={e => setSettingsForm({ ...settingsForm, brandIntro: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Instagram Profile URL</label>
                  <input
                    type="text"
                    value={settingsForm.instagramUrl}
                    onChange={e => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">TikTok Profile URL</label>
                  <input
                    type="text"
                    value={settingsForm.tiktokUrl}
                    onChange={e => setSettingsForm({ ...settingsForm, tiktokUrl: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {!isSuperAdmin && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Your account role is <strong>admin</strong>. Only <strong>super_admin</strong> accounts can publish changes to global homepage content and site settings.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isSuperAdmin || isSavingSettings || isUploadingHeroImage}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingSettings ? 'Publishing...' : 'Save Homepage Content'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB: WEBSITE LOADING MEDIA SELECTOR / PROMOTIONAL POP-UP */}
          {activeTab === 'promotions' && (
            <div className="max-w-4xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
                    Website Loading Media Selector
                  </h1>
                  <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                    Choose whether visitors see an image, a video, or no promotional media when loading the website across desktop and mobile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPromoPreviewOpen(true)}
                  disabled={promo.displayMode === 'disabled'}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] text-[#8B42C9] dark:text-[#F5D061] text-xs font-semibold flex items-center gap-2 hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Modal ({promoPreviewViewport === 'mobile' ? 'Mobile' : 'Desktop'})</span>
                </button>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-6 shadow-xs dark:shadow-none"
              >
                {settingsSaved && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Website loading media configuration published to Supabase!</span>
                  </div>
                )}

                {settingsError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {/* 3-MODE WEBSITE LOADING SELECTOR */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                    Loading Media Display Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectDisplayMode('image')}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3 ${
                        promo.displayMode === 'image'
                          ? 'bg-[#8B42C9]/10 dark:bg-[#25183B] border-[#8B42C9] dark:border-[#A855F7] text-[#8B42C9] dark:text-[#F5D061]'
                          : 'bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#524858] dark:text-[#9C8EB2]'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide">Image Mode</p>
                        <p className="text-[11px] opacity-80 mt-0.5">Display a static luxury promotional image.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDisplayMode('video')}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3 ${
                        promo.displayMode === 'video'
                          ? 'bg-[#8B42C9]/10 dark:bg-[#25183B] border-[#8B42C9] dark:border-[#A855F7] text-[#8B42C9] dark:text-[#F5D061]'
                          : 'bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#524858] dark:text-[#9C8EB2]'
                      }`}
                    >
                      <Film className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide">Video Mode</p>
                        <p className="text-[11px] opacity-80 mt-0.5">Play promotional video on desktop &amp; mobile.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDisplayMode('disabled')}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3 ${
                        promo.displayMode === 'disabled'
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300'
                          : 'bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#524858] dark:text-[#9C8EB2]'
                      }`}
                    >
                      <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide">Disabled Mode</p>
                        <p className="text-[11px] opacity-80 mt-0.5">Do not show promotional media on load.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* IMAGE MODE MEDIA UPLOAD */}
                {promo.displayMode === 'image' && (
                  <div className="space-y-2 p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#160F24] border border-[#E4DDD0] dark:border-[#302149]">
                    <label className="text-xs font-semibold text-[#211B25] dark:text-[#F3EFEA]">
                      Promotional Image Asset
                    </label>
                    <PromotionalMediaUploader
                      mediaType="image"
                      folder="promotions/images"
                      mediaUrl={promo.imageUrl || ''}
                      buttonLabel="Upload Promo Image"
                      placeholder="/images/hero/hero_beauty_cosmetics.jpg or https://..."
                      onMediaChange={url => updatePromoPatch({ imageUrl: url, mediaUrl: url })}
                      onUploadStateChange={setIsUploadingPromoMedia}
                    />
                  </div>
                )}

                {/* VIDEO MODE MEDIA + POSTER UPLOADERS */}
                {promo.displayMode === 'video' && (
                  <div className="space-y-4 p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#160F24] border border-[#E4DDD0] dark:border-[#302149]">
                    {(!promo.videoUrl || isDeadDefaultPromoVideo(promo.videoUrl)) && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          No promotional video file is uploaded yet. Upload an H.264 MP4 or WebM video below and click Save &amp; Publish. Until a valid video is uploaded, visitors see the poster thumbnail.
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#211B25] dark:text-[#F3EFEA]">
                        Promotional Video Asset (Desktop &amp; Mobile)
                      </label>
                      <PromotionalMediaUploader
                        mediaType="video"
                        folder="promotions/videos"
                        mediaUrl={promo.videoUrl || ''}
                        buttonLabel="Upload Promo Video"
                        placeholder="https://.../novaluxe-promo.mp4"
                        onMediaChange={url => updatePromoPatch({ videoUrl: url, mediaUrl: url })}
                        onUploadStateChange={setIsUploadingPromoMedia}
                      />
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-[#E4DDD0] dark:border-[#2C1E42]">
                      <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                        Video Poster / Thumbnail Image
                      </label>
                      <PromotionalMediaUploader
                        mediaType="image"
                        folder="promotions/posters"
                        mediaUrl={promo.posterUrl || ''}
                        buttonLabel="Upload Poster"
                        placeholder="/images/hero/hero_beauty_cosmetics.jpg"
                        helperText="Shown immediately while the video buffers or if a device cannot decode the video stream."
                        onMediaChange={url => updatePromoField('posterUrl', url)}
                        onUploadStateChange={setIsUploadingPromoMedia}
                      />
                    </div>
                  </div>
                )}

                {promo.displayMode === 'disabled' && (
                  <div className="p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#160F24] border border-[#E4DDD0] dark:border-[#302149] text-xs text-[#524858] dark:text-[#C5B9D8]">
                    Promotional loading pop-up is currently disabled. Your uploaded promotional image and video URLs are safely preserved if you re-enable them later.
                  </div>
                )}

                {/* DESKTOP & MOBILE DISPLAY BEHAVIOR CONTROLS */}
                {promo.displayMode !== 'disabled' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8] flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-[#8B42C9] dark:text-[#A855F7]" />
                        <span>Desktop Display Behavior</span>
                      </label>
                      <select
                        value={promo.desktopBehavior || 'autoplay_muted'}
                        onChange={e => updatePromoField('desktopBehavior', e.target.value as PromoDesktopBehavior)}
                        className={inputClass}
                      >
                        <option value="autoplay_muted">Autoplay Muted (Default)</option>
                        <option value="click_to_play">Click to Play Video</option>
                        <option value="hide">Hide on Desktop</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8] flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#C99A35] dark:text-[#F5D061]" />
                        <span>Mobile Display Behavior</span>
                      </label>
                      <select
                        value={promo.mobileBehavior || 'autoplay_muted'}
                        onChange={e => updatePromoField('mobileBehavior', e.target.value as PromoMobileBehavior)}
                        className={inputClass}
                      >
                        <option value="autoplay_muted">Autoplay Muted + Tap-to-Play Fallback (Recommended)</option>
                        <option value="click_to_play">Show Poster with Tap to Play Video</option>
                        <option value="poster_fallback">Show Poster Image Only on Mobile</option>
                        <option value="hide">Hide on Mobile</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* INLINE LIVE PREVIEW (DESKTOP / MOBILE SWITCHER) */}
                <div className="space-y-3 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                      Live Loading Media Preview
                    </span>
                    <div className="inline-flex rounded-xl border border-[#E4DDD0] dark:border-[#34244C] p-0.5 bg-[#FAF8F4] dark:bg-[#1A1227]">
                      <button
                        type="button"
                        onClick={() => setPromoPreviewViewport('desktop')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                          promoPreviewViewport === 'desktop'
                            ? 'bg-white dark:bg-[#2B1D42] text-[#8B42C9] dark:text-[#F5D061] shadow-xs'
                            : 'text-[#746B78] dark:text-[#9C8EB2]'
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span>Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoPreviewViewport('mobile')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                          promoPreviewViewport === 'mobile'
                            ? 'bg-white dark:bg-[#2B1D42] text-[#8B42C9] dark:text-[#F5D061] shadow-xs'
                            : 'text-[#746B78] dark:text-[#9C8EB2]'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Mobile</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center bg-[#09060F] rounded-2xl border border-[#34244C] p-4">
                    <div
                      className={`rounded-2xl overflow-hidden border border-[#4C346E] bg-[#120D1B] ${
                        promoPreviewViewport === 'mobile' ? 'w-64' : 'w-full max-w-md'
                      }`}
                    >
                      {promo.displayMode === 'disabled' ? (
                        <div className="p-8 text-center text-xs text-[#9C8EB2]">
                          Disabled Mode — No promotional overlay shown when visitors load the site.
                        </div>
                      ) : promo.displayMode === 'video' && promo.videoUrl ? (
                        promoPreviewViewport === 'mobile' && promo.mobileBehavior === 'poster_fallback' ? (
                          <img
                            src={promo.posterUrl || DEFAULT_HERO_IMAGE}
                            alt="Mobile Poster Fallback"
                            onError={e => handleImageError(e, DEFAULT_HERO_IMAGE)}
                            className="w-full max-h-52 object-contain bg-black"
                          />
                        ) : (
                          <video
                            key={`${promo.videoUrl}-${promoPreviewViewport}`}
                            poster={promo.posterUrl || DEFAULT_HERO_IMAGE}
                            controls
                            muted
                            playsInline
                            loop
                            className="w-full max-h-52 object-contain bg-black"
                          >
                            <source src={promo.videoUrl} type={inferVideoMimeType(promo.videoUrl)} />
                          </video>
                        )
                      ) : (
                        <img
                          src={
                            promo.displayMode === 'image'
                              ? promo.imageUrl || promo.posterUrl || DEFAULT_HERO_IMAGE
                              : promo.posterUrl || DEFAULT_HERO_IMAGE
                          }
                          alt={promo.title || 'Promotional preview'}
                          onError={e => handleImageError(e, DEFAULT_HERO_IMAGE)}
                          className="w-full max-h-52 object-contain bg-black"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Campaign Title & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Campaign Title</label>
                    <input
                      type="text"
                      value={promo.title}
                      onChange={e => updatePromoField('title', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">CTA Button Label</label>
                    <input
                      type="text"
                      value={promo.ctaText}
                      onChange={e => updatePromoField('ctaText', e.target.value)}
                      placeholder="EXPLORE NOVALUXE"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Campaign Supporting Copy</label>
                  <textarea
                    rows={2}
                    value={promo.subtitle}
                    onChange={e => updatePromoField('subtitle', e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Destination & Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">CTA Destination Page</label>
                    <select
                      value={promo.destinationPath}
                      onChange={e => updatePromoField('destinationPath', e.target.value)}
                      className={inputClass}
                    >
                      <option value="/shop">Shop Catalogue (/shop)</option>
                      <option value="/about">About NOVALUXE (/about)</option>
                      <option value="/contact">Contact &amp; Enquiries (/contact)</option>
                      <option value="/">Homepage (/)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Display Frequency</label>
                    <select
                      value={promo.frequency}
                      onChange={e => updatePromoField('frequency', e.target.value as PromoFrequency)}
                      className={inputClass}
                    >
                      <option value="once_per_session">Once Per Session</option>
                      <option value="once_per_day">Once Per Day (24h)</option>
                      <option value="always">Show on Every Homepage Visit</option>
                    </select>
                  </div>
                </div>

                {/* Optional Schedule Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={promo.startDate}
                      onChange={e => updatePromoField('startDate', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={promo.endDate}
                      onChange={e => updatePromoField('endDate', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {!isSuperAdmin && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Your account role is <strong>admin</strong>. Only <strong>super_admin</strong> accounts can publish changes to website loading promotional settings.
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!isSuperAdmin || isSavingSettings || isUploadingPromoMedia}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSavingSettings ? 'Publishing...' : 'Save & Publish Loading Media'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPromoPreviewOpen(true)}
                    disabled={promo.displayMode === 'disabled'}
                    className="px-5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#34244C] text-[#211B25] dark:text-[#E2D4B7] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] cursor-pointer disabled:opacity-40"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Test Modal Pop-Up</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: BUSINESS SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
                    Official Business Settings
                  </h1>
                  <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">
                    Location, WhatsApp ordering number, contact lines, and delivery fees.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Reset store back to official initial state?')) {
                      resetAll();
                      refreshAllData();
                      setSettingsForm(store.getSettings());
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#F2EBDD] dark:bg-[#25183B] text-xs text-[#211B25] dark:text-[#E2D4B7] border border-[#E4DDD0] dark:border-transparent cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4 shadow-xs dark:shadow-none"
              >
                {settingsSaved && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Business settings updated in Supabase!</span>
                  </div>
                )}

                {settingsError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{settingsError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Business Name</label>
                  <input
                    type="text"
                    value={settingsForm.businessName}
                    onChange={e => setSettingsForm({ ...settingsForm, businessName: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Store Location (Monrovia)</label>
                  <input
                    type="text"
                    value={settingsForm.location}
                    onChange={e => setSettingsForm({ ...settingsForm, location: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Official Email</label>
                    <input
                      type="email"
                      value={settingsForm.email}
                      onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Official WhatsApp</label>
                    <input
                      type="text"
                      value={settingsForm.whatsapp}
                      onChange={e => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E4DDD0] dark:border-[#241933]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">Currency Symbol</label>
                    <input
                      type="text"
                      value={settingsForm.currency}
                      onChange={e => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#524858] dark:text-[#C5B9D8]">
                      Standard Monrovia Delivery Fee
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.deliveryFee}
                      onChange={e => setSettingsForm({ ...settingsForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                </div>

                {!isSuperAdmin && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Your account role is <strong>admin</strong>. Only <strong>super_admin</strong> accounts can publish changes to global business settings.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isSuperAdmin || isSavingSettings}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingSettings ? 'Saving...' : 'Save Business Settings'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 9: SUPABASE SQL GUIDE */}
          {activeTab === 'supabase' && (
            <div className="max-w-4xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
                    Supabase Database & API
                  </h1>
                  <p className="text-xs text-[#746B78] dark:text-[#9C8EB2]">Connected to project: {supabaseUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestSupabase}
                    disabled={testingConnection}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#1A1227] hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] text-[#9E751C] dark:text-[#F5D061] text-xs font-semibold flex items-center gap-1.5 border border-[#E4DDD0] dark:border-[#34244C] disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SQL_MIGRATION_TEXT);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#F2EBDD] dark:bg-[#25183B] hover:opacity-90 text-[#8B42C9] dark:text-[#F5D061] text-xs font-semibold flex items-center gap-1.5 border border-[#E4DDD0] dark:border-[#482E70] cursor-pointer"
                  >
                    {sqlCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{sqlCopied ? 'SQL Copied!' : 'Copy SQL Script'}</span>
                  </button>
                </div>
              </div>

              {/* Active Connection Card */}
              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-3 shadow-xs dark:shadow-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#C99A35] dark:text-[#F5D061]" />
                    <span className="text-xs font-semibold text-[#211B25] dark:text-[#F3EFEA]">
                      Active Project Integration
                    </span>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/40">
                    Client Initialized
                  </span>
                </div>
                <div className="text-xs text-[#524858] dark:text-[#C5B9D8] space-y-1 bg-[#FAF8F4] dark:bg-[#0D0914] p-3 rounded-xl border border-[#E4DDD0] dark:border-[#231735] font-mono break-all">
                  <p>
                    <span className="text-[#746B78] dark:text-[#8C829B]">Project Endpoint:</span> {supabaseUrl}
                  </p>
                  <p>
                    <span className="text-[#746B78] dark:text-[#8C829B]">Auth Role:</span> anon (public API)
                  </p>
                </div>
                {connectionResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      connectionResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/60 border border-red-500/50 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {connectionResult.success ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span>{connectionResult.message}</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#120D1B] rounded-2xl border border-[#E4DDD0] dark:border-[#261B36] p-6 space-y-4 shadow-xs dark:shadow-none">
                <div className="flex items-center gap-2 text-xs text-[#9E751C] dark:text-[#E2D4B7]">
                  <Database className="w-4 h-4 text-[#C99A35] dark:text-[#F5D061]" />
                  <span className="font-semibold">Database Schema, Migrations &amp; Buckets</span>
                </div>
                <p className="text-xs text-[#524858] dark:text-[#C5B9D8] leading-relaxed">
                  Copy the SQL script below and run it in your Supabase SQL Editor to ensure tables (
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">products</code>,{' '}
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">bulk_upload_history</code>,{' '}
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">categories</code>,{' '}
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">orders</code>,{' '}
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">site_settings</code>) and storage buckets (
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">product-images</code>,{' '}
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">category-images</code>,{' '}
                  <code className="text-[#8B42C9] dark:text-[#F5D061]">promotional-assets</code>) are provisioned.
                </p>

                <div className="bg-[#181224] dark:bg-[#0A0710] p-4 rounded-xl border border-[#34244C] dark:border-[#241933] overflow-x-auto text-[11px] font-mono text-[#D8B4FE] dark:text-[#A855F7] max-h-96 overflow-y-auto">
                  <pre>{SQL_MIGRATION_TEXT}</pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* EDIT PRODUCT MODAL */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-white dark:bg-[#120D1B] rounded-3xl border border-[#E4DDD0] dark:border-[#3B2D54] p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4DDD0] dark:border-[#241933] pb-3">
              <h3 className="text-lg font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
                {editingProduct.id ? 'Edit Product' : 'New Product'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-[#746B78] dark:text-[#8C829B] hover:text-[#211B25] dark:hover:text-[#F3EFEA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    setEditingProduct({ ...editingProduct, name, slug });
                  }}
                  className={modalInputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Category</label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className={modalInputClass}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className={modalInputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className={modalInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stockQuantity}
                    onChange={e => setEditingProduct({ ...editingProduct, stockQuantity: parseInt(e.target.value) || 0 })}
                    className={modalInputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Brand (Optional)</label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className={modalInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Size / Volume (Optional)</label>
                  <input
                    type="text"
                    value={editingProduct.sizeOrVolume || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, sizeOrVolume: e.target.value })}
                    className={modalInputClass}
                  />
                </div>
              </div>

              {/* PRODUCT IMAGE UPLOADER */}
              <ProductImageUploader
                imageUrl={editingProduct.images[0] || ''}
                productId={editingProduct.id || 'new-product'}
                label="Product Image"
                onImageChange={url => {
                  const currentRest = editingProduct.images.slice(1);
                  setEditingProduct({
                    ...editingProduct,
                    images: url ? [url, ...currentRest] : currentRest
                  });
                }}
                onUploadStateChange={uploading => setIsUploadingProductImage(uploading)}
              />

              <div className="space-y-1">
                <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className={modalInputClass}
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-[#524858] dark:text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isAvailable}
                    onChange={e => setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })}
                    className="rounded bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#8B42C9] dark:text-[#A855F7]"
                  />
                  <span>Is Available</span>
                </label>

                <label className="flex items-center gap-2 text-[#524858] dark:text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured}
                    onChange={e => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                    className="rounded bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#8B42C9] dark:text-[#A855F7]"
                  />
                  <span>Featured</span>
                </label>

                <label className="flex items-center gap-2 text-[#524858] dark:text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isNewArrival}
                    onChange={e => setEditingProduct({ ...editingProduct, isNewArrival: e.target.checked })}
                    className="rounded bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#8B42C9] dark:text-[#A855F7]"
                  />
                  <span>New Arrival</span>
                </label>

                <label className="flex items-center gap-2 text-[#524858] dark:text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isBestSeller}
                    onChange={e => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                    className="rounded bg-[#FAF8F4] dark:bg-[#1A1227] border-[#E4DDD0] dark:border-[#34244C] text-[#8B42C9] dark:text-[#A855F7]"
                  />
                  <span>Customer Favourite</span>
                </label>
              </div>

              {productSaveError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{productSaveError}</span>
                </div>
              )}

              <div className="pt-4 border-t border-[#E4DDD0] dark:border-[#241933] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setProductSaveError(null);
                    setIsProductModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-transparent text-[#524858] dark:text-[#C5B9D8] hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingProductImage || isSavingProduct || !editingProduct.images[0]}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {(isUploadingProductImage || isSavingProduct) && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>
                    {isUploadingProductImage
                      ? 'Uploading Image...'
                      : isSavingProduct
                        ? 'Saving to Supabase...'
                        : 'Save Product'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#120D1B] rounded-3xl border border-[#E4DDD0] dark:border-[#3B2D54] p-6 space-y-4 z-10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4DDD0] dark:border-[#241933] pb-3">
              <h3 className="text-lg font-serif font-bold text-[#211B25] dark:text-[#F3EFEA]">
                {editingCategory.name ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#746B78] dark:text-[#8C829B] hover:text-[#211B25] dark:hover:text-[#F3EFEA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Category Name</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    setEditingCategory({ ...editingCategory, name, slug });
                  }}
                  className={modalInputClass}
                />
              </div>

              {/* CATEGORY IMAGE UPLOADER */}
              <CategoryImageUploader
                imageUrl={editingCategory.imageUrl || ''}
                categorySlug={editingCategory.slug || 'category'}
                onImageChange={url => setEditingCategory({ ...editingCategory, imageUrl: url })}
                onUploadStateChange={uploading => setIsUploadingCategoryImage(uploading)}
              />

              <div className="space-y-1">
                <label className="font-semibold text-[#524858] dark:text-[#C5B9D8]">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description}
                  onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className={modalInputClass}
                />
              </div>

              {categorySaveError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{categorySaveError}</span>
                </div>
              )}

              <div className="pt-4 border-t border-[#E4DDD0] dark:border-[#241933] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCategorySaveError(null);
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-transparent text-[#524858] dark:text-[#C5B9D8] hover:bg-[#F2EBDD] dark:hover:bg-[#251A38] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingCategoryImage || isSavingCategory || !editingCategory.imageUrl}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B42C9] to-[#C99A35] dark:from-[#A855F7] dark:to-[#CA8A04] text-white dark:text-[#0A0710] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {(isUploadingCategoryImage || isSavingCategory) && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>
                    {isUploadingCategoryImage
                      ? 'Uploading Image...'
                      : isSavingCategory
                        ? 'Saving to Supabase...'
                        : 'Save Category'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 dark:bg-black/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#120D1B] rounded-3xl border border-[#E4DDD0] dark:border-[#3B2D54] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4DDD0] dark:border-[#241933] pb-3">
              <div>
                <span className="text-[10px] text-[#8B42C9] dark:text-[#A855F7] uppercase tracking-wider font-semibold">
                  Order Details
                </span>
                <h3 className="text-xl font-mono font-bold text-[#9E751C] dark:text-[#F5D061]">
                  {selectedOrder.orderReference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#746B78] dark:text-[#8C829B] hover:text-[#211B25] dark:hover:text-[#F3EFEA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#171022] border border-[#E4DDD0] dark:border-[#2D1E42] space-y-1">
                <p className="font-semibold text-[#9E751C] dark:text-[#F5D061]">Customer Information</p>
                <p className="text-[#211B25] dark:text-[#F3EFEA] font-medium">{selectedOrder.customerName}</p>
                <p className="text-[#524858] dark:text-[#C5B9D8]">{selectedOrder.customerPhone}</p>
                {selectedOrder.customerEmail && (
                  <p className="text-[#746B78] dark:text-[#8C829B]">{selectedOrder.customerEmail}</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#171022] border border-[#E4DDD0] dark:border-[#2D1E42] space-y-1">
                <p className="font-semibold text-[#8B42C9] dark:text-[#A855F7]">Fulfillment & Location</p>
                <p className="text-[#211B25] dark:text-[#F3EFEA]">{selectedOrder.deliveryLocation}</p>
                <p className="text-[#524858] dark:text-[#C5B9D8]">{selectedOrder.deliveryAddress}</p>
                <p className="text-[11px] text-[#9E751C] dark:text-[#F5D061] font-semibold">
                  {selectedOrder.deliveryMethod}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-[#746B78] dark:text-[#8C829B] font-semibold">
                Ordered Items
              </h4>
              <div className="divide-y divide-[#E4DDD0] dark:divide-[#221633] border border-[#E4DDD0] dark:border-[#241933] rounded-xl p-3 bg-[#FAF8F4] dark:bg-[#171022]">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-[#211B25] dark:text-[#F3EFEA]">{item.productName}</p>
                      {item.selectedVariant && (
                        <p className="text-[10px] text-[#8B42C9] dark:text-[#A855F7]">{item.selectedVariant}</p>
                      )}
                      <p className="text-[10px] text-[#746B78] dark:text-[#8C829B]">
                        Qty: {item.quantity} × {selectedOrder.currency}
                        {item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-semibold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                      {selectedOrder.currency}
                      {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total and Status change */}
            <div className="pt-3 border-t border-[#E4DDD0] dark:border-[#241933] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[#746B78] dark:text-[#8C829B]">Total Amount: </span>
                <span className="text-lg font-serif font-bold text-[#9E751C] dark:text-[#F5D061] tabular-nums">
                  {selectedOrder.currency}
                  {selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#746B78] dark:text-[#8C829B]">Change Status:</span>
                <select
                  value={selectedOrder.orderStatus}
                  onChange={e => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                  className="bg-[#FAF8F4] dark:bg-[#1A1227] border border-[#E4DDD0] dark:border-[#3A2854] text-xs text-[#9E751C] dark:text-[#F5D061] px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PROMOTIONAL CAMPAIGN PREVIEW MODAL */}
      {isPromoPreviewOpen && (
        <PromotionalFlyerModal
          forceOpen
          previewConfig={promo}
          previewViewport={promoPreviewViewport}
          onClosePreview={() => setIsPromoPreviewOpen(false)}
          onNavigate={() => {
            setIsPromoPreviewOpen(false);
            onBackToStore();
          }}
        />
      )}
    </div>
  );
};
