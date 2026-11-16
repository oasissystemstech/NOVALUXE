-- ==============================================================================
-- NOVALUXE BY SENNEL - OFFICIAL SUPABASE DATABASE SCHEMA (SECURITY AUDITED)
-- Business: Cosmetics, Beauty Products, Skincare & Everyday Essentials
-- Location: GSA Road, around ELWA Roundabout, Monrovia, Liberia
-- Safe to run on new projects or re-run idempotently without data loss.
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. AUTOMATIC TIMESTAMP TRIGGER FUNCTION
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

-- 3. CATEGORIES TABLE
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

-- 4. PRODUCTS TABLE
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

-- 5. PRODUCT IMAGES TABLE
create table if not exists public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. PRODUCT VARIANTS TABLE
create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_name text not null,
  variant_value text not null,
  price_adjustment numeric(10, 2) default 0.00,
  stock_quantity integer default 0 check (stock_quantity >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. CUSTOMERS TABLE
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ORDERS TABLE
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
  client_request_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders add column if not exists client_request_id text;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.update_updated_at_column();

-- 9. ORDER ITEMS TABLE (Immutable historical snapshot)
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

-- 10. ENQUIRIES TABLE
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

-- 11. SITE SETTINGS TABLE
create table if not exists public.site_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text unique not null,
  setting_value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_settings_updated_at on public.site_settings;
create trigger set_settings_updated_at
before update on public.site_settings
for each row execute function public.update_updated_at_column();

-- 12. ADMIN PROFILES TABLE
create table if not exists public.admin_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  role text default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. BULK UPLOAD HISTORY TABLE
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

-- 14. INTERNAL ORDER LOOKUP RATE-LIMIT / BRUTE-FORCE PROTECTION TABLE (ZERO PUBLIC ACCESS)
create table if not exists public.order_lookup_attempts (
  bucket_key text primary key,
  scope text not null default 'ip_ref',
  failed_count integer not null default 0,
  window_started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  locked_until timestamp with time zone
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_lookup_attempts' and column_name = 'order_reference'
  ) then
    alter table public.order_lookup_attempts drop constraint if exists order_lookup_attempts_pkey;
    alter table public.order_lookup_attempts alter column order_reference drop not null;
    alter table public.order_lookup_attempts add column if not exists bucket_key text;
    alter table public.order_lookup_attempts add column if not exists scope text not null default 'legacy';
    update public.order_lookup_attempts set bucket_key = 'ref:' || order_reference where bucket_key is null and order_reference is not null;
    delete from public.order_lookup_attempts where bucket_key is null;
    alter table public.order_lookup_attempts alter column bucket_key set not null;
    if not exists (
      select 1 from pg_constraint where conname = 'order_lookup_attempts_pkey' and conrelid = 'public.order_lookup_attempts'::regclass
    ) then
      alter table public.order_lookup_attempts add constraint order_lookup_attempts_pkey primary key (bucket_key);
    end if;
  end if;
end $$;

-- 15. INDEXES FOR HIGH-PERFORMANCE QUERIES
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_product_images_product on public.product_images(product_id);
create index if not exists idx_product_variants_product on public.product_variants(product_id);
create index if not exists idx_orders_reference on public.orders(order_reference);
create index if not exists idx_orders_customer_phone on public.orders(customer_phone);
create unique index if not exists idx_orders_client_request_id on public.orders(client_request_id) where client_request_id is not null;
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_admin_profiles_user_id on public.admin_profiles(user_id);
create index if not exists idx_bulk_upload_history_created_at on public.bulk_upload_history(created_at desc);
create index if not exists idx_order_lookup_attempts_window on public.order_lookup_attempts(window_started_at);

-- 16. REMOVE INSECURE LEGACY CHECKOUT HELPER & OLD FUNCTION OVERLOADS
drop function if exists public.order_is_pending_checkout(uuid);
drop function if exists public.lookup_order_by_reference(text, text);
drop function if exists public.lookup_order_by_reference(text, text, text);
drop function if exists public.create_checkout_order(text, text, text, text, text, text, text, jsonb, text);

-- 17. AUTHORIZATION, TRANSACTIONAL CHECKOUT & SECURE ORDER LOOKUP FUNCTIONS
-- Only authenticated Supabase users listed in public.admin_profiles with role 'admin' or 'super_admin' are authorized.
create or replace function public.is_novaluxe_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_novaluxe_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.role = 'super_admin'
  );
$$;

