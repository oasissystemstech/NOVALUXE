import type { IncomingMessage, ServerResponse } from 'http';
import {
  fetchWithTimeout,
  getSupabaseServerConfig,
  isAbortError,
  readJsonBody
} from '../_lib/canonicalCatalog';
import { applyCors } from '../_lib/cors';
import { verifyAdminRequest } from '../_lib/adminAuth';
import { isApprovedMediaUrl } from '../_lib/mediaValidation';

interface VercelRequest extends IncomingMessage {
  body?: any;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ORDER_REF_REGEX = /^[A-Z0-9-]{6,64}$/;

const ALLOWED_ORDER_STATUSES = new Set([
  'Pending',
  'Confirmed',
  'Processing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled'
]);

const ALLOWED_PAYMENT_STATUSES = new Set(['Unpaid', 'Pending Verification', 'Paid']);

const ALLOWED_TOP_KEYS = new Set(['action', 'data']);

const ALLOWED_CATEGORY_KEYS = new Set([
  'id',
  'name',
  'slug',
  'description',
  'imageUrl',
  'isActive',
  'displayOrder',
  'createdAt'
]);

const ALLOWED_PRODUCT_KEYS = new Set([
  'id',
  'name',
  'slug',
  'description',
  'price',
  'currency',
  'categoryId',
  'categorySlug',
  'sku',
  'stockQuantity',
  'isAvailable',
  'isFeatured',
  'isNewArrival',
  'isBestSeller',
  'images',
  'variants',
  'brand',
  'productType',
  'sizeOrVolume',
  'specifications',
  'keyIngredients',
  'features',
  'tags',
  'createdAt',
  'updatedAt'
]);

const ALLOWED_SETTINGS_KEYS = new Set([
  'businessName',
  'businessCategory',
  'location',
  'email',
  'whatsapp',
  'whatsappRaw',
  'phoneNumbers',
  'currency',
  'deliveryFee',
  'pickupEnabled',
  'announcementText',
  'announcementEnabled',
  'heroHeadline',
  'heroSubtitle',
  'heroImage',
  'instagramUrl',
  'tiktokUrl',
  'brandIntro',
  'aboutStory',
  'mission',
  'vision',
  'promoCampaign'
]);

const ALLOWED_PROMO_KEYS = new Set([
  'enabled',
  'displayMode',
  'mediaType',
  'mediaUrl',
  'imageUrl',
  'videoUrl',
  'posterUrl',
  'desktopBehavior',
  'mobileBehavior',
  'title',
  'subtitle',
  'ctaText',
  'destinationPath',
  'frequency',
  'startDate',
  'endDate'
]);

const VALID_PROMO_DISPLAY_MODES = new Set(['image', 'video', 'disabled']);
const VALID_PROMO_MEDIA_TYPES = new Set(['image', 'video']);
const VALID_PROMO_DESKTOP_BEHAVIORS = new Set(['autoplay_muted', 'click_to_play', 'hide']);
const VALID_PROMO_MOBILE_BEHAVIORS = new Set(['autoplay_muted', 'click_to_play', 'poster_fallback', 'hide']);
const VALID_PROMO_FREQUENCIES = new Set(['once_per_session', 'once_per_day', 'always']);

function isPlainObject(val: unknown): val is Record<string, any> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function assertAllowedKeys(
  obj: Record<string, any>,
  allowed: Set<string>,
  label: string
): string | null {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      return `Unexpected field '${key}' in ${label}.`;
    }
  }
  return null;
}

// Media URL validation is centralized in ../_lib/mediaValidation.ts

function assertStringField(
  val: unknown,
  field: string,
  opts: { required?: boolean; min?: number; max?: number } = {}
): { ok: true; value: string } | { ok: false; error: string } {
  if (val === undefined || val === null) {
    if (opts.required) {
      return { ok: false, error: `${field} is required.` };
    }
    return { ok: true, value: '' };
  }
  if (typeof val !== 'string') {
    return { ok: false, error: `${field} must be a string.` };
  }
  const trimmed = val.trim();
  if (opts.required && !trimmed) {
    return { ok: false, error: `${field} is required.` };
  }
  if (opts.min !== undefined && trimmed.length < opts.min) {
    return { ok: false, error: `${field} must be at least ${opts.min} characters.` };
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    return { ok: false, error: `${field} must not exceed ${opts.max} characters.` };
  }
  return { ok: true, value: trimmed };
}

