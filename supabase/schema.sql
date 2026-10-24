-- ==============================================================================
-- NOVALUXE BY SENNEL - OFFICIAL SUPABASE DATABASE SCHEMA & SEED SCRIPT
-- Business: Cosmetics, Beauty Products, Skincare & Everyday Essentials
-- Location: GSA Road, around ELWA Roundabout, Monrovia, Liberia
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. AUTOMATIC TIMESTAMP TRIGGER FUNCTION
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- 3. CATEGORIES TABLE
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

-- 4. PRODUCTS TABLE
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

-- Trigger for products updated_at
drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at
before update on products
for each row execute function update_updated_at_column();

-- 5. PRODUCT IMAGES TABLE
create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. PRODUCT VARIANTS TABLE
create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  variant_name text not null, -- e.g. 'Size', 'Shade', 'Fragrance'
  variant_value text not null, -- e.g. '50ml', 'Ruby Matte', 'Amber Orchid'
  price_adjustment numeric(10, 2) default 0.00,
  stock_quantity integer default 0 check (stock_quantity >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. CUSTOMERS TABLE
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ORDERS TABLE
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

-- Trigger for orders updated_at
drop trigger if exists set_orders_updated_at on orders;
create trigger set_orders_updated_at
before update on orders
for each row execute function update_updated_at_column();

-- 9. ORDER ITEMS TABLE (Immutable historical snapshot)
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

-- 10. ENQUIRIES TABLE
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

-- 11. SITE SETTINGS TABLE
create table if not exists site_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text unique not null,
  setting_value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger for site_settings updated_at
drop trigger if exists set_settings_updated_at on site_settings;
create trigger set_settings_updated_at
before update on site_settings
for each row execute function update_updated_at_column();

-- 12. ADMIN PROFILES TABLE
create table if not exists admin_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  role text default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. INDEXES FOR HIGH-PERFORMANCE QUERIES
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_orders_reference on orders(order_reference);
create index if not exists idx_orders_customer_phone on orders(customer_phone);
create index if not exists idx_order_items_order on order_items(order_id);

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Public Storefront Read Access
create policy "Public can view active categories" on categories for select using (is_active = true);
create policy "Public can view available products" on products for select using (is_available = true);
create policy "Public can view product images" on product_images for select using (true);
create policy "Public can view product variants" on product_variants for select using (true);
create policy "Public can view site settings" on site_settings for select using (true);
create policy "Public can view order by reference" on orders for select using (true);
create policy "Public can view order items" on order_items for select using (true);

-- Public Storefront Insert Access (Checkout, Orders, Enquiries)
create policy "Public can submit customer info" on customers for insert with check (true);
create policy "Public can submit orders" on orders for insert with check (true);
create policy "Public can submit order items" on order_items for insert with check (true);
create policy "Public can submit enquiries" on enquiries for insert with check (true);

-- Authenticated Admin Management Policies
create policy "Admins full access to categories" on categories for all using (auth.role() = 'authenticated');
create policy "Admins full access to products" on products for all using (auth.role() = 'authenticated');
create policy "Admins full access to product images" on product_images for all using (auth.role() = 'authenticated');
create policy "Admins full access to product variants" on product_variants for all using (auth.role() = 'authenticated');
create policy "Admins full access to orders" on orders for all using (auth.role() = 'authenticated');
create policy "Admins full access to order items" on order_items for all using (auth.role() = 'authenticated');
create policy "Admins full access to enquiries" on enquiries for all using (auth.role() = 'authenticated');
create policy "Admins full access to site settings" on site_settings for all using (auth.role() = 'authenticated');
create policy "Admins full access to customers" on customers for all using (auth.role() = 'authenticated');

-- 15. SEED INITIAL OFFICIAL BUSINESS SETTINGS
insert into site_settings (setting_key, setting_value)
values (
  'general_config',
  '{
    "businessName": "NOVALUXE by Sennel",
    "businessCategory": "Cosmetics, beauty products, skincare, personal care, and everyday essentials",
    "location": "GSA Road, around the ELWA Roundabout, Monrovia, Liberia",
    "email": "sennelgroup@gmail.com",
    "whatsapp": "+1 (605) 941-3997",
    "whatsappRaw": "16059413997",
    "phoneNumbers": ["+231 88 851 8375", "+231 88 611 7880"],
    "currency": "$",
    "deliveryFee": 3.0,
    "pickupEnabled": true,
    "announcementText": "Welcome to NOVALUXE by Sennel • Monrovia, Liberia",
    "announcementEnabled": true,
    "heroHeadline": "Your Beauty. Your Essentials. Your NOVALUXE.",
    "heroSubtitle": "Discover beauty, personal care, and everyday essentials thoughtfully brought together for your lifestyle.",
    "instagramUrl": "https://www.instagram.com/sennel_bbm/",
    "tiktokUrl": "https://www.tiktok.com/@sennel_bbm"
  }'::jsonb
)
on conflict (setting_key) do update
set setting_value = excluded.setting_value;