-- Secure cross-instance customer order lookup:
--   1. Requires exact order_reference and exact normalized full customer phone digits (no partial fallback).
--   2. Durable multi-tier rate limiting in public.order_lookup_attempts across separate serverless instances:
--      * ip:<hash>          -> max 12 attempts per 5 minutes (prevents single-IP enumeration)
--      * ipref:<hash>:<ref> -> max 5 failures per 15 minutes (isolates attacker IP without locking real customer)
--      * ref:<ref>          -> max 20 failures per 10 minutes -> short bounded 30s cooldown (never indefinite DoS lock)
--   3. Safe bounded cleanup of expired attempt records (> 24 hours).
--   4. Returns minimal order status & item summary only — NO street address, phone, email, notes, or customer name.
create or replace function public.lookup_order_by_reference(
  p_order_reference text,
  p_customer_phone text,
  p_client_ip text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ref text := upper(trim(coalesce(p_order_reference, '')));
  v_phone_digits text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_hdr_ip text := '';
  v_ip_source text;
  v_ip_hash text;
  v_ip_bucket text;
  v_ipref_bucket text;
  v_ref_bucket text;
  v_bucket record;
  v_ip_count integer;
  v_order record;
  v_order_phone_digits text;
  v_items jsonb;
begin
  if length(v_ref) < 6 or length(v_phone_digits) < 7 then
    return null;
  end if;

  -- Bounded expiry cleanup (removes up to 100 expired rows older than 24 hours)
  delete from public.order_lookup_attempts
  where bucket_key in (
    select ola.bucket_key
    from public.order_lookup_attempts ola
    where ola.window_started_at < v_now - interval '24 hours'
      and (ola.locked_until is null or ola.locked_until < v_now)
    limit 100
  );

  begin
    v_hdr_ip := coalesce(
      nullif(trim((current_setting('request.headers', true)::jsonb)->>'x-real-ip'), ''),
      nullif(trim(split_part(coalesce((current_setting('request.headers', true)::jsonb)->>'x-forwarded-for', ''), ',', 1)), ''),
      ''
    );
  exception when others then
    v_hdr_ip := '';
  end;

  v_ip_source := coalesce(nullif(trim(coalesce(p_client_ip, '')), ''), nullif(v_hdr_ip, ''), 'direct-rpc');
  v_ip_hash := md5(v_ip_source);

  v_ip_bucket := 'ip:' || v_ip_hash;
  v_ipref_bucket := 'ipref:' || v_ip_hash || ':' || v_ref;
  v_ref_bucket := 'ref:' || v_ref;

  -- 1. Check & increment per-IP global sliding window (12 requests / 5 min)
  select * into v_bucket
  from public.order_lookup_attempts
  where bucket_key = v_ip_bucket
  for update;

  if found and v_bucket.locked_until is not null and v_bucket.locked_until > v_now then
    return jsonb_build_object(
      'rateLimited', true,
      'retryAfterSec', greatest(1, ceil(extract(epoch from (v_bucket.locked_until - v_now)))::integer)
    );
  end if;

  if not found or v_bucket.window_started_at < v_now - interval '5 minutes' then
    v_ip_count := 1;
    insert into public.order_lookup_attempts (bucket_key, scope, failed_count, window_started_at, locked_until)
    values (v_ip_bucket, 'ip', 1, v_now, null)
    on conflict (bucket_key) do update
    set scope = 'ip',
        failed_count = 1,
        window_started_at = v_now,
        locked_until = null;
  else
    v_ip_count := v_bucket.failed_count + 1;
    if v_ip_count > 12 then
      update public.order_lookup_attempts
      set locked_until = v_now + interval '5 minutes'
      where bucket_key = v_ip_bucket;
      return jsonb_build_object('rateLimited', true, 'retryAfterSec', 300);
    end if;

    update public.order_lookup_attempts
    set failed_count = v_ip_count
    where bucket_key = v_ip_bucket;
  end if;

  -- 2. Check per-(IP + order_reference) lockout (5 failures / 15 min)
  select * into v_bucket
  from public.order_lookup_attempts
  where bucket_key = v_ipref_bucket
  for update;

  if found and v_bucket.locked_until is not null and v_bucket.locked_until > v_now then
    return jsonb_build_object(
      'rateLimited', true,
      'retryAfterSec', greatest(1, ceil(extract(epoch from (v_bucket.locked_until - v_now)))::integer)
    );
  end if;

  -- 3. Check short bounded per-reference cooldown (only active during distributed multi-IP spikes; never extended while locked)
  select * into v_bucket
  from public.order_lookup_attempts
  where bucket_key = v_ref_bucket
  for update;

  if found and v_bucket.locked_until is not null and v_bucket.locked_until > v_now then
    return jsonb_build_object(
      'rateLimited', true,
      'retryAfterSec', greatest(1, ceil(extract(epoch from (v_bucket.locked_until - v_now)))::integer)
    );
  end if;

  -- 4. Verify order reference & exact normalized full phone digits
  select
    o.id,
    o.order_reference,
    o.customer_phone,
    o.delivery_location,
    o.delivery_method,
    o.delivery_fee,
    o.subtotal,
    o.total_amount,
    o.currency,
    o.order_status,
    o.payment_status,
    o.created_at,
    o.updated_at
  into v_order
  from public.orders o
  where upper(o.order_reference) = v_ref
  limit 1;

  v_order_phone_digits := case
    when found then regexp_replace(coalesce(v_order.customer_phone, ''), '\D', '', 'g')
    else ''
  end;

  if not found or v_order_phone_digits = '' or v_order_phone_digits <> v_phone_digits then
    -- Record failure in isolated per-(IP + ref) bucket
    insert into public.order_lookup_attempts (bucket_key, scope, failed_count, window_started_at, locked_until)
    values (v_ipref_bucket, 'ip_ref', 1, v_now, null)
    on conflict (bucket_key) do update
    set
      scope = 'ip_ref',
      failed_count = case
        when public.order_lookup_attempts.window_started_at < v_now - interval '15 minutes' then 1
        else public.order_lookup_attempts.failed_count + 1
      end,
      window_started_at = case
        when public.order_lookup_attempts.window_started_at < v_now - interval '15 minutes' then v_now
        else public.order_lookup_attempts.window_started_at
      end,
      locked_until = case
        when (
          case
            when public.order_lookup_attempts.window_started_at < v_now - interval '15 minutes' then 1
            else public.order_lookup_attempts.failed_count + 1
          end
        ) >= 5 then v_now + interval '15 minutes'
        else null
      end;

    -- Record failure in global distributed ref bucket with short bounded 30s cooldown after 20 failures / 10 min
    insert into public.order_lookup_attempts (bucket_key, scope, failed_count, window_started_at, locked_until)
    values (v_ref_bucket, 'ref', 1, v_now, null)
    on conflict (bucket_key) do update
    set
      scope = 'ref',
      failed_count = case
        when public.order_lookup_attempts.window_started_at < v_now - interval '10 minutes'
          or (public.order_lookup_attempts.locked_until is not null and public.order_lookup_attempts.locked_until <= v_now)
        then 1
        else public.order_lookup_attempts.failed_count + 1
      end,
      window_started_at = case
        when public.order_lookup_attempts.window_started_at < v_now - interval '10 minutes'
          or (public.order_lookup_attempts.locked_until is not null and public.order_lookup_attempts.locked_until <= v_now)
        then v_now
        else public.order_lookup_attempts.window_started_at
      end,
      locked_until = case
        when (
          case
            when public.order_lookup_attempts.window_started_at < v_now - interval '10 minutes'
              or (public.order_lookup_attempts.locked_until is not null and public.order_lookup_attempts.locked_until <= v_now)
            then 1
            else public.order_lookup_attempts.failed_count + 1
          end
        ) >= 20 then v_now + interval '30 seconds'
        else null
      end;

    return null;
  end if;

  -- Successful exact phone verification clears failure counters for this IP+ref and ref
  delete from public.order_lookup_attempts where bucket_key in (v_ipref_bucket, v_ref_bucket);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'productName', oi.product_name,
        'selectedVariant', oi.selected_variant,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'subtotal', oi.subtotal
      )
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'orderReference', v_order.order_reference,
    'orderStatus', v_order.order_status,
    'paymentStatus', v_order.payment_status,
    'deliveryMethod', v_order.delivery_method,
    'deliveryLocation', v_order.delivery_location,
    'deliveryFee', v_order.delivery_fee,
    'subtotal', v_order.subtotal,
    'totalAmount', v_order.total_amount,
    'currency', v_order.currency,
    'createdAt', v_order.created_at,
    'updatedAt', v_order.updated_at,
    'items', v_items
  );