function validateAndNormalizeSettings(
  raw: unknown,
  envSource: Record<string, string | undefined> = process.env
): { ok: true; value: Record<string, any> } | { ok: false; error: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Settings payload must be a plain object.' };
  }
  const keyErr = assertAllowedKeys(raw, ALLOWED_SETTINGS_KEYS, 'settings');
  if (keyErr) return { ok: false, error: keyErr };

  const stringChecks: Array<[string, number]> = [
    ['businessName', 200],
    ['businessCategory', 300],
    ['location', 300],
    ['email', 200],
    ['whatsapp', 60],
    ['whatsappRaw', 40],
    ['currency', 10],
    ['announcementText', 500],
    ['heroHeadline', 300],
    ['heroSubtitle', 600],
    ['instagramUrl', 500],
    ['tiktokUrl', 500],
    ['brandIntro', 2000],
    ['aboutStory', 4000],
    ['mission', 2000],
    ['vision', 2000]
  ];

  for (const [k, max] of stringChecks) {
    if (raw[k] !== undefined && (typeof raw[k] !== 'string' || raw[k].length > max)) {
      return { ok: false, error: `Invalid settings.${k} value.` };
    }
  }

  if (raw.deliveryFee !== undefined) {
    if (typeof raw.deliveryFee !== 'number' || !Number.isFinite(raw.deliveryFee) || raw.deliveryFee < 0 || raw.deliveryFee > 10_000) {
      return { ok: false, error: 'settings.deliveryFee must be a finite number between 0 and 10000.' };
    }
  }

  if (raw.pickupEnabled !== undefined && typeof raw.pickupEnabled !== 'boolean') {
    return { ok: false, error: 'settings.pickupEnabled must be a boolean.' };
  }
  if (raw.announcementEnabled !== undefined && typeof raw.announcementEnabled !== 'boolean') {
    return { ok: false, error: 'settings.announcementEnabled must be a boolean.' };
  }

  if (raw.phoneNumbers !== undefined) {
    if (
      !Array.isArray(raw.phoneNumbers) ||
      raw.phoneNumbers.length > 10 ||
      raw.phoneNumbers.some(p => typeof p !== 'string' || p.length > 50)
    ) {
      return { ok: false, error: 'settings.phoneNumbers must be an array of up to 10 phone strings.' };
    }
  }

  if (
    raw.heroImage !== undefined &&
    !isApprovedMediaUrl(raw.heroImage, 'promo_image', { allowEmpty: false, envSource })
  ) {
    return {
      ok: false,
      error: 'Hero image must be an approved NOVALUXE asset or uploaded Supabase Storage URL.'
    };
  }

  if (raw.promoCampaign !== undefined) {
    if (!isPlainObject(raw.promoCampaign)) {
      return { ok: false, error: 'settings.promoCampaign must be an object.' };
    }
    const promoKeyErr = assertAllowedKeys(raw.promoCampaign, ALLOWED_PROMO_KEYS, 'promoCampaign');
    if (promoKeyErr) return { ok: false, error: promoKeyErr };

    const promo = raw.promoCampaign;
    if (promo.enabled !== undefined && typeof promo.enabled !== 'boolean') {
      return { ok: false, error: 'promoCampaign.enabled must be a boolean.' };
    }
    if (promo.displayMode !== undefined && !VALID_PROMO_DISPLAY_MODES.has(promo.displayMode)) {
      return { ok: false, error: 'Invalid promoCampaign.displayMode.' };
    }
    if (promo.mediaType !== undefined && !VALID_PROMO_MEDIA_TYPES.has(promo.mediaType)) {
      return { ok: false, error: 'Invalid promoCampaign.mediaType.' };
    }
    if (promo.desktopBehavior !== undefined && !VALID_PROMO_DESKTOP_BEHAVIORS.has(promo.desktopBehavior)) {
      return { ok: false, error: 'Invalid promoCampaign.desktopBehavior.' };
    }
    if (promo.mobileBehavior !== undefined && !VALID_PROMO_MOBILE_BEHAVIORS.has(promo.mobileBehavior)) {
      return { ok: false, error: 'Invalid promoCampaign.mobileBehavior.' };
    }
    if (promo.frequency !== undefined && !VALID_PROMO_FREQUENCIES.has(promo.frequency)) {
      return { ok: false, error: 'Invalid promoCampaign.frequency.' };
    }

    for (const urlField of ['mediaUrl', 'imageUrl', 'posterUrl'] as const) {
      if (
        promo[urlField] !== undefined &&
        !isApprovedMediaUrl(promo[urlField], 'promo_image', { allowEmpty: true, envSource })
      ) {
        return {
          ok: false,
          error: `promoCampaign.${urlField} must be a persistent Supabase Storage or approved storefront URL.`
        };
      }
    }
    if (
      promo.videoUrl !== undefined &&
      !isApprovedMediaUrl(promo.videoUrl, 'promo_video', { allowEmpty: true, envSource })
    ) {
      return {
        ok: false,
        error: 'promoCampaign.videoUrl must be a persistent Supabase Storage promotional video URL.'
      };
    }

    for (const txtField of ['title', 'subtitle', 'ctaText', 'destinationPath', 'startDate', 'endDate']) {
      if (promo[txtField] !== undefined && (typeof promo[txtField] !== 'string' || promo[txtField].length > 1000)) {
        return { ok: false, error: `Invalid promoCampaign.${txtField}.` };
      }
    }
    if (promo.destinationPath && !String(promo.destinationPath).startsWith('/')) {
      return { ok: false, error: 'promoCampaign.destinationPath must be a relative route starting with /.' };
    }
  }

  return { ok: true, value: raw };
}

