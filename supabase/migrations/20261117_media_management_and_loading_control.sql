-- ==============================================================================
-- NOVALUXE BY SENNEL - MEDIA MANAGEMENT, STORAGE BUCKETS & LOADING DISPLAY CONTROL
-- Non-destructive & idempotent migration. Preserves all live products,
-- categories, orders, settings, and uploaded Supabase Storage media assets.
-- ==============================================================================

-- 1. Provision / Update Public Storage Buckets with MIME & File Size Safeguards
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'category-images',
    'category-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'promotional-assets',
    'promotional-assets',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Idempotently Re-verify Public Read & Admin-Only Write Policies on storage.objects
drop policy if exists "Public Access to product-images" on storage.objects;
drop policy if exists "Admins can upload to product-images" on storage.objects;
drop policy if exists "Admins can update product-images" on storage.objects;
drop policy if exists "Admins can delete from product-images" on storage.objects;

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

drop policy if exists "Public Access to category-images" on storage.objects;
drop policy if exists "Admins can upload to category-images" on storage.objects;
drop policy if exists "Admins can update category-images" on storage.objects;
drop policy if exists "Admins can delete from category-images" on storage.objects;

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

drop policy if exists "Public Access to promotional-assets" on storage.objects;
drop policy if exists "Admins can upload to promotional-assets" on storage.objects;
drop policy if exists "Admins can update promotional-assets" on storage.objects;
drop policy if exists "Admins can delete from promotional-assets" on storage.objects;

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

-- 3. Non-Destructive Site Settings Upgrade for Website Loading Media Selector
-- Only runs against the existing 'general_config' row if promoCampaign is missing
-- new selector keys or still points to the non-existent placeholder '/videos/novaluxe-promo.mp4'.
-- Never overwrites admin-uploaded URLs, heroImage, or store settings.
update public.site_settings
set
  setting_value = jsonb_set(
    setting_value,
    '{promoCampaign}',
    (
      coalesce(setting_value->'promoCampaign', '{}'::jsonb)
      || jsonb_build_object(
        'displayMode',
        case
          when (setting_value->'promoCampaign'->>'enabled') = 'false' then 'disabled'
          when (setting_value->'promoCampaign'->>'displayMode') in ('image', 'video', 'disabled')
            then (setting_value->'promoCampaign'->>'displayMode')
          when (setting_value->'promoCampaign'->>'mediaUrl') = '/videos/novaluxe-promo.mp4'
            and coalesce(setting_value->'promoCampaign'->>'videoUrl', '') = ''
            then 'image'
          when (setting_value->'promoCampaign'->>'mediaType') = 'image' then 'image'
          when coalesce(setting_value->'promoCampaign'->>'videoUrl', '') <> ''
            or coalesce(setting_value->'promoCampaign'->>'mediaUrl', '') <> ''
            then 'video'
          else 'image'
        end,
        'mediaType',
        case
          when (setting_value->'promoCampaign'->>'mediaUrl') = '/videos/novaluxe-promo.mp4'
            and coalesce(setting_value->'promoCampaign'->>'videoUrl', '') = ''
            then 'image'
          else coalesce(nullif(setting_value->'promoCampaign'->>'mediaType', ''), 'image')
        end,
        'imageUrl',
        coalesce(
          nullif(setting_value->'promoCampaign'->>'imageUrl', ''),
          case
            when (setting_value->'promoCampaign'->>'mediaType') = 'image'
              then nullif(setting_value->'promoCampaign'->>'mediaUrl', '')
            else null
          end,
          nullif(setting_value->'promoCampaign'->>'posterUrl', ''),
          '/images/hero/hero_beauty_cosmetics.jpg'
        ),
        'videoUrl',
        case
          when coalesce(setting_value->'promoCampaign'->>'videoUrl', '') <> ''
            and (setting_value->'promoCampaign'->>'videoUrl') <> '/videos/novaluxe-promo.mp4'
            then (setting_value->'promoCampaign'->>'videoUrl')
          when (setting_value->'promoCampaign'->>'mediaType') = 'video'
            and coalesce(setting_value->'promoCampaign'->>'mediaUrl', '') <> ''
            and (setting_value->'promoCampaign'->>'mediaUrl') <> '/videos/novaluxe-promo.mp4'
            then (setting_value->'promoCampaign'->>'mediaUrl')
          else ''
        end,
        'mediaUrl',
        case
          when (setting_value->'promoCampaign'->>'mediaUrl') = '/videos/novaluxe-promo.mp4'
            and coalesce(setting_value->'promoCampaign'->>'videoUrl', '') = ''
            then coalesce(
              nullif(setting_value->'promoCampaign'->>'imageUrl', ''),
              nullif(setting_value->'promoCampaign'->>'posterUrl', ''),
              '/images/hero/hero_beauty_cosmetics.jpg'
            )
          else coalesce(
            nullif(setting_value->'promoCampaign'->>'mediaUrl', ''),
            '/images/hero/hero_beauty_cosmetics.jpg'
          )
        end,
        'desktopBehavior',
        coalesce(nullif(setting_value->'promoCampaign'->>'desktopBehavior', ''), 'autoplay_muted'),
        'mobileBehavior',
        coalesce(nullif(setting_value->'promoCampaign'->>'mobileBehavior', ''), 'autoplay_muted')
      )
    ),
    true
  ),
  updated_at = timezone('utc'::text, now())
where setting_key = 'general_config'
  and (
    (setting_value->'promoCampaign'->>'displayMode') is null
    or (setting_value->'promoCampaign'->>'mediaUrl') = '/videos/novaluxe-promo.mp4'
  );