end;
$$;

-- Atomic server-authoritative transactional checkout RPC:
--   * Requires mandatory p_client_request_id and serializes concurrent retries with pg_advisory_xact_lock.
--   * Legitimate idempotent retry returns the original committed order without deducting stock again.
--   * Ignores all client-submitted prices, totals, delivery fees, and statuses.
--   * Requires variant selection whenever product_variants has rows for the product, validates variant against product_id,
--     and deducts both product_variants.stock_quantity and products.stock_quantity safely with >= check under FOR UPDATE lock.
create or replace function public.create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_delivery_location text default '',
  p_delivery_address text default '',
  p_delivery_method text default 'Delivery',
  p_customer_notes text default null,
  p_items jsonb default '[]'::jsonb,
  p_client_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := trim(coalesce(p_customer_phone, ''));
  v_phone_digits text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_email text := nullif(trim(coalesce(p_customer_email, '')), '');
  v_method text := trim(coalesce(p_delivery_method, 'Delivery'));
  v_notes text := nullif(trim(coalesce(p_customer_notes, '')), '');
  v_req_id text := nullif(trim(coalesce(p_client_request_id, '')), '');
  v_location text;
  v_address text;
  v_config jsonb;
  v_currency text := '$';
  v_pickup_enabled boolean := true;
  v_delivery_fee numeric(10, 2) := 0.00;
  v_subtotal numeric(10, 2) := 0.00;
  v_total numeric(10, 2) := 0.00;
  v_item jsonb;
  v_qty integer;
  v_product_id_raw text;
  v_product_slug_raw text;
  v_variant_id_raw text;
  v_variant_name_raw text;
  v_variant_value_raw text;
  v_product record;
  v_variant record;
  v_has_variants boolean;
  v_price_adj numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_line_subtotal numeric(10, 2);
  v_selected_variant text;
  v_validated_items jsonb := '[]'::jsonb;
  v_existing_order record;
  v_existing_items jsonb;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_ref text;
  v_persisted_items jsonb;
  v_now timestamp with time zone := timezone('utc'::text, now());