function validateCategoryPayload(
  raw: unknown,
  envSource: Record<string, string | undefined> = process.env
): { ok: true; payload: Record<string, any>; conflictKey: 'id' | 'slug' } | { ok: false; error: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Category payload must be an object.' };
  }
  const keyErr = assertAllowedKeys(raw, ALLOWED_CATEGORY_KEYS, 'category');
  if (keyErr) return { ok: false, error: keyErr };

  const nameRes = assertStringField(raw.name, 'Category name', { required: true, min: 2, max: 160 });
  if (!nameRes.ok) return nameRes;

  const slugRes = assertStringField(raw.slug, 'Category slug', { required: true, min: 2, max: 160 });
  if (!slugRes.ok) return slugRes;
  if (!SLUG_REGEX.test(slugRes.value)) {
    return { ok: false, error: 'Category slug must contain lowercase letters, numbers, and hyphens only.' };
  }

  const descRes = assertStringField(raw.description, 'Category description', { max: 2000 });
  if (!descRes.ok) return descRes;

  if (!isApprovedMediaUrl(raw.imageUrl, 'category', { allowEmpty: false, envSource })) {
    return { ok: false, error: 'Category image must be a valid uploaded Supabase Storage or approved URL.' };
  }

  if (raw.isActive !== undefined && typeof raw.isActive !== 'boolean') {
    return { ok: false, error: 'Category isActive must be a boolean.' };
  }

  const displayOrder = raw.displayOrder === undefined ? 0 : Number(raw.displayOrder);
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10_000) {
    return { ok: false, error: 'Category displayOrder must be an integer between 0 and 10000.' };
  }

  const idStr = raw.id === undefined || raw.id === null ? '' : String(raw.id).trim();
  if (idStr && !UUID_REGEX.test(idStr)) {
    return { ok: false, error: 'Invalid category id format (UUID expected).' };
  }

  const payload: Record<string, any> = {
    name: nameRes.value,
    slug: slugRes.value,
    description: descRes.value,
    image_url: String(raw.imageUrl).trim(),
    is_active: raw.isActive !== false,
    display_order: displayOrder
  };
  if (idStr) {
    payload.id = idStr;
  }

  return { ok: true, payload, conflictKey: idStr ? 'id' : 'slug' };
}