-- 16. SEED INITIAL PRODUCT CATEGORIES
insert into categories (id, name, slug, description, image_url, display_order)
values
  ('11111111-1111-1111-1111-111111111101', 'Skincare', 'skincare', 'Nourishing cleansers, serums, hydrating creams, and skin elixirs.', '/src/assets/images/category_skincare_1792778552269.jpg', 1),
  ('11111111-1111-1111-1111-111111111102', 'Makeup', 'makeup', 'Satin lipsticks, luminous compacts, and vibrant cosmetic palettes.', '/src/assets/images/category_makeup_1792778553083.jpg', 2),
  ('11111111-1111-1111-1111-111111111103', 'Fragrances', 'fragrances', 'Captivating eau de parfums and signature scents crafted for lasting presence.', '/src/assets/images/category_fragrance_1792778553981.jpg', 3),
  ('11111111-1111-1111-1111-111111111104', 'Body Care', 'body-care', 'Ultra-rich botanical butters, nourishing oils, and silky body polishers.', '/src/assets/images/category_bodycare_1792778553219.jpg', 4),
  ('11111111-1111-1111-1111-111111111105', 'Hair Care', 'hair-care', 'Moisture treatments, botanical scalp elixirs, and restorative oils.', '/src/assets/images/category_skincare_1792778552269.jpg', 5),
  ('11111111-1111-1111-1111-111111111106', 'Personal Care', 'personal-care', 'Gentle daily cleansers, body washes, and refreshing hygiene essentials.', '/src/assets/images/category_bodycare_1792778553219.jpg', 6),
  ('11111111-1111-1111-1111-111111111107', 'Everyday Essentials', 'everyday-essentials', 'Thoughtfully selected wellness, beauty tools, and daily staples.', '/src/assets/images/hero_beauty_cosmetics_1792778552190.jpg', 7)
on conflict (slug) do nothing;

