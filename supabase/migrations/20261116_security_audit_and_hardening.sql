-- ==============================================================================
-- NOVALUXE BY SENNEL - FINAL CHECKOUT INTEGRITY & SECURITY HARDENING MIGRATION
-- Target: Existing live production Supabase database
-- Non-destructive & idempotent:
--   * Preserves all existing site_settings, general_config, promoCampaign,
--     categories, products, product_images, orders, customers & uploaded assets.
--   * Removes obsolete/permissive policies via pg_policies audit without
--     affecting unrelated tables, buckets, or services.
--   * Replaces direct anonymous order/order_item/customer inserts and the old
--     time-window helper with atomic transactional create_checkout_order() RPC.
--   * Enforces mandatory client_request_id idempotency (with advisory locking)
--     and required variant validation + inventory deduction for variants & products.
--   * Hardens lookup_order_by_reference() with cross-instance rate limiting,
--     DoS-resistant isolation, expiry cleanup, exact full-phone match & zero PII.
-- ==============================================================================

begin;

-- 1. EXTENSIONS & NON-DESTRUCTIVE SCHEMA UPDATES
create extension if not exists "uuid-ossp";

alter table public.products add column if not exists brand text;
alter table public.products add column if not exists product_type text;
alter table public.products add column if not exists size_or_volume text;
alter table public.products add column if not exists specifications text;
alter table public.products add column if not exists key_ingredients jsonb default '[]'::jsonb;
alter table public.products add column if not exists features jsonb default '[]'::jsonb;
alter table public.products add column if not exists tags jsonb default '[]'::jsonb;

alter table public.orders add column if not exists client_request_id text;

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
  bucket_key text primary key,
  scope text not null default 'ip_ref',
  failed_count integer not null default 0,
  window_started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  locked_until timestamp with time zone
);

-- Non-destructive upgrade if order_lookup_attempts was previously keyed by order_reference
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

create index if not exists idx_product_images_product on public.product_images(product_id);
create index if not exists idx_product_variants_product on public.product_variants(product_id);
create index if not exists idx_orders_reference on public.orders(order_reference);
create unique index if not exists idx_orders_client_request_id on public.orders(client_request_id) where client_request_id is not null;
create index if not exists idx_admin_profiles_user_id on public.admin_profiles(user_id);
create index if not exists idx_bulk_upload_history_created_at on public.bulk_upload_history(created_at desc);
create index if not exists idx_order_lookup_attempts_window on public.order_lookup_attempts(window_started_at);

-- 2. DROP OBSOLETE HELPER & SUPERSEDED OVERLOAD SIGNATURES
drop function if exists public.order_is_pending_checkout(uuid);
drop function if exists public.lookup_order_by_reference(text, text);
drop function if exists public.lookup_order_by_reference(text, text, text);
drop function if exists public.create_checkout_order(text, text, text, text, text, text, text, jsonb, text);

-- 3. ADMIN AUTHORIZATION, DURABLE ORDER LOOKUP & TRANSACTIONAL CHECKOUT RPCS
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

-- Hardened cross-instance order lookup RPC
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

  -- 3. Check short bounded per-reference cooldown (only triggers after 20 multi-IP failures / 10 min; max 30s lock)
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

-- Atomic server-authoritative transactional checkout RPC
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

-- Least-privilege function EXECUTE grants
revoke all on function public.update_updated_at_column() from public, anon;

revoke all on function public.is_novaluxe_admin() from public, anon;
grant execute on function public.is_novaluxe_admin() to authenticated, service_role;

revoke all on function public.is_novaluxe_super_admin() from public, anon;
grant execute on function public.is_novaluxe_super_admin() to authenticated, service_role;

revoke all on function public.lookup_order_by_reference(text, text, text) from public;
grant execute on function public.lookup_order_by_reference(text, text, text) to anon, authenticated, service_role;

revoke all on function public.create_checkout_order(text, text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_checkout_order(text, text, text, text, text, text, text, jsonb, text) to anon, authenticated, service_role;

-- 4. ENSURE RLS IS ENABLED ON ALL NOVALUXE TABLES
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

-- 5. PG_POLICIES AUDIT CLEANUP (REMOVES ALL OBSOLETE/PERMISSIVE POLICIES ON NOVALUXE OBJECTS ONLY)
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

-- 6. APPLY HARDENED DATABASE RLS POLICIES
-- Categories
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

-- Products
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

-- Product Images
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

-- Product Variants
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

-- Site Settings
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

-- Customers (Admin-only table access; public checkout writes atomically via create_checkout_order RPC)
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

-- Orders (Admin-only table access; checkout uses create_checkout_order RPC; tracking uses lookup_order_by_reference RPC)
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

-- Order Items (Admin-only table access; checkout writes atomically inside create_checkout_order RPC)
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

-- Enquiries
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

-- Admin Profiles
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

-- Bulk Upload History
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

-- 7. SECURE STORAGE BUCKETS & POLICIES
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('category-images', 'category-images', true),
  ('promotional-assets', 'promotional-assets', true)
on conflict (id) do update set public = true;

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

-- 8. NON-DESTRUCTIVE SITE SETTINGS SEED (ONLY INSERTS IF MISSING)
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
    "tiktokUrl": "https://www.tiktok.com/@sennel_bbm"
  }'::jsonb
)
on conflict (setting_key) do nothing;

-- 9. SEED VARIANTS FOR INITIAL PRODUCTS ONLY IF NOT ALREADY POPULATED IN DATABASE
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

-- 10. TARGETED LEGACY IMAGE URL REPAIR (MAPS ONLY VERIFIED DEPLOYED /images/ FILES; PRESERVES ALL SUPABASE & CUSTOM URLS)
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

update public.product_images
set image_url = case
  when image_url like '%category_skincare%' then '/images/categories/skincare.jpg'
  when image_url like '%category_makeup%' then '/images/categories/makeup.jpg'
  when image_url like '%category_fragrance%' then '/images/categories/fragrances.jpg'
  when image_url like '%category_bodycare%' then '/images/categories/bodycare.jpg'
  when image_url like '%hero_beauty_cosmetics%' then '/images/hero/hero_beauty_cosmetics.jpg'
  else image_url
end
where image_url like '/src/assets/images/%';

commit;