begin
  -- Validate mandatory request idempotency key and customer parameters
  if v_req_id is null or length(v_req_id) < 8 or length(v_req_id) > 128 then
    raise exception 'A valid client request ID (8-128 characters) is required for checkout.' using errcode = '22023';
  end if;

  if length(v_name) < 2 then
    raise exception 'Customer full name must be at least 2 characters.' using errcode = '22023';
  end if;

  if length(v_phone_digits) < 7 then
    raise exception 'Please provide a valid customer phone number (minimum 7 digits).' using errcode = '22023';
  end if;

  if v_method not in ('Delivery', 'Pickup') then
    raise exception 'Invalid delivery method. Must be Delivery or Pickup.' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must include at least one item.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Order exceeds maximum permitted line items (50).' using errcode = '22023';
  end if;

  -- Serialize concurrent transactions sharing the same client_request_id
  perform pg_advisory_xact_lock(7042, hashtext(v_req_id));

  select *
  into v_existing_order
  from public.orders o
  where o.client_request_id = v_req_id
  limit 1;

  if found then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'orderId', oi.order_id,
          'productId', oi.product_id,
          'productName', oi.product_name,
          'selectedVariant', oi.selected_variant,
          'quantity', oi.quantity,
          'unitPrice', oi.unit_price,
          'subtotal', oi.subtotal
        )
      ),
      '[]'::jsonb
    )
    into v_existing_items
    from public.order_items oi
    where oi.order_id = v_existing_order.id;

    if regexp_replace(coalesce(v_existing_order.customer_phone, ''), '\D', '', 'g') <> v_phone_digits
       or v_existing_order.delivery_method <> v_method
       or jsonb_array_length(v_existing_items) <> jsonb_array_length(p_items) then
      raise exception 'Conflicting order details submitted with an existing checkout request ID.' using errcode = '23505';
    end if;

    return jsonb_build_object(
      'id', v_existing_order.id,
      'orderReference', v_existing_order.order_reference,
      'customerId', v_existing_order.customer_id,
      'customerName', v_existing_order.customer_name,
      'customerPhone', v_existing_order.customer_phone,
      'customerEmail', v_existing_order.customer_email,
      'deliveryLocation', v_existing_order.delivery_location,
      'deliveryAddress', v_existing_order.delivery_address,
      'deliveryMethod', v_existing_order.delivery_method,
      'deliveryFee', v_existing_order.delivery_fee,
      'subtotal', v_existing_order.subtotal,
      'totalAmount', v_existing_order.total_amount,
      'currency', v_existing_order.currency,
      'orderStatus', v_existing_order.order_status,
      'paymentStatus', v_existing_order.payment_status,
      'customerNotes', v_existing_order.customer_notes,
      'createdAt', v_existing_order.created_at,
      'updatedAt', v_existing_order.updated_at,
      'idempotentReplay', true,
      'items', v_existing_items
    );
  end if;

  -- Load authoritative business settings
  select setting_value
  into v_config
  from public.site_settings
  where setting_key = 'general_config'
  limit 1;

  v_currency := coalesce(nullif(trim(v_config->>'currency'), ''), '$');
  v_pickup_enabled := coalesce((v_config->>'pickupEnabled')::boolean, true);

  if v_method = 'Pickup' then
    if not v_pickup_enabled then
      raise exception 'Store counter pickup is currently disabled.' using errcode = '22023';
    end if;
    v_delivery_fee := 0.00;
    v_location := 'Store Counter (ELWA Roundabout)';
    v_address := 'NOVALUXE by Sennel Store Counter, GSA Road near ELWA Roundabout, Monrovia';
  else
    v_location := trim(coalesce(p_delivery_location, ''));
    v_address := trim(coalesce(p_delivery_address, ''));
    if length(v_location) < 2 or length(v_address) < 3 then
      raise exception 'Delivery location and street address are required for local delivery.' using errcode = '22023';
    end if;
    v_delivery_fee := greatest(0.00, coalesce((v_config->>'deliveryFee')::numeric(10, 2), 3.00));
  end if;

  -- Validate every line item against authoritative DB prices & lock inventory
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 or v_qty > 100 then
      raise exception 'Item quantity must be between 1 and 100.' using errcode = '22023';
    end if;

    v_product_id_raw := trim(coalesce(v_item->>'productId', ''));
    v_product_slug_raw := trim(coalesce(v_item->>'slug', ''));
    v_variant_id_raw := trim(coalesce(v_item->>'variantId', ''));
    v_variant_name_raw := trim(coalesce(v_item->>'variantName', ''));
    v_variant_value_raw := trim(coalesce(v_item->>'variantValue', ''));

    v_product := null;

    if v_product_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into v_product
      from public.products p
      where p.id = v_product_id_raw::uuid
      for update;
    end if;

    if v_product.id is null and v_product_slug_raw <> '' then
      select * into v_product
      from public.products p
      where p.slug = v_product_slug_raw
      for update;
    end if;

    if v_product.id is null then
      raise exception 'Requested product was not found in the live catalog.' using errcode = '22023';
    end if;

    if not coalesce(v_product.is_available, false) then
      raise exception 'Product "%" is currently unavailable.', v_product.name using errcode = '22023';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Insufficient stock for "%". Available: %.', v_product.name, v_product.stock_quantity using errcode = '22023';
    end if;

    v_price_adj := 0.00;
    v_selected_variant := null;

    select exists(
      select 1 from public.product_variants pv where pv.product_id = v_product.id
    ) into v_has_variants;

    if v_has_variants then
      if v_variant_id_raw = '' and v_variant_value_raw = '' then
        raise exception 'Please select a valid variant option for "%".', v_product.name using errcode = '22023';
      end if;

      v_variant := null;

      if v_variant_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select * into v_variant
        from public.product_variants pv
        where pv.id = v_variant_id_raw::uuid and pv.product_id = v_product.id
        for update;
      end if;

      if v_variant.id is null and v_variant_value_raw <> '' then
        select * into v_variant
        from public.product_variants pv
        where pv.product_id = v_product.id
          and lower(pv.variant_value) = lower(v_variant_value_raw)
          and (v_variant_name_raw = '' or lower(pv.variant_name) = lower(v_variant_name_raw))
        for update;
      end if;

      if v_variant.id is null then
        raise exception 'Invalid variant selected for "%".', v_product.name using errcode = '22023';
      end if;

      if v_variant.stock_quantity < v_qty then
        raise exception 'Insufficient stock for "%" (%). Available: %.', v_product.name, v_variant.variant_value, v_variant.stock_quantity using errcode = '22023';
      end if;

      v_price_adj := coalesce(v_variant.price_adjustment, 0.00);
      v_selected_variant := v_variant.variant_name || ': ' || v_variant.variant_value;

      update public.product_variants
      set stock_quantity = stock_quantity - v_qty
      where id = v_variant.id and stock_quantity >= v_qty;

      if not found then
        raise exception 'Insufficient variant stock for "%" (%).', v_product.name, v_variant.variant_value using errcode = '22023';
      end if;
    else
      if v_variant_id_raw <> '' or v_variant_value_raw <> '' then
        raise exception 'Product "%" does not support selectable variants.', v_product.name using errcode = '22023';
      end if;
    end if;

    v_unit_price := round(v_product.price + v_price_adj, 2);
    if v_unit_price < 0 then
      raise exception 'Invalid calculated product price for "%".', v_product.name using errcode = '22023';
    end if;

    v_line_subtotal := round(v_unit_price * v_qty, 2);
    v_subtotal := round(v_subtotal + v_line_subtotal, 2);

    update public.products
    set stock_quantity = stock_quantity - v_qty
    where id = v_product.id and stock_quantity >= v_qty;

    if not found then
      raise exception 'Insufficient stock for "%".', v_product.name using errcode = '22023';
    end if;

    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'productName', v_product.name,
        'selectedVariant', v_selected_variant,
        'quantity', v_qty,
        'unitPrice', v_unit_price,
        'subtotal', v_line_subtotal
      )
    );
  end loop;

  v_total := round(v_subtotal + v_delivery_fee, 2);
  v_order_ref := 'NVL-' || to_char(v_now, 'YYYY') || '-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 6));

  -- Atomically insert customer, order, and order_items
  insert into public.customers (full_name, phone, email)
  values (v_name, v_phone, v_email)
  returning id into v_customer_id;

  insert into public.orders (
    order_reference,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    delivery_location,
    delivery_address,
    delivery_method,
    delivery_fee,
    subtotal,
    total_amount,
    currency,
    order_status,
    payment_status,
    customer_notes,
    client_request_id
  ) values (
    v_order_ref,
    v_customer_id,
    v_name,
    v_phone,
    v_email,
    v_location,
    v_address,
    v_method,
    v_delivery_fee,
    v_subtotal,
    v_total,
    v_currency,
    'Confirmed',
    'Pending Verification',
    v_notes,
    v_req_id
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    selected_variant,
    quantity,
    unit_price,
    subtotal
  )
  select
    v_order_id,
    (elem->>'productId')::uuid,
    elem->>'productName',
    nullif(elem->>'selectedVariant', ''),
    (elem->>'quantity')::integer,
    (elem->>'unitPrice')::numeric(10, 2),
    (elem->>'subtotal')::numeric(10, 2)
  from jsonb_array_elements(v_validated_items) as elem;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'orderId', oi.order_id,
        'productId', oi.product_id,
        'productName', oi.product_name,
        'selectedVariant', oi.selected_variant,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'subtotal', oi.subtotal
      )
    ),
    '[]'::jsonb
  )
  into v_persisted_items
  from public.order_items oi
  where oi.order_id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'orderReference', v_order_ref,
    'customerId', v_customer_id,
    'customerName', v_name,
    'customerPhone', v_phone,
    'customerEmail', v_email,
    'deliveryLocation', v_location,
    'deliveryAddress', v_address,
    'deliveryMethod', v_method,
    'deliveryFee', v_delivery_fee,
    'subtotal', v_subtotal,
    'totalAmount', v_total,
    'currency', v_currency,
    'orderStatus', 'Confirmed',
    'paymentStatus', 'Pending Verification',
    'customerNotes', v_notes,
    'createdAt', v_now,
    'updatedAt', v_now,
    'idempotentReplay', false,
    'items', v_persisted_items
  );