-- 17. SEED INITIAL PRODUCTS
insert into products (id, name, slug, description, price, currency, category_id, sku, stock_quantity, is_available, is_featured, is_new_arrival, is_best_seller)
values
  ('22222222-2222-2222-2222-222222222201', 'Avalon Éclat Eau de Parfum', 'avalon-eclat-eau-de-parfum', 'A warm, luminous fragrance with delicate top notes of sparkling bergamot and golden amber, descending into smooth cedarwood and velvety vanilla. Handcrafted for unforgettable allure.', 65.00, 'USD', '11111111-1111-1111-1111-111111111103', 'NVL-FRG-001', 18, true, true, false, true),
  ('22222222-2222-2222-2222-222222222202', 'Flora Botanical Hydrating Serum', 'flora-botanical-hydrating-serum', 'Infused with pure botanical elixir, multi-weight hyaluronic acid, and plant extracts. Restores natural skin barrier moisture, plumps fine lines, and imparts a dewy, youthful glow.', 34.00, 'USD', '11111111-1111-1111-1111-111111111101', 'NVL-SKN-002', 24, true, true, true, true),
  ('22222222-2222-2222-2222-222222222203', 'Flora Jasmine & Ceramide Daily Cream', 'flora-jasmine-ceramide-daily-cream', 'Ultra-nourishing daily facial moisturizer formulated with restorative ceramides, jasmine essence, and squalane. Light on the skin with deep 24-hour hydration.', 28.00, 'USD', '11111111-1111-1111-1111-111111111101', 'NVL-SKN-003', 30, true, true, false, true),
  ('22222222-2222-2222-2222-222222222204', 'Luxe Elixir Velvet Satin Lipstick', 'luxe-elixir-velvet-satin-lipstick', 'Rich, high-pigment satin formula encased in a weighted gold bullet. Glides smoothly across the lips with all-day comfortable wear and velvety botanical hydration.', 18.00, 'USD', '11111111-1111-1111-1111-111111111102', 'NVL-MKP-004', 42, true, true, true, false),
  ('22222222-2222-2222-2222-222222222205', 'Celestial Rose Gold Eyeshadow Palette', 'celestial-rose-gold-eyeshadow-palette', 'An exquisite nine-pan collection of buttery mattes, molten metallics, and radiant rose gold foils. Blendable, non-creasing textures designed for daytime subtlety or sultry evening drama.', 32.00, 'USD', '11111111-1111-1111-1111-111111111102', 'NVL-MKP-005', 15, true, true, false, true),
  ('22222222-2222-2222-2222-222222222206', 'Aura Eclipse Intense Parfum', 'aura-eclipse-intense-parfum', 'A deeply sophisticated artisanal fragrance presented in a multifaceted crystal decanter with brushed gold cap. Notes of dark plum, smoky oud, iris root, and warm amber resin.', 75.00, 'USD', '11111111-1111-1111-1111-111111111103', 'NVL-FRG-006', 12, true, true, true, false),
  ('22222222-2222-2222-2222-222222222207', 'Botanical Nourishment Organic Body Oil', 'botanical-nourishment-organic-body-oil', 'Cold-pressed golden jojoba, sea buckthorn, and sweet almond oil blended to lock in radiant suppleness. Leaves skin silky soft with zero greasy residue.', 24.00, 'USD', '11111111-1111-1111-1111-111111111104', 'NVL-BDY-007', 28, true, false, true, true),
  ('22222222-2222-2222-2222-222222222208', 'Plant & Petal Ultra-Rich Shea Body Butter', 'plant-petal-ultra-rich-shea-body-butter', 'Whipped raw African shea butter enriched with sweet jasmine flower extracts and virgin coconut oil. Deeply melts into dry skin for long-lasting hydration and velvet texture.', 22.00, 'USD', '11111111-1111-1111-1111-111111111104', 'NVL-BDY-008', 35, true, true, false, true)
on conflict (slug) do nothing;

-- 18. SUPABASE STORAGE BUCKET FOR PRODUCT IMAGES
-- Creates 'product-images' bucket for uploading and hosting product catalog images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Storage RLS Policies
create policy "Public Access to product-images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Allow upload to product-images" on storage.objects
  for insert with check (bucket_id = 'product-images');

create policy "Allow update to product-images" on storage.objects
  for update with check (bucket_id = 'product-images');

create policy "Allow delete from product-images" on storage.objects
  for delete using (bucket_id = 'product-images');

-- 19. SUPABASE STORAGE BUCKET FOR CATEGORY IMAGES
-- Creates 'category-images' bucket for uploading and hosting category banner/card images
insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do update set public = true;

create policy "Public Access to category-images" on storage.objects
  for select using (bucket_id = 'category-images');

create policy "Allow upload to category-images" on storage.objects
  for insert with check (bucket_id = 'category-images');

create policy "Allow update to category-images" on storage.objects
  for update with check (bucket_id = 'category-images');

create policy "Allow delete from category-images" on storage.objects
  for delete using (bucket_id = 'category-images');