function validateProductPayload(
  raw: unknown,
  envSource: Record<string, string | undefined> = process.env
): {
  ok: true;
  rpcArgs: {
    id: string | null;
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    categoryId: string | null;
    categorySlug: string | null;
    sku: string;
    stockQuantity: number;
    isAvailable: boolean;
    isFeatured: boolean;
    isNewArrival: boolean;
    isBestSeller: boolean;
    brand: string | null;
    productType: string | null;
    sizeOrVolume: string | null;
    specifications: string | null;
    keyIngredients: string[];
    features: string[];
    tags: string[];
    images: string[];
  };
} | { ok: false; error: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Product payload must be an object.' };
  }
  const keyErr = assertAllowedKeys(raw, ALLOWED_PRODUCT_KEYS, 'product');
  if (keyErr) return { ok: false, error: keyErr };

  const idStr = raw.id === undefined || raw.id === null ? '' : String(raw.id).trim();
  if (idStr && !UUID_REGEX.test(idStr)) {
    return { ok: false, error: 'Invalid product id format (UUID expected).' };
  }

  const nameRes = assertStringField(raw.name, 'Product name', { required: true, min: 2, max: 200 });
  if (!nameRes.ok) return nameRes;

  const slugRes = assertStringField(raw.slug, 'Product slug', { required: true, min: 2, max: 160 });
  if (!slugRes.ok) return slugRes;
  if (!SLUG_REGEX.test(slugRes.value)) {
    return { ok: false, error: 'Product slug must contain lowercase letters, numbers, and hyphens only.' };
  }

  const descRes = assertStringField(raw.description, 'Product description', { required: true, min: 2, max: 5000 });
  if (!descRes.ok) return descRes;

  if (typeof raw.price !== 'number' || !Number.isFinite(raw.price) || raw.price < 0 || raw.price > 1_000_000) {
    return { ok: false, error: 'Product price must be a finite number between 0 and 1,000,000.' };
  }

  const stockQuantity = Number(raw.stockQuantity);
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1_000_000) {
    return { ok: false, error: 'Product stockQuantity must be an integer between 0 and 1,000,000.' };
  }

  const currencyRes = assertStringField(raw.currency ?? 'USD', 'Currency', { required: true, min: 1, max: 10 });
  if (!currencyRes.ok) return currencyRes;

  const skuRes = assertStringField(raw.sku ?? '', 'SKU', { max: 80 });
  if (!skuRes.ok) return skuRes;

  const categoryIdStr = raw.categoryId === undefined || raw.categoryId === null ? '' : String(raw.categoryId).trim();
  if (categoryIdStr && !UUID_REGEX.test(categoryIdStr)) {
    return { ok: false, error: 'Invalid categoryId format (UUID expected).' };
  }

  const categorySlugStr = raw.categorySlug === undefined || raw.categorySlug === null ? '' : String(raw.categorySlug).trim();
  if (categorySlugStr && !SLUG_REGEX.test(categorySlugStr)) {
    return { ok: false, error: 'Invalid categorySlug format.' };
  }

  if (!categoryIdStr && !categorySlugStr) {
    return { ok: false, error: 'A valid categoryId or categorySlug is required.' };
  }

  for (const boolField of ['isAvailable', 'isFeatured', 'isNewArrival', 'isBestSeller']) {
    if (raw[boolField] !== undefined && typeof raw[boolField] !== 'boolean') {
      return { ok: false, error: `Product ${boolField} must be a boolean.` };
    }
  }

  if (!Array.isArray(raw.images) || raw.images.length === 0 || raw.images.length > 20) {
    return { ok: false, error: 'Product must include between 1 and 20 valid images.' };
  }

  const cleanImages: string[] = [];
  for (const img of raw.images) {
    if (!isApprovedMediaUrl(img, 'product', { allowEmpty: false, envSource })) {
      return { ok: false, error: 'All product images must be persistent Supabase Storage or approved URLs.' };
    }
    cleanImages.push(String(img).trim());
  }

  const validateStringArray = (val: unknown, label: string): { ok: true; list: string[] } | { ok: false; error: string } => {
    if (val === undefined || val === null) return { ok: true, list: [] };
    if (!Array.isArray(val) || val.length > 50 || val.some(v => typeof v !== 'string' || v.length > 200)) {
      return { ok: false, error: `Product ${label} must be an array of short strings.` };
    }
    return { ok: true, list: val.map(v => v.trim()).filter(Boolean) };
  };

  const ingRes = validateStringArray(raw.keyIngredients, 'keyIngredients');
  if (!ingRes.ok) return ingRes;
  const featRes = validateStringArray(raw.features, 'features');
  if (!featRes.ok) return featRes;
  const tagRes = validateStringArray(raw.tags, 'tags');
  if (!tagRes.ok) return tagRes;

  const optStr = (val: unknown, max: number, label: string) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val !== 'string' || val.length > max) {
      throw new Error(`Invalid product.${label} field.`);
    }
    return val.trim() || null;
  };

  try {
    return {
      ok: true,
      rpcArgs: {
        id: idStr || null,
        name: nameRes.value,
        slug: slugRes.value,
        description: descRes.value,
        price: Math.round(raw.price * 100) / 100,
        currency: currencyRes.value,
        categoryId: categoryIdStr || null,
        categorySlug: categorySlugStr || null,
        sku: skuRes.value,
        stockQuantity,
        isAvailable: raw.isAvailable !== false,
        isFeatured: Boolean(raw.isFeatured),
        isNewArrival: Boolean(raw.isNewArrival),
        isBestSeller: Boolean(raw.isBestSeller),
        brand: optStr(raw.brand, 160, 'brand'),
        productType: optStr(raw.productType, 160, 'productType'),
        sizeOrVolume: optStr(raw.sizeOrVolume, 160, 'sizeOrVolume'),
        specifications: optStr(raw.specifications, 2000, 'specifications'),
        keyIngredients: ingRes.list,
        features: featRes.list,
        tags: tagRes.list,
        images: cleanImages
      }
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid optional product text field.' };
  }
}