end;
$$;

-- Least-privilege function EXECUTE grants:
--   * Trigger helper and admin helpers cannot be executed by PUBLIC or anon directly.
--   * Public checkout and order-tracking RPCs are strictly scoped for anon, authenticated, and service_role.
revoke all on function public.update_updated_at_column() from public, anon;

revoke all on function public.is_novaluxe_admin() from public, anon;
grant execute on function public.is_novaluxe_admin() to authenticated, service_role;

revoke all on function public.is_novaluxe_super_admin() from public, anon;
grant execute on function public.is_novaluxe_super_admin() to authenticated, service_role;

revoke all on function public.lookup_order_by_reference(text, text, text) from public;
grant execute on function public.lookup_order_by_reference(text, text, text) to anon, authenticated, service_role;

revoke all on function public.create_checkout_order(text, text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_checkout_order(text, text, text, text, text, text, text, jsonb, text) to anon, authenticated, service_role;

-- 18. ENABLE ROW LEVEL SECURITY (RLS) ON ALL NOVALUXE TABLES
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.enquiries enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.bulk_upload_history enable row level security;
alter table public.order_lookup_attempts enable row level security;

revoke all on table public.order_lookup_attempts from anon, authenticated;

-- 19. COMPLETE PG_POLICIES AUDIT CLEANUP (REMOVES ALL OBSOLETE/PERMISSIVE POLICIES ON NOVALUXE TABLES ONLY)
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'categories',
        'products',
        'product_images',
        'product_variants',
        'customers',
        'orders',
        'order_items',
        'enquiries',
        'site_settings',
        'admin_profiles',
        'bulk_upload_history',
        'order_lookup_attempts'
      )
  loop
    execute format('drop policy if exists %I on %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname ~* '(product-images|category-images|promotional-assets)'
        or coalesce(qual, '') ~* '(product-images|category-images|promotional-assets)'
        or coalesce(with_check, '') ~* '(product-images|category-images|promotional-assets)'
      )
  loop
    execute format('drop policy if exists %I on %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 20. HARDENED ROW LEVEL SECURITY POLICIES
-- CATEGORIES (Anon reads active only; Authenticated sees active or all if NOVALUXE admin)
create policy "Anon can view active categories"
  on public.categories for select to anon
  using (is_active = true);

create policy "Authenticated can view categories"
  on public.categories for select to authenticated
  using (is_active = true or public.is_novaluxe_admin());

create policy "Admins can insert categories"
  on public.categories for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update categories"
  on public.categories for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using (public.is_novaluxe_admin());

-- PRODUCTS
create policy "Anon can view available products"
  on public.products for select to anon
  using (is_available = true);

create policy "Authenticated can view products"
  on public.products for select to authenticated
  using (is_available = true or public.is_novaluxe_admin());

create policy "Admins can insert products"
  on public.products for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update products"
  on public.products for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete products"
  on public.products for delete to authenticated
  using (public.is_novaluxe_admin());

-- PRODUCT IMAGES
create policy "Anon can view available product images"
  on public.product_images for select to anon
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_available = true
    )
  );

create policy "Authenticated can view product images"
  on public.product_images for select to authenticated
  using (
    public.is_novaluxe_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_available = true
    )
  );

create policy "Admins can insert product images"
  on public.product_images for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update product images"
  on public.product_images for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete product images"
  on public.product_images for delete to authenticated
  using (public.is_novaluxe_admin());

-- PRODUCT VARIANTS
create policy "Anon can view available product variants"
  on public.product_variants for select to anon
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_available = true
    )
  );

create policy "Authenticated can view product variants"
  on public.product_variants for select to authenticated
  using (
    public.is_novaluxe_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_available = true
    )
  );

create policy "Admins can insert product variants"
  on public.product_variants for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update product variants"
  on public.product_variants for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete product variants"
  on public.product_variants for delete to authenticated
  using (public.is_novaluxe_admin());

-- SITE SETTINGS
create policy "Anon can view public site settings"
  on public.site_settings for select to anon
  using (setting_key in ('general_config', 'public_config'));

create policy "Authenticated can view site settings"
  on public.site_settings for select to authenticated
  using (
    setting_key in ('general_config', 'public_config')
    or public.is_novaluxe_admin()
  );

create policy "Admins can insert site settings"
  on public.site_settings for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update site settings"
  on public.site_settings for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete site settings"
  on public.site_settings for delete to authenticated
  using (public.is_novaluxe_admin());

