import React, { useState } from 'react';
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
  ExternalLink,
  RefreshCw,
  Copy,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { store } from '../lib/store';
import { Product, Category, Order, OrderStatus, PaymentStatus, Enquiry } from '../types';
import { NovaluxeLogo } from '../components/NovaluxeLogo';
import { testSupabaseConnection, supabaseUrl } from '../lib/supabase';
import { ProductImageUploader } from '../components/ProductImageUploader';

interface AdminDashboardPageProps {
  onBackToStore: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onBackToStore }) => {
  const { adminUser, logout } = useAuth();
  const { settings, updateSettings, categories, refreshCategories, products, refreshProducts, resetAll } = useSettings();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'categories' | 'orders' | 'customers' | 'enquiries' | 'content' | 'settings' | 'supabase'
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

  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Order filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Supabase copy feedback
  const [sqlCopied, setSqlCopied] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    const result = await testSupabaseConnection();
    setConnectionResult(result);
    setTestingConnection(false);
  };

  // Settings form states
  const [settingsForm, setSettingsForm] = useState(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const refreshAllData = () => {
    refreshProducts();
    refreshCategories();
    setOrders(store.getOrders());
    setEnquiries(store.getEnquiries());
  };

  // KPIs
  const totalProducts = products.length;
  const inStockProducts = products.filter(p => p.isAvailable && p.stockQuantity > 0).length;
  const outOfStockProducts = products.filter(p => !p.isAvailable || p.stockQuantity <= 0).length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Confirmed').length;
  const completedOrders = orders.filter(o => o.orderStatus === 'Completed').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Order status updater
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
    store.updateOrderStatus(orderId, status, paymentStatus);
    const updated = store.getOrders();
    setOrders(updated);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(updated.find(o => o.id === orderId) || null);
    }
  };

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    store.saveProduct(editingProduct);
    refreshProducts();
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      store.deleteProduct(id);
      refreshProducts();
    }
  };

  // Save category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    store.saveCategory(editingCategory);
    refreshCategories();
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // Delete category
  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      store.deleteCategory(id);
      refreshCategories();
    }
  };

  // Save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
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

  const SQL_MIGRATION_TEXT = `-- ==============================================================================
-- NOVALUXE BY SENNEL - OFFICIAL SUPABASE DATABASE SCHEMA
-- ==============================================================================
create extension if not exists "uuid-ossp";

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  currency text default 'USD' not null,
  category_id uuid references categories(id) on delete set null,
  sku text,
  stock_quantity integer default 0 check (stock_quantity >= 0),
  is_available boolean default true,
  is_featured boolean default false,
  is_new_arrival boolean default false,
  is_best_seller boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at
before update on products
for each row execute function update_updated_at_column();

create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  variant_name text not null,
  variant_value text not null,
  price_adjustment numeric(10, 2) default 0.00,
  stock_quantity integer default 0 check (stock_quantity >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_reference text unique not null,
  customer_id uuid references customers(id) on delete set null,
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

create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  selected_variant text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0)
);

create table if not exists enquiries (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  subject text not null,
  message text not null,
  status text default 'New' check (status in ('New', 'Replied', 'Archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists site_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text unique not null,
  setting_value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists admin_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  role text default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_orders_reference on orders(order_reference);
create index if not exists idx_orders_customer_phone on orders(customer_phone);
create index if not exists idx_order_items_order on order_items(order_id);

-- RLS
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table enquiries enable row level security;
alter table site_settings enable row level security;
alter table admin_profiles enable row level security;

-- Policies
create policy "Allow public read active categories" on categories for select using (is_active = true);
create policy "Allow public read available products" on products for select using (is_available = true);
create policy "Allow public read product images" on product_images for select using (true);
create policy "Allow public read product variants" on product_variants for select using (true);
create policy "Allow public read site settings" on site_settings for select using (true);
create policy "Allow read order by reference" on orders for select using (true);
create policy "Allow read order items" on order_items for select using (true);

create policy "Allow public order insertion" on orders for insert with check (true);
create policy "Allow public order items insertion" on order_items for insert with check (true);
create policy "Allow public enquiries insertion" on enquiries for insert with check (true);
create policy "Allow public customers insertion" on customers for insert with check (true);

create policy "Allow admins full access to categories" on categories for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to products" on products for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to orders" on orders for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to order items" on order_items for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to enquiries" on enquiries for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to site settings" on site_settings for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to customers" on customers for all using (auth.role() = 'authenticated');

-- ==============================================================================
-- SUPABASE STORAGE: PRODUCT IMAGES BUCKET & POLICIES
-- ==============================================================================
-- 1. Create public bucket 'product-images'
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- 2. Allow public access to view product images
create policy "Public Access to product-images" on storage.objects
  for select using (bucket_id = 'product-images');

-- 3. Allow authenticated & admin users to upload, update, and delete product images
create policy "Allow upload to product-images" on storage.objects
  for insert with check (bucket_id = 'product-images');

create policy "Allow update to product-images" on storage.objects
  for update with check (bucket_id = 'product-images');

create policy "Allow delete from product-images" on storage.objects
  for delete using (bucket_id = 'product-images');`;

  return (
    <div className="min-h-screen bg-[#09070D] text-[#F3EFEA] flex flex-col">
      {/* Top Admin Nav */}
      <div className="bg-[#100B18] border-b border-[#281C38] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div onClick={onBackToStore} className="cursor-pointer">
            <NovaluxeLogo size="sm" variant="transparent" />
          </div>
          <span className="text-xs text-[#E2D4B7] bg-[#221735] px-2.5 py-0.5 rounded-full font-medium hidden sm:inline">
            Admin Console
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStore}
            className="text-xs text-[#A79DB8] hover:text-[#F3EFEA] px-3 py-1.5 rounded-lg border border-[#34244C] transition-colors"
          >
            ← View Storefront
          </button>
          <button
            onClick={logout}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Admin Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 bg-[#0D0914] border-r border-[#241933] p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C6E91] px-3 py-2">
            Navigation
          </div>

          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'products', label: 'Products', icon: Package, count: products.length },
            { id: 'categories', label: 'Categories', icon: Layers, count: categories.length },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, count: pendingOrders },
            { id: 'customers', label: 'Customers', icon: Users, count: customerList.length },
            { id: 'enquiries', label: 'Enquiries', icon: MessageSquare, count: enquiries.length },
            { id: 'content', label: 'Hero & Content', icon: Globe },
            { id: 'settings', label: 'Business Settings', icon: Settings },
            { id: 'supabase', label: 'Supabase SQL', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#25183B] text-[#F5D061] font-semibold border border-[#482E70]/60'
                    : 'text-[#C5B9D8] hover:bg-[#181124] hover:text-[#FFFFFF]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F5D061]' : 'text-[#8C829B]'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-[#3A265E] text-[#F5D061]' : 'bg-[#181124] text-[#8C829B]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Store Overview</h1>
                <p className="text-xs text-[#9C8EB2]">Real-time inventory and customer order activity in Monrovia.</p>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="p-5 rounded-2xl bg-[#120D1B] border border-[#261B36] space-y-1">
                  <span className="text-xs text-[#9C8EB2]">Total Products</span>
                  <p className="text-2xl font-serif font-bold text-[#F3EFEA]">{totalProducts}</p>
                  <p className="text-[11px] text-emerald-400">{inStockProducts} in stock • {outOfStockProducts} out</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#120D1B] border border-[#261B36] space-y-1">
                  <span className="text-xs text-[#9C8EB2]">Active Orders</span>
                  <p className="text-2xl font-serif font-bold text-[#F5D061]">{pendingOrders}</p>
                  <p className="text-[11px] text-[#A855F7]">{totalOrders} total recorded</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#120D1B] border border-[#261B36] space-y-1">
                  <span className="text-xs text-[#9C8EB2]">Total Sales Volume</span>
                  <p className="text-2xl font-serif font-bold text-[#F5D061] tabular-nums">
                    {settings.currency}{totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[#9C8EB2]">Monrovia retail orders</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#120D1B] border border-[#261B36] space-y-1">
                  <span className="text-xs text-[#9C8EB2]">Customer Enquiries</span>
                  <p className="text-2xl font-serif font-bold text-[#A855F7]">{enquiries.length}</p>
                  <p className="text-[11px] text-[#9C8EB2]">Received via website</p>
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#261B36] pb-3">
                  <h2 className="text-base font-serif font-bold text-[#F3EFEA]">Recent Orders</h2>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#F5D061] hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#8C829B] border-b border-[#241933]">
                        <th className="pb-2">Reference</th>
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Method</th>
                        <th className="pb-2">Total</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#241933]">
                      {orders.slice(0, 5).map(o => (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="hover:bg-[#1A1227] cursor-pointer"
                        >
                          <td className="py-3 font-mono font-semibold text-[#F5D061]">{o.orderReference}</td>
                          <td className="py-3 text-[#F3EFEA]">{o.customerName}</td>
                          <td className="py-3 text-[#C5B9D8]">{o.deliveryLocation}</td>
                          <td className="py-3 text-[#C5B9D8]">{o.deliveryMethod}</td>
                          <td className="py-3 font-semibold text-[#F3EFEA] tabular-nums">
                            {o.currency}{o.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full bg-[#201533] text-[#F5D061] text-[10px] font-semibold border border-[#3A2954]">
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
                  <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Product Management</h1>
                  <p className="text-xs text-[#9C8EB2]">Add, edit, change prices, and adjust stock for your Monrovia store catalogue.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct({
                      id: `prod-${Date.now()}`,
                      name: '',
                      slug: '',
                      description: '',
                      price: 25.0,
                      currency: 'USD',
                      categoryId: categories[0]?.id || 'cat-skincare',
                      sku: `NVL-${Math.floor(100 + Math.random() * 900)}`,
                      stockQuantity: 20,
                      isAvailable: true,
                      isFeatured: false,
                      isNewArrival: true,
                      isBestSeller: false,
                      images: ['/src/assets/images/category_skincare_1792778552269.jpg'],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    });
                    setIsProductModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#171022] text-[#8C829B] border-b border-[#241933]">
                        <th className="p-4">Product</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Stock</th>
                        <th className="p-4">Flags</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#241933]">
                      {products.map(p => {
                        const cat = categories.find(c => c.id === p.categoryId);
                        return (
                          <tr key={p.id} className="hover:bg-[#1A1227]">
                            <td className="p-4 flex items-center gap-3">
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover bg-[#221735] shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-[#F3EFEA]">{p.name}</p>
                                <p className="text-[11px] text-[#8C829B]">SKU: {p.sku}</p>
                              </div>
                            </td>
                            <td className="p-4 text-[#C5B9D8]">{cat?.name || 'Essentials'}</td>
                            <td className="p-4 font-semibold text-[#F5D061] tabular-nums">
                              {settings.currency}{p.price.toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${p.stockQuantity > 5 ? 'bg-emerald-950/60 text-emerald-300' : p.stockQuantity > 0 ? 'bg-amber-950/60 text-amber-300' : 'bg-red-950/60 text-red-300'}`}>
                                {p.stockQuantity} in stock
                              </span>
                            </td>
                            <td className="p-4 space-x-1">
                              {p.isFeatured && <span className="text-[10px] bg-[#2E1E4B] text-[#C084FC] px-1.5 py-0.5 rounded">Featured</span>}
                              {p.isNewArrival && <span className="text-[10px] bg-[#362716] text-[#F5D061] px-1.5 py-0.5 rounded">New</span>}
                              {p.isBestSeller && <span className="text-[10px] bg-[#221B35] text-[#E2D4B7] px-1.5 py-0.5 rounded">Favourite</span>}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct({ ...p });
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 text-[#C5B9D8] hover:text-[#F5D061] rounded hover:bg-[#251A38]"
                                title="Edit Product"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-[#8C829B] hover:text-red-400 rounded hover:bg-[#251A38]"
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

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Category Management</h1>
                  <p className="text-xs text-[#9C8EB2]">Organize your store collections (Skincare, Makeup, Fragrances, Body Care, etc.).</p>
                </div>
                <button
                  onClick={() => {
                    setEditingCategory({
                      id: `cat-${Date.now()}`,
                      name: '',
                      slug: '',
                      description: '',
                      imageUrl: '/src/assets/images/category_skincare_1792778552269.jpg',
                      isActive: true,
                      displayOrder: categories.length + 1,
                      createdAt: new Date().toISOString()
                    });
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(c => (
                  <div key={c.id} className="bg-[#120D1B] rounded-2xl border border-[#261B36] overflow-hidden flex flex-col justify-between">
                    <div className="h-32 bg-[#1A1227] overflow-hidden relative">
                      <img src={c.imageUrl} alt={c.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#120D1B] via-transparent to-transparent" />
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-serif font-bold text-[#F3EFEA]">{c.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#201533] text-[#F5D061]">Order: {c.displayOrder}</span>
                      </div>
                      <p className="text-xs text-[#9C8EB2] line-clamp-2">{c.description}</p>
                      <div className="pt-3 border-t border-[#241933] flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory({ ...c });
                            setIsCategoryModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#1F162E] text-xs text-[#E2D4B7] hover:text-[#FFFFFF]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="px-3 py-1 rounded-lg bg-red-950/40 text-xs text-red-400 hover:text-red-300"
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
                  <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Order Management</h1>
                  <p className="text-xs text-[#9C8EB2]">Track, update status, and manage Monrovia delivery or pickup orders.</p>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3 bg-[#120D1B] p-4 rounded-2xl border border-[#261B36]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8C829B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search by order ref, customer name, phone, area..."
                    className="w-full pl-10 pr-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value)}
                  className="bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#E2D4B7] px-3 py-2 focus:outline-none"
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
              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#171022] text-[#8C829B] border-b border-[#241933]">
                        <th className="p-4">Reference</th>
                        <th className="p-4">Customer & Phone</th>
                        <th className="p-4">Destination</th>
                        <th className="p-4">Items</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#241933]">
                      {filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-[#1A1227]">
                          <td className="p-4 font-mono font-bold text-[#F5D061]">{o.orderReference}</td>
                          <td className="p-4">
                            <p className="font-semibold text-[#F3EFEA]">{o.customerName}</p>
                            <p className="text-[11px] text-[#A855F7]">{o.customerPhone}</p>
                          </td>
                          <td className="p-4 text-[#C5B9D8]">
                            <p>{o.deliveryLocation}</p>
                            <p className="text-[10px] text-[#8C829B]">{o.deliveryMethod}</p>
                          </td>
                          <td className="p-4 text-[#C5B9D8]">{o.items.length} items</td>
                          <td className="p-4 font-semibold text-[#F5D061] tabular-nums">
                            {o.currency}{o.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-4">
                            <select
                              value={o.orderStatus}
                              onChange={e => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                              className="bg-[#1A1227] border border-[#3A2854] text-[11px] text-[#F5D061] px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
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
                              className="px-3 py-1 rounded-lg bg-[#221637] text-xs text-[#E2D4B7] hover:text-[#FFFFFF]"
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
                <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Customer Directory</h1>
                <p className="text-xs text-[#9C8EB2]">Customer records collected through orders in Monrovia.</p>
              </div>

              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#171022] text-[#8C829B] border-b border-[#241933]">
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Primary Delivery Area</th>
                      <th className="p-4">Orders Placed</th>
                      <th className="p-4 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#241933]">
                    {customerList.map((c, i) => (
                      <tr key={i} className="hover:bg-[#1A1227]">
                        <td className="p-4 font-semibold text-[#F3EFEA]">{c.name}</td>
                        <td className="p-4 text-[#F5D061]">{c.phone}</td>
                        <td className="p-4 text-[#C5B9D8]">{c.location}</td>
                        <td className="p-4 text-[#C5B9D8]">{c.orderCount}</td>
                        <td className="p-4 text-right font-serif font-bold text-[#F5D061] tabular-nums">
                          {settings.currency}{c.totalSpent.toFixed(2)}
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
                <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Customer Enquiries</h1>
                <p className="text-xs text-[#9C8EB2]">Messages sent via the website contact form.</p>
              </div>

              <div className="space-y-4">
                {enquiries.length === 0 ? (
                  <p className="text-xs text-[#8C829B]">No customer enquiries received yet.</p>
                ) : (
                  enquiries.map(enq => (
                    <div key={enq.id} className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#241933] pb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[#F3EFEA]">{enq.subject}</h3>
                          <p className="text-xs text-[#9C8EB2]">From: {enq.fullName} ({enq.phone}) {enq.email ? `• ${enq.email}` : ''}</p>
                        </div>
                        <span className="text-[11px] text-[#A855F7]">{new Date(enq.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-[#C5B9D8] leading-relaxed">{enq.message}</p>
                      <div className="pt-2 flex gap-3">
                        <a
                          href={`https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/30 inline-flex items-center gap-1.5"
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
                <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Homepage & Brand Content</h1>
                <p className="text-xs text-[#9C8EB2]">Edit announcement bar, hero section, and social media handles.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
                {settingsSaved && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Content updated successfully!</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Announcement Bar Text</label>
                  <input
                    type="text"
                    value={settingsForm.announcementText}
                    onChange={e => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="announcementToggle"
                    checked={settingsForm.announcementEnabled}
                    onChange={e => setSettingsForm({ ...settingsForm, announcementEnabled: e.target.checked })}
                    className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7]"
                  />
                  <label htmlFor="announcementToggle" className="text-xs text-[#C5B9D8]">
                    Show Announcement Bar
                  </label>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-[#241933]">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Hero Headline</label>
                  <input
                    type="text"
                    value={settingsForm.heroHeadline}
                    onChange={e => setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Hero Supporting Text</label>
                  <textarea
                    rows={2}
                    value={settingsForm.heroSubtitle}
                    onChange={e => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Brand Introduction Copy</label>
                  <textarea
                    rows={3}
                    value={settingsForm.brandIntro}
                    onChange={e => setSettingsForm({ ...settingsForm, brandIntro: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="space-y-1.5 pt-3 border-t border-[#241933]">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Instagram Profile URL</label>
                  <input
                    type="text"
                    value={settingsForm.instagramUrl}
                    onChange={e => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5B9D8]">TikTok Profile URL</label>
                  <input
                    type="text"
                    value={settingsForm.tiktokUrl}
                    onChange={e => setSettingsForm({ ...settingsForm, tiktokUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs uppercase tracking-wider"
                >
                  Save Homepage Content
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: BUSINESS SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Official Business Settings</h1>
                  <p className="text-xs text-[#9C8EB2]">Location, WhatsApp ordering number, contact lines, and delivery fees.</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Reset store back to official initial state?')) {
                      resetAll();
                      refreshAllData();
                      setSettingsForm(store.getSettings());
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#25183B] text-xs text-[#E2D4B7] hover:text-[#FFFFFF]"
                >
                  Reset Defaults
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
                {settingsSaved && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Business settings updated!</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Business Name</label>
                  <input
                    type="text"
                    value={settingsForm.businessName}
                    onChange={e => setSettingsForm({ ...settingsForm, businessName: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C5B9D8]">Store Location (Monrovia)</label>
                  <input
                    type="text"
                    value={settingsForm.location}
                    onChange={e => setSettingsForm({ ...settingsForm, location: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#C5B9D8]">Official Email</label>
                    <input
                      type="email"
                      value={settingsForm.email}
                      onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#C5B9D8]">Official WhatsApp</label>
                    <input
                      type="text"
                      value={settingsForm.whatsapp}
                      onChange={e => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#241933]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#C5B9D8]">Currency Symbol</label>
                    <input
                      type="text"
                      value={settingsForm.currency}
                      onChange={e => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#C5B9D8]">Standard Monrovia Delivery Fee</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settingsForm.deliveryFee}
                      onChange={e => setSettingsForm({ ...settingsForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-xs text-[#F3EFEA]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold text-xs uppercase tracking-wider"
                >
                  Save Business Settings
                </button>
              </form>
            </div>
          )}

          {/* TAB 9: SUPABASE SQL GUIDE */}
          {activeTab === 'supabase' && (
            <div className="max-w-4xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#F3EFEA]">Supabase Database & API</h1>
                  <p className="text-xs text-[#9C8EB2]">Connected to project: {supabaseUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestSupabase}
                    disabled={testingConnection}
                    className="px-4 py-2 rounded-xl bg-[#1A1227] hover:bg-[#251A38] text-[#F5D061] text-xs font-semibold flex items-center gap-1.5 border border-[#34244C] disabled:opacity-50"
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
                    className="px-4 py-2 rounded-xl bg-[#25183B] hover:bg-[#322050] text-[#F5D061] text-xs font-semibold flex items-center gap-1.5 border border-[#482E70]"
                  >
                    {sqlCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{sqlCopied ? 'SQL Copied!' : 'Copy SQL Script'}</span>
                  </button>
                </div>
              </div>

              {/* Active Connection Card */}
              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#F5D061]" />
                    <span className="text-xs font-semibold text-[#F3EFEA]">Active Project Integration</span>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/40">
                    Client Initialized
                  </span>
                </div>
                <div className="text-xs text-[#C5B9D8] space-y-1 bg-[#0D0914] p-3 rounded-xl border border-[#231735] font-mono break-all">
                  <p><span className="text-[#8C829B]">Project Endpoint:</span> {supabaseUrl}</p>
                  <p><span className="text-[#8C829B]">Auth Role:</span> anon (public API)</p>
                </div>
                {connectionResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${connectionResult.success ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border border-red-500/50 text-red-300'}`}>
                    {connectionResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span>{connectionResult.message}</span>
                  </div>
                )}
              </div>

              <div className="bg-[#120D1B] rounded-2xl border border-[#261B36] p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#E2D4B7]">
                  <Database className="w-4 h-4 text-[#F5D061]" />
                  <span className="font-semibold">Database Schema & Tables</span>
                </div>
                <p className="text-xs text-[#C5B9D8] leading-relaxed">
                  If you haven't run the SQL script in your Supabase SQL Editor yet, copy the script below and run it once to create the tables (<code className="text-[#F5D061]">products</code>, <code className="text-[#F5D061]">categories</code>, <code className="text-[#F5D061]">orders</code>, <code className="text-[#F5D061]">enquiries</code>, <code className="text-[#F5D061]">site_settings</code>) and enable Row Level Security.
                </p>

                <div className="bg-[#0A0710] p-4 rounded-xl border border-[#241933] overflow-x-auto text-[11px] font-mono text-[#A855F7] max-h-96 overflow-y-auto">
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#120D1B] rounded-3xl border border-[#3B2D54] p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between border-b border-[#241933] pb-3">
              <h3 className="text-lg font-serif font-bold text-[#F3EFEA]">
                {editingProduct.id ? 'Edit Product' : 'New Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-[#8C829B] hover:text-[#F3EFEA]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#C5B9D8]">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setEditingProduct({ ...editingProduct, name, slug });
                  }}
                  className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#C5B9D8]">Category</label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#C5B9D8]">Price (USD)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#C5B9D8]">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#C5B9D8]">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stockQuantity}
                    onChange={e => setEditingProduct({ ...editingProduct, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
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
                <label className="font-semibold text-[#C5B9D8]">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isAvailable}
                    onChange={e => setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })}
                    className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7]"
                  />
                  <span>Is Available</span>
                </label>

                <label className="flex items-center gap-2 text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured}
                    onChange={e => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                    className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7]"
                  />
                  <span>Featured</span>
                </label>

                <label className="flex items-center gap-2 text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isNewArrival}
                    onChange={e => setEditingProduct({ ...editingProduct, isNewArrival: e.target.checked })}
                    className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7]"
                  />
                  <span>New Arrival</span>
                </label>

                <label className="flex items-center gap-2 text-[#C5B9D8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isBestSeller}
                    onChange={e => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                    className="rounded bg-[#1A1227] border-[#34244C] text-[#A855F7]"
                  />
                  <span>Customer Favourite</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#241933] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1227] text-[#C5B9D8] hover:bg-[#251A38] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingProductImage || !editingProduct.images[0]}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {isUploadingProductImage && <RefreshCw className="w-4 h-4 animate-spin text-[#0A0710]" />}
                  <span>{isUploadingProductImage ? 'Uploading Image...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#120D1B] rounded-3xl border border-[#3B2D54] p-6 space-y-4 z-10">
            <div className="flex items-center justify-between border-b border-[#241933] pb-3">
              <h3 className="text-lg font-serif font-bold text-[#F3EFEA]">
                {editingCategory.name ? 'Edit Category' : 'New Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#8C829B] hover:text-[#F3EFEA]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#C5B9D8]">Category Name</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setEditingCategory({ ...editingCategory, name, slug });
                  }}
                  className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#C5B9D8]">Category Image URL</label>
                <input
                  type="text"
                  required
                  value={editingCategory.imageUrl}
                  onChange={e => setEditingCategory({ ...editingCategory, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#C5B9D8]">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description}
                  onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1227] border border-[#34244C] rounded-xl text-[#F3EFEA]"
                />
              </div>

              <div className="pt-4 border-t border-[#241933] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1227] text-[#C5B9D8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#CA8A04] text-[#0A0710] font-semibold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-2xl bg-[#120D1B] rounded-3xl border border-[#3B2D54] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between border-b border-[#241933] pb-3">
              <div>
                <span className="text-[10px] text-[#A855F7] uppercase tracking-wider font-semibold">Order Details</span>
                <h3 className="text-xl font-mono font-bold text-[#F5D061]">{selectedOrder.orderReference}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-[#8C829B] hover:text-[#F3EFEA]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#171022] border border-[#2D1E42] space-y-1">
                <p className="font-semibold text-[#F5D061]">Customer Information</p>
                <p className="text-[#F3EFEA] font-medium">{selectedOrder.customerName}</p>
                <p className="text-[#C5B9D8]">{selectedOrder.customerPhone}</p>
                {selectedOrder.customerEmail && <p className="text-[#8C829B]">{selectedOrder.customerEmail}</p>}
              </div>

              <div className="p-4 rounded-xl bg-[#171022] border border-[#2D1E42] space-y-1">
                <p className="font-semibold text-[#A855F7]">Fulfillment & Location</p>
                <p className="text-[#F3EFEA]">{selectedOrder.deliveryLocation}</p>
                <p className="text-[#C5B9D8]">{selectedOrder.deliveryAddress}</p>
                <p className="text-[11px] text-[#F5D061] font-semibold">{selectedOrder.deliveryMethod}</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-[#8C829B] font-semibold">Ordered Items</h4>
              <div className="divide-y divide-[#221633] border border-[#241933] rounded-xl p-3 bg-[#171022]">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-[#F3EFEA]">{item.productName}</p>
                      {item.selectedVariant && <p className="text-[10px] text-[#A855F7]">{item.selectedVariant}</p>}
                      <p className="text-[10px] text-[#8C829B]">Qty: {item.quantity} × {selectedOrder.currency}{item.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className="font-semibold text-[#F5D061] tabular-nums">{selectedOrder.currency}{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total and Status change */}
            <div className="pt-3 border-t border-[#241933] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[#8C829B]">Total Amount: </span>
                <span className="text-lg font-serif font-bold text-[#F5D061] tabular-nums">
                  {selectedOrder.currency}{selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#8C829B]">Change Status:</span>
                <select
                  value={selectedOrder.orderStatus}
                  onChange={e => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                  className="bg-[#1A1227] border border-[#3A2854] text-xs text-[#F5D061] px-3 py-1.5 rounded-lg focus:outline-none"
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
    </div>
  );
};