async function supabaseRest(
  sb: ReturnType<typeof getSupabaseServerConfig>,
  path: string,
  init: RequestInit = {}
) {
  const key = sb.serviceRoleKey;
  return fetchWithTimeout(
    `${sb.url}/rest/v1/${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(init.headers || {})
      }
    },
    12_000
  );
}

export async function processAdminPersist(
  req: VercelRequest,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any> }> {
  const admin = await verifyAdminRequest(req, envSource);
  if (!admin.authorized || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
    return {
      status: admin.configError ? 503 : admin.authorized ? 403 : 401,
      body: { error: admin.reason || 'Unauthorized administrative request.' }
    };
  }

  const sb = getSupabaseServerConfig(envSource);

  if (req.method === 'GET') {
    return {
      status: 200,
      body: {
        success: true,
        hasSupabaseUrl: Boolean(sb.url),
        hasServiceRole: sb.hasServiceRole,
        authMethod: admin.authMethod,
        role: admin.role
      }
    };
  }

  if (!sb.url || !sb.hasServiceRole || !sb.serviceRoleKey) {
    return {
      status: 503,
      body: {
        errorCode: 'SUPABASE_SERVICE_ROLE_MISSING',
        error:
          'Server database persistence requires SUPABASE_SERVICE_ROLE_KEY or an authenticated Supabase Auth user registered in public.admin_profiles.'
      }
    };
  }

  const body = await readJsonBody(req);
  if (!isPlainObject(body)) {
    return { status: 400, body: { error: 'Request body must be a JSON object.' } };
  }
  const topKeyErr = assertAllowedKeys(body, ALLOWED_TOP_KEYS, 'request body');
  if (topKeyErr) {
    return { status: 400, body: { error: topKeyErr } };
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const data = isPlainObject(body.data) ? body.data : {};

  try {
    if (action === 'save_settings') {
      if (admin.role !== 'super_admin') {
        return {
          status: 403,
          body: { error: 'Forbidden: Only super administrators can modify global store settings.' }
        };
      }
      const dataKeyErr = assertAllowedKeys(data, new Set(['settings']), 'save_settings data');
      if (dataKeyErr) return { status: 400, body: { error: dataKeyErr } };

      const validated = validateAndNormalizeSettings(data.settings, envSource);
      if (!validated.ok) {
        return { status: 400, body: { error: validated.error } };
      }

      const resp = await supabaseRest(
        sb,
        'site_settings?on_conflict=setting_key',
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            setting_key: 'general_config',
            setting_value: validated.value
          })
        }
      );

      const rows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return {
          status: resp.status >= 400 ? resp.status : 500,
          body: { error: rows?.message || 'Failed to save site settings in Supabase.' }
        };
      }

      return { status: 200, body: { success: true, settings: validated.value } };
    }

    if (action === 'save_category') {
      const dataKeyErr = assertAllowedKeys(data, new Set(['category']), 'save_category data');
      if (dataKeyErr) return { status: 400, body: { error: dataKeyErr } };

      const catCheck = validateCategoryPayload(data.category, envSource);
      if (!catCheck.ok) {
        return { status: 400, body: { error: catCheck.error } };
      }

      const resp = await supabaseRest(
        sb,
        `categories?on_conflict=${catCheck.conflictKey}`,
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(catCheck.payload)
        }
      );

      const rows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return {
          status: resp.status >= 400 ? resp.status : 500,
          body: { error: rows?.message || 'Failed to save category in Supabase.' }
        };
      }

      const saved = Array.isArray(rows) ? rows[0] : rows;
      return { status: 200, body: { success: true, category: saved } };
    }

    if (action === 'delete_category') {
      const dataKeyErr = assertAllowedKeys(data, new Set(['id', 'slug']), 'delete_category data');
      if (dataKeyErr) return { status: 400, body: { error: dataKeyErr } };

      const id = typeof data.id === 'string' ? data.id.trim() : '';
      const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
      if (!id && !slug) {
        return { status: 400, body: { error: 'Category identifier (UUID id or slug) is required.' } };
      }
      if (id && !UUID_REGEX.test(id)) {
        return { status: 400, body: { error: 'Invalid category id (UUID expected).' } };
      }
      if (!id && !SLUG_REGEX.test(slug)) {
        return { status: 400, body: { error: 'Invalid category slug format.' } };
      }

      const filter = id
        ? `id=eq.${encodeURIComponent(id)}`
        : `slug=eq.${encodeURIComponent(slug)}`;

      const resp = await supabaseRest(sb, `categories?${filter}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' }
      });
      const deletedRows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return {
          status: resp.status >= 400 ? resp.status : 500,
          body: { error: deletedRows?.message || 'Failed to delete category from Supabase.' }
        };
      }
      if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
        return { status: 404, body: { error: 'Category not found in Supabase.' } };
      }
      return { status: 200, body: { success: true } };
    }

    if (action === 'save_product') {
      const dataKeyErr = assertAllowedKeys(data, new Set(['product']), 'save_product data');
      if (dataKeyErr) return { status: 400, body: { error: dataKeyErr } };

      const prodCheck = validateProductPayload(data.product, envSource);
      if (!prodCheck.ok) {
        return { status: 400, body: { error: prodCheck.error } };
      }
      const p = prodCheck.rpcArgs;

      // Transactional save of product + product_images via PostgreSQL RPC
      const rpcResp = await supabaseRest(sb, 'rpc/save_product_with_images', {
        method: 'POST',
        body: JSON.stringify({
          p_id: p.id,
          p_name: p.name,
          p_slug: p.slug,
          p_description: p.description,
          p_price: p.price,
          p_currency: p.currency,
          p_category_id: p.categoryId,
          p_category_slug: p.categorySlug,
          p_sku: p.sku,
          p_stock_quantity: p.stockQuantity,
          p_is_available: p.isAvailable,
          p_is_featured: p.isFeatured,
          p_is_new_arrival: p.isNewArrival,
          p_is_best_seller: p.isBestSeller,
          p_brand: p.brand,
          p_product_type: p.productType,
          p_size_or_volume: p.sizeOrVolume,
          p_specifications: p.specifications,
          p_key_ingredients: p.keyIngredients,
          p_features: p.features,
          p_tags: p.tags,
          p_images: p.images
        })
      });

      const rpcBody = await rpcResp.json().catch(() => null);
      if (!rpcResp.ok) {
        const msg = String(rpcBody?.message || rpcBody?.error || '');
        const code = String(rpcBody?.code || '');
        if (code === 'PGRST202' || code === '42883') {
          return {
            status: 503,
            body: {
              error:
                'Transactional product save function (save_product_with_images) is not deployed. Run migration 20261118_security_and_integrity_hardening.sql.'
            }
          };
        }
        return {
          status: rpcResp.status >= 400 ? rpcResp.status : 500,
          body: { error: msg || 'Failed to save product transactionally in Supabase.' }
        };
      }

      if (!rpcBody?.id) {
        return { status: 500, body: { error: 'Supabase did not return saved product record.' } };
      }

      return { status: 200, body: { success: true, product: rpcBody } };
    }

    if (action === 'delete_product') {
      const dataKeyErr = assertAllowedKeys(data, new Set(['id', 'slug']), 'delete_product data');
      if (dataKeyErr) return { status: 400, body: { error: dataKeyErr } };

      const id = typeof data.id === 'string' ? data.id.trim() : '';
      const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
      if (!id && !slug) {
        return { status: 400, body: { error: 'Product identifier (UUID id or slug) is required.' } };
      }
      if (id && !UUID_REGEX.test(id)) {
        return { status: 400, body: { error: 'Invalid product id (UUID expected).' } };
      }
      if (!id && !SLUG_REGEX.test(slug)) {
        return { status: 400, body: { error: 'Invalid product slug format.' } };
      }

      const filter = id
        ? `id=eq.${encodeURIComponent(id)}`
        : `slug=eq.${encodeURIComponent(slug)}`;

      const resp = await supabaseRest(sb, `products?${filter}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' }
      });
      const deletedRows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return {
          status: resp.status >= 400 ? resp.status : 500,
          body: { error: deletedRows?.message || 'Failed to delete product from Supabase.' }
        };
      }
      if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
        return { status: 404, body: { error: 'Product not found in Supabase.' } };
      }
      return { status: 200, body: { success: true } };
    }

    if (action === 'update_order_status') {
      const dataKeyErr = assertAllowedKeys(
        data,
        new Set(['orderReference', 'orderStatus', 'paymentStatus']),
        'update_order_status data'
      );
      if (dataKeyErr) return { status: 400, body: { error: dataKeyErr } };

      const orderReference = typeof data.orderReference === 'string' ? data.orderReference.trim().toUpperCase() : '';
      const orderStatus = typeof data.orderStatus === 'string' ? data.orderStatus.trim() : '';
      const paymentStatus = data.paymentStatus !== undefined ? String(data.paymentStatus).trim() : undefined;

      if (!ORDER_REF_REGEX.test(orderReference)) {
        return { status: 400, body: { error: 'Invalid orderReference format.' } };
      }
      if (!ALLOWED_ORDER_STATUSES.has(orderStatus)) {
        return { status: 400, body: { error: `Invalid orderStatus '${orderStatus}'.` } };
      }
      if (paymentStatus !== undefined && !ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) {
        return { status: 400, body: { error: `Invalid paymentStatus '${paymentStatus}'.` } };
      }

      const updatePayload: Record<string, any> = { order_status: orderStatus };
      if (paymentStatus !== undefined) updatePayload.payment_status = paymentStatus;

      const resp = await supabaseRest(
        sb,
        `orders?order_reference=eq.${encodeURIComponent(orderReference)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(updatePayload)
        }
      );
      const rows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return { status: 500, body: { error: rows?.message || 'Failed to update order status.' } };
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return { status: 404, body: { error: `Order '${orderReference}' not found.` } };
      }
      return { status: 200, body: { success: true, order: rows[0] } };
    }

    return { status: 400, body: { error: `Unknown admin persist action: ${action}` } };
  } catch (err: any) {
    if (isAbortError(err)) {
      return { status: 504, body: { error: 'Timed out saving data to Supabase.' } };
    }
    return { status: 500, body: { error: err?.message || 'Unexpected admin database save error.' } };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, 'GET,POST,OPTIONS') === 'ended') {
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await processAdminPersist(req);
  return res.status(result.status).json(result.body);
}