-- CUSTOMERS (Admin-only direct table access; public checkout writes atomically via create_checkout_order RPC)
create policy "Admins can view customers"
  on public.customers for select to authenticated
  using (public.is_novaluxe_admin());

create policy "Admins can insert customers"
  on public.customers for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update customers"
  on public.customers for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete customers"
  on public.customers for delete to authenticated
  using (public.is_novaluxe_admin());

-- ORDERS (Admin-only direct table access; checkout uses create_checkout_order RPC; tracking uses lookup_order_by_reference RPC)
create policy "Admins can view orders"
  on public.orders for select to authenticated
  using (public.is_novaluxe_admin());

create policy "Admins can insert orders"
  on public.orders for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update orders"
  on public.orders for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete orders"
  on public.orders for delete to authenticated
  using (public.is_novaluxe_admin());

-- ORDER ITEMS (Admin-only direct table access; checkout writes atomically inside create_checkout_order RPC)
create policy "Admins can view order items"
  on public.order_items for select to authenticated
  using (public.is_novaluxe_admin());

create policy "Admins can insert order items"
  on public.order_items for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update order items"
  on public.order_items for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete order items"
  on public.order_items for delete to authenticated
  using (public.is_novaluxe_admin());

-- ENQUIRIES (Validated public insert with status = 'New'; read/update/delete restricted to NOVALUXE admins)
create policy "Admins can view enquiries"
  on public.enquiries for select to authenticated
  using (public.is_novaluxe_admin());

create policy "Anon can submit enquiries"
  on public.enquiries for insert to anon
  with check (
    length(trim(full_name)) >= 2
    and length(regexp_replace(phone, '\D', '', 'g')) >= 6
    and length(trim(subject)) >= 2
    and length(trim(message)) >= 5
    and coalesce(status, 'New') = 'New'
  );

create policy "Authenticated can submit enquiries"
  on public.enquiries for insert to authenticated
  with check (
    public.is_novaluxe_admin()
    or (
      length(trim(full_name)) >= 2
      and length(regexp_replace(phone, '\D', '', 'g')) >= 6
      and length(trim(subject)) >= 2
      and length(trim(message)) >= 5
      and coalesce(status, 'New') = 'New'
    )
  );

create policy "Admins can update enquiries"
  on public.enquiries for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete enquiries"
  on public.enquiries for delete to authenticated
  using (public.is_novaluxe_admin());

-- ADMIN PROFILES (Users can inspect only their own row; only super_admin can mutate)
create policy "Authenticated user can view own admin profile"
  on public.admin_profiles for select to authenticated
  using (auth.uid() = user_id or public.is_novaluxe_super_admin());

create policy "Super admins can insert admin profiles"
  on public.admin_profiles for insert to authenticated
  with check (public.is_novaluxe_super_admin());

create policy "Super admins can update admin profiles"
  on public.admin_profiles for update to authenticated
  using (public.is_novaluxe_super_admin())
  with check (public.is_novaluxe_super_admin());

create policy "Super admins can delete admin profiles"
  on public.admin_profiles for delete to authenticated
  using (public.is_novaluxe_super_admin());

-- BULK UPLOAD HISTORY (Strictly NOVALUXE admins only)
create policy "Admins can view bulk upload history"
  on public.bulk_upload_history for select to authenticated
  using (public.is_novaluxe_admin());

create policy "Admins can insert bulk upload history"
  on public.bulk_upload_history for insert to authenticated
  with check (public.is_novaluxe_admin());

create policy "Admins can update bulk upload history"
  on public.bulk_upload_history for update to authenticated
  using (public.is_novaluxe_admin())
  with check (public.is_novaluxe_admin());

create policy "Admins can delete bulk upload history"
  on public.bulk_upload_history for delete to authenticated
  using (public.is_novaluxe_admin());

-- 21. SUPABASE STORAGE BUCKETS & HARDENED POLICIES
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('category-images', 'category-images', true),
  ('promotional-assets', 'promotional-assets', true)
on conflict (id) do update set public = true;

-- product-images: public read for storefront assets; admin-only upload/update/delete
create policy "Public Access to product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins can upload to product-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_novaluxe_admin());

create policy "Admins can update product-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_novaluxe_admin())
  with check (bucket_id = 'product-images' and public.is_novaluxe_admin());

create policy "Admins can delete from product-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_novaluxe_admin());

-- category-images: public read for storefront assets; admin-only upload/update/delete
create policy "Public Access to category-images"
  on storage.objects for select
  using (bucket_id = 'category-images');

create policy "Admins can upload to category-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'category-images' and public.is_novaluxe_admin());

create policy "Admins can update category-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'category-images' and public.is_novaluxe_admin())
  with check (bucket_id = 'category-images' and public.is_novaluxe_admin());

create policy "Admins can delete from category-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'category-images' and public.is_novaluxe_admin());

-- promotional-assets: public read for storefront promotional pop-up media; admin-only upload/update/delete
create policy "Public Access to promotional-assets"
  on storage.objects for select
  using (bucket_id = 'promotional-assets');

create policy "Admins can upload to promotional-assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'promotional-assets' and public.is_novaluxe_admin());

create policy "Admins can update promotional-assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'promotional-assets' and public.is_novaluxe_admin())
  with check (bucket_id = 'promotional-assets' and public.is_novaluxe_admin());

create policy "Admins can delete from promotional-assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'promotional-assets' and public.is_novaluxe_admin());

-- 22. NON-DESTRUCTIVE SEED OF INITIAL SITE SETTINGS (PRESERVES EXISTING CONFIG)
insert into public.site_settings (setting_key, setting_value)
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
    "heroImage": "/images/hero/hero_beauty_cosmetics.jpg",
    "instagramUrl": "https://www.instagram.com/sennel_bbm/",
    "tiktokUrl": "https://www.tiktok.com/@sennel_bbm",
    "promoCampaign": {
      "enabled": true,
      "mediaType": "video",
      "mediaUrl": "/videos/novaluxe-promo.mp4",
      "posterUrl": "/images/hero/hero_beauty_cosmetics.jpg",
      "title": "NOVALUXE by Sennel",
      "subtitle": "Elevate your daily routine with curated cosmetics, skincare, and luxury fragrances in Monrovia.",
      "ctaText": "EXPLORE NOVALUXE",
      "destinationPath": "/shop",
      "frequency": "once_per_session",
      "startDate": "",
      "endDate": ""
    }
  }'::jsonb
)
on conflict (setting_key) do nothing;

-- 23. SEED INITIAL PRODUCT CATEGORIES WITH VERIFIED /images/ DEPLOYMENT ASSETS
insert into public.categories (id, name, slug, description, image_url, display_order)
values
  ('11111111-1111-1111-1111-111111111101', 'Skincare', 'skincare', 'Nourishing cleansers, serums, hydrating creams, and skin elixirs.', '/images/categories/skincare.jpg', 1),
  ('11111111-1111-1111-1111-111111111102', 'Makeup', 'makeup', 'Satin lipsticks, luminous compacts, and vibrant cosmetic palettes.', '/images/categories/makeup.jpg', 2),
  ('11111111-1111-1111-1111-111111111103', 'Fragrances', 'fragrances', 'Captivating eau de parfums and signature scents crafted for lasting presence.', '/images/categories/fragrances.jpg', 3),
  ('11111111-1111-1111-1111-111111111104', 'Body Care', 'body-care', 'Ultra-rich botanical butters, nourishing oils, and silky body polishers.', '/images/categories/bodycare.jpg', 4),
  ('11111111-1111-1111-1111-111111111105', 'Hair Care', 'hair-care', 'Moisture treatments, botanical scalp elixirs, and restorative oils.', '/images/categories/bodycare.jpg', 5),
  ('11111111-1111-1111-1111-111111111106', 'Personal Care', 'personal-care', 'Gentle daily cleansers, body washes, and refreshing hygiene essentials.', '/images/categories/bodycare.jpg', 6),
  ('11111111-1111-1111-1111-111111111107', 'Everyday Essentials', 'everyday-essentials', 'Thoughtfully selected wellness, beauty tools, and daily staples.', '/images/hero/hero_beauty_cosmetics.jpg', 7)
on conflict (slug) do nothing;

-- Repair ONLY known legacy /src/assets/images/ references into verified deployed /images/ assets
update public.categories
set image_url = case
  when image_url like '%category_skincare%' then '/images/categories/skincare.jpg'
  when image_url like '%category_makeup%' then '/images/categories/makeup.jpg'
  when image_url like '%category_fragrance%' then '/images/categories/fragrances.jpg'
  when image_url like '%category_bodycare%' then '/images/categories/bodycare.jpg'
  when image_url like '%hero_beauty_cosmetics%' then '/images/hero/hero_beauty_cosmetics.jpg'
  when image_url like '%mercy_sennel_jolo_hero_cutout%' then '/images/ceo/mercy_sennel_jolo_hero_cutout.png'
  when image_url like '%mercy_sennel_jolo%' then '/images/ceo/mercy_sennel_jolo_ceo.jpeg'
  else image_url
end
where image_url like '/src/assets/images/%';

-- 24. SEED INITIAL PRODUCTS, DEFAULT VERIFIED IMAGES & PRODUCT VARIANTS (NON-DESTRUCTIVE)
insert into public.products (id, name, slug, description, price, currency, category_id, sku, stock_quantity, is_available, is_featured, is_new_arrival, is_best_seller)
values
  ('22222222-2222-2222-2222-222222222201', 'Avalon Éclat Eau de Parfum', 'avalon-eclat-eau-de-parfum', 'A warm, luminous fragrance with delicate top notes of sparkling bergamot and golden amber, descending into smooth cedarwood and velvety vanilla. Handcrafted for unforgettable allure.', 65.00, 'USD', '11111111-1111-1111-1111-111111111103', 'NVL-FRG-001', 18, true, true, false, true),
  ('22222222-2222-2222-2222-222222222202', 'Flora Botanical Hydrating Serum', 'flora-botanical-hydrating-serum', 'Infused with pure botanical elixir, multi-weight hyaluronic acid, and plant extracts. Restores natural skin barrier moisture, plumps fine lines, and imparts a dewy, youthful glow.', 34.00, 'USD', '11111111-1111-1111-1111-111111111101', 'NVL-SKN-002', 24, true, true, true, true),
  ('22222222-2222-2222-2222-222222222203', 'Flora Jasmine & Ceramide Daily Cream', 'flora-jasmine-ceramide-daily-cream', 'Ultra-nourishing daily facial moisturizer formulated with restorative ceramides, jasmine essence, and squalane. Light on the skin with deep 24-hour hydration.', 28.00, 'USD', '11111111-1111-1111-1111-111111111101', 'NVL-SKN-003', 30, true, true, false, true),
  ('22222222-2222-2222-2222-222222222204', 'Luxe Elixir Velvet Satin Lipstick', 'luxe-elixir-velvet-satin-lipstick', 'Rich, high-pigment satin formula encased in a weighted gold bullet. Glides smoothly across the lips with all-day comfortable wear and velvety botanical hydration.', 18.00, 'USD', '11111111-1111-1111-1111-111111111102', 'NVL-MKP-004', 42, true, true, true, false),
  ('22222222-2222-2222-2222-222222222205', 'Celestial Rose Gold Eyeshadow Palette', 'celestial-rose-gold-eyeshadow-palette', 'An exquisite nine-pan collection of buttery mattes, molten metallics, and radiant rose gold foils. Blendable, non-creasing textures designed for daytime subtlety or sultry evening drama.', 32.00, 'USD', '11111111-1111-1111-1111-111111111102', 'NVL-MKP-005', 15, true, true, false, true),
  ('22222222-2222-2222-2222-222222222206', 'Aura Eclipse Intense Parfum', 'aura-eclipse-intense-parfum', 'A deeply sophisticated artisanal fragrance presented in a multifaceted crystal decanter with brushed gold cap. Notes of dark plum, smoky oud, iris root, and warm amber resin.', 75.00, 'USD', '11111111-1111-1111-1111-111111111103', 'NVL-FRG-006', 12, true, true, true, false),
  ('22222222-2222-2222-2222-222222222207', 'Botanical Nourishment Organic Body Oil', 'botanical-nourishment-organic-body-oil', 'Cold-pressed golden jojoba, sea buckthorn, and sweet almond oil blended to lock in radiant suppleness. Leaves skin silky soft with zero greasy residue.', 24.00, 'USD', '11111111-1111-1111-1111-111111111104', 'NVL-BDY-007', 28, true, false, true, true),
  ('22222222-2222-2222-2222-222222222208', 'Plant & Petal Ultra-Rich Shea Body Butter', 'plant-petal-ultra-rich-shea-body-butter', 'Whipped raw African shea butter enriched with sweet jasmine flower extracts and virgin coconut oil. Deeply melts into dry skin for long-lasting hydration and velvet texture.', 22.00, 'USD', '11111111-1111-1111-1111-111111111104', 'NVL-BDY-008', 35, true, true, false, true),
  ('22222222-2222-2222-2222-222222222209', 'Luminous Silk Finishing Powder & Puff', 'luminous-silk-finishing-powder-puff', 'Micro-milled featherweight setting powder that gently blurs imperfections, eliminates excess shine, and delivers a radiant soft-focus finish that never cakes.', 21.00, 'USD', '11111111-1111-1111-1111-111111111102', 'NVL-MKP-009', 22, true, false, false, false),
  ('22222222-2222-2222-2222-222222222210', 'Restorative Herbal Hair & Scalp Elixir', 'restorative-herbal-hair-scalp-elixir', 'Stimulating botanical scalp and hair therapy enriched with rosemary, castor oil, and peppermint essence. Strengthens roots, adds mirror shine, and promotes healthy hair growth.', 26.00, 'USD', '11111111-1111-1111-1111-111111111105', 'NVL-HRC-010', 19, true, false, true, false),
  ('22222222-2222-2222-2222-222222222211', 'Gentle Purifying Facial Cleansing Gel', 'gentle-purifying-facial-cleansing-gel', 'Sulfate-free pH-balanced cleanser that washes away daily buildup and cosmetics without stripping the skin of moisture. Leaves skin refreshed, soft, and balanced.', 16.00, 'USD', '11111111-1111-1111-1111-111111111106', 'NVL-PER-011', 40, true, false, false, false),
  ('22222222-2222-2222-2222-222222222212', 'Daily Moisture Rosewater Balance Mist', 'daily-moisture-rosewater-balance-mist', 'Everyday hydration mist with pure damask rose distillate, aloe vera, and glycerin. Perfect for a refreshing pick-me-up throughout the day or to set makeup effortlessly.', 15.00, 'USD', '11111111-1111-1111-1111-111111111107', 'NVL-ESS-012', 30, true, false, false, true)
on conflict (slug) do nothing;

-- Attach default /images/products/ photos ONLY when a seeded product has no images yet
insert into public.product_images (product_id, image_url, alt_text, display_order)
select p.id, seed.img_url, p.name, 0
from (
  values
    ('avalon-eclat-eau-de-parfum', '/images/products/avalon_eclat.jpg'),
    ('flora-botanical-hydrating-serum', '/images/products/flora_serum.jpg'),
    ('flora-jasmine-ceramide-daily-cream', '/images/products/flora_cream.jpg'),
    ('luxe-elixir-velvet-satin-lipstick', '/images/products/luxe_lipstick.jpg'),
    ('celestial-rose-gold-eyeshadow-palette', '/images/products/rosegold_palette.jpg'),
    ('aura-eclipse-intense-parfum', '/images/products/aura_eclipse.jpg'),
    ('botanical-nourishment-organic-body-oil', '/images/products/botanical_body_oil.jpg'),
    ('plant-petal-ultra-rich-shea-body-butter', '/images/products/plant_petal_butter.jpg'),
    ('luminous-silk-finishing-powder-puff', '/images/products/luminous_compact.jpg'),
    ('restorative-herbal-hair-scalp-elixir', '/images/products/herbal_hair_oil.jpg'),
    ('gentle-purifying-facial-cleansing-gel', '/images/products/gentle_cleanser.jpg'),
    ('daily-moisture-rosewater-balance-mist', '/images/products/hydrating_mist.jpg')
) as seed(slug, img_url)
join public.products p on p.slug = seed.slug
where not exists (
  select 1 from public.product_images pi where pi.product_id = p.id
);

-- Seed matching product variants ONLY when a seeded product has zero variants registered yet
insert into public.product_variants (product_id, variant_name, variant_value, price_adjustment, stock_quantity)
select p.id, vseed.v_name, vseed.v_val, vseed.v_adj, vseed.v_stock
from (
  values
    ('avalon-eclat-eau-de-parfum', 'Size', '50ml EDP', 0.00, 10),
    ('avalon-eclat-eau-de-parfum', 'Size', '100ml EDP', 25.00, 8),
    ('flora-botanical-hydrating-serum', 'Size', '30ml Dropper', 0.00, 15),
    ('flora-botanical-hydrating-serum', 'Size', '50ml Deluxe', 14.00, 9),
    ('luxe-elixir-velvet-satin-lipstick', 'Shade', 'Deep Berry Velvet', 0.00, 14),
    ('luxe-elixir-velvet-satin-lipstick', 'Shade', 'Warm Spiced Nude', 0.00, 16),
    ('luxe-elixir-velvet-satin-lipstick', 'Shade', 'Monrovia Sunset Red', 0.00, 12),
    ('aura-eclipse-intense-parfum', 'Size', '100ml Decanter', 0.00, 12),
    ('botanical-nourishment-organic-body-oil', 'Size', '200ml Glass Pump', 0.00, 28)
) as vseed(slug, v_name, v_val, v_adj, v_stock)
join public.products p on p.slug = vseed.slug
where not exists (
  select 1 from public.product_variants pv where pv.product_id = p.id
);
