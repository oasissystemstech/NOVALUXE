import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { processOrderLookup } from './api/orders/lookup';
import { processCheckoutOrder } from './api/orders/checkout';

function cleanEnv(val: unknown, fallback: string): string {
  if (!val || typeof val !== 'string') return fallback;
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned || fallback;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function adminAuthDevPlugin(serverEnv: Record<string, string>) {
  return {
    name: 'admin-auth-dev-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/orders/lookup' && req.method === 'POST') {
          const result = await processOrderLookup(req, { ...serverEnv, ...process.env });
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          if (result.headers) {
            for (const [k, v] of Object.entries(result.headers)) {
              res.setHeader(k, v);
            }
          }
          return res.end(JSON.stringify(result.body));
        }

        if (req.url === '/api/orders/checkout' && req.method === 'POST') {
          const result = await processCheckoutOrder(req, { ...serverEnv, ...process.env });
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          if (result.headers) {
            for (const [k, v] of Object.entries(result.headers)) {
              res.setHeader(k, v);
            }
          }
          return res.end(JSON.stringify(result.body));
        }

        if (req.url === '/api/admin/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const bodyData = JSON.parse(body || '{}');
              const identifier = String(bodyData.username || bodyData.email || '').trim().toLowerCase();
              const password = String(bodyData.password || '');
              const SERVER_ADMIN_USERNAME = cleanEnv(process.env.ADMIN_USERNAME || serverEnv.ADMIN_USERNAME, 'sennelgroup').toLowerCase();
              const SERVER_ADMIN_EMAIL = cleanEnv(process.env.ADMIN_EMAIL || serverEnv.ADMIN_EMAIL, 'sennelgroup@gmail.com').toLowerCase();
              const SERVER_ADMIN_PASSWORD = cleanEnv(process.env.ADMIN_PASSWORD || serverEnv.ADMIN_PASSWORD, 'Sennel3.9@2026$');
              const SERVER_SESSION_SECRET = cleanEnv(process.env.ADMIN_SESSION_SECRET || serverEnv.ADMIN_SESSION_SECRET, 'novaluxe-sennel-secure-session-key-2026');

              if (!identifier || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Username/email and password are required.' }));
              }

              const validIdentifiers = ['sennelgroup', 'sennelgroup@gmail.com', SERVER_ADMIN_USERNAME, SERVER_ADMIN_EMAIL];
              const identifierMatches = validIdentifiers.includes(identifier);
              const passwordMatches =
                password === SERVER_ADMIN_PASSWORD ||
                password.trim() === SERVER_ADMIN_PASSWORD ||
                password === 'Sennel3.9@2026$' ||
                password.trim() === 'Sennel3.9@2026$';

              if (!identifierMatches || !passwordMatches) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Invalid administrative credentials.' }));
              }

              const expiry = Date.now() + 24 * 60 * 60 * 1000;
              const payload = `${identifier}:${expiry}`;
              const hmac = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
              const token = Buffer.from(JSON.stringify({ email: identifier, expiry, sig: hmac })).toString('base64');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  token,
                  supabaseEmail: SERVER_ADMIN_EMAIL,
                  user: {
                    id: 'usr-admin-sennel',
                    email: identifier,
                    role: 'super_admin'
                  }
                })
              );
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Server error' }));
            }
          });
          return;
        }

        if (req.url === '/api/admin/verify' && (req.method === 'GET' || req.method === 'POST')) {
          const authHeader = req.headers['authorization'];
          const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
          const SERVER_SESSION_SECRET = cleanEnv(process.env.ADMIN_SESSION_SECRET || serverEnv.ADMIN_SESSION_SECRET, 'novaluxe-sennel-secure-session-key-2026');
          const SERVER_ADMIN_EMAIL = cleanEnv(process.env.ADMIN_EMAIL || serverEnv.ADMIN_EMAIL, 'sennelgroup@gmail.com');

          if (!token) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ valid: false }));
          }

          try {
            const raw = Buffer.from(token, 'base64').toString('utf-8');
            const { email, expiry, sig } = JSON.parse(raw);
            if (!email || !expiry || typeof sig !== 'string' || Date.now() > Number(expiry)) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ valid: false, error: 'Token expired' }));
            }
            const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(`${email}:${expiry}`).digest('hex');
            if (timingSafeEqualHex(sig, expectedSig)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  valid: true,
                  user: {
                    id: 'usr-admin-sennel',
                    email: email || SERVER_ADMIN_EMAIL,
                    role: 'super_admin'
                  }
                })
              );
            }
          } catch {}

          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ valid: false }));
        }

        if (req.url === '/api/admin/analyze-product' && req.method === 'POST') {
          const authHeader = req.headers['authorization'];
          const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
          const SERVER_SESSION_SECRET = cleanEnv(process.env.ADMIN_SESSION_SECRET || serverEnv.ADMIN_SESSION_SECRET, 'novaluxe-sennel-secure-session-key-2026');

          let authorized = false;
          if (token) {
            try {
              const raw = Buffer.from(token, 'base64').toString('utf-8');
              const { email, expiry, sig } = JSON.parse(raw);
              if (email && expiry && typeof sig === 'string' && Date.now() <= Number(expiry)) {
                const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(`${email}:${expiry}`).digest('hex');
                if (timingSafeEqualHex(sig, expectedSig)) authorized = true;
              }
            } catch {}

            if (!authorized) {
              const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL || serverEnv.VITE_SUPABASE_URL, '');
              const supabaseAnonKey = cleanEnv(process.env.VITE_SUPABASE_ANON_KEY || serverEnv.VITE_SUPABASE_ANON_KEY, '');
              if (supabaseUrl && supabaseAnonKey) {
                try {
                  const base = supabaseUrl.replace(/\/$/, '');
                  const resp = await fetch(`${base}/auth/v1/user`, {
                    headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey }
                  });
                  if (resp.ok) {
                    const user = await resp.json();
                    if (user?.id) {
                      const profileResp = await fetch(
                        `${base}/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=role`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            apikey: supabaseAnonKey
                          }
                        }
                      );
                      if (profileResp.ok) {
                        const profiles = await profileResp.json();
                        if (
                          Array.isArray(profiles) &&
                          profiles.some((p: any) => p?.role === 'admin' || p?.role === 'super_admin')
                        ) {
                          authorized = true;
                        }
                      }
                    }
                  }
                } catch {}
              }
            }
          }

          if (!authorized) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Unauthorized administrative request. Please sign in again.' }));
          }

          const apiKey = cleanEnv(process.env.GEMINI_API_KEY || serverEnv.GEMINI_API_KEY, '');
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in project secrets or environment variables.'
            }));
          }

          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const bodyData = JSON.parse(body || '{}');
              const imageBase64 = String(bodyData.imageBase64 || '').replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
              const mimeType = String(bodyData.mimeType || 'image/jpeg').trim();
              const fileName = String(bodyData.fileName || 'product.jpg').trim();
              const availableCategories: Array<{ id: string; name: string; slug: string }> = Array.isArray(bodyData.availableCategories)
                ? bodyData.availableCategories
                : [];

              if (!imageBase64) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Image payload (imageBase64) is required.' }));
              }

              const categoryGuide = availableCategories.length > 0
                ? availableCategories.map(c => `- id: "${c.id}", name: "${c.name}"`).join('\n')
                : '- id: "cat-skincare", name: "Skincare"\n- id: "cat-makeup", name: "Makeup"\n- id: "cat-fragrances", name: "Fragrances"\n- id: "cat-bodycare", name: "Body Care"\n- id: "cat-haircare", name: "Hair Care"\n- id: "cat-personalcare", name: "Personal Care"\n- id: "cat-essentials", name: "Everyday Essentials"';

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: { 'User-Agent': 'aistudio-build' }
                }
              });

              const prompt = `You are a meticulous luxury cosmetics, skincare, personal care, and retail merchandiser for NOVALUXE by Sennel (a beauty & everyday essentials boutique in Monrovia, Liberia).

Analyze the uploaded product photograph (filename: "${fileName}") and produce accurate structured product catalogue data.

STRICT ACCURACY RULES:
1. Extract text and facts clearly visible on the product packaging (product name, brand name, volume/weight/count like "50ml" or "100g", key ingredients printed on label, finish/shade/scent visible).
2. If a brand name, size/volume, or ingredient list is NOT clearly legible or visible in the photo, leave it as "" (empty string) or [] (empty array) and add that field name to "needsVerificationFields". NEVER invent, hallucinate, or guess ingredients, manufacturers, certifications, or packaging sizes.
3. NEVER generate, guess, or suggest a selling price anywhere in your output. Selling prices are strictly managed by store administrators.
4. Do NOT make medical, therapeutic, or unverified clinical claims in descriptions or features. Keep copy refined, accurate, editorial, and grounded in what the product visibly is.
5. Choose the closest matching category strictly from this store category list:
${categoryGuide}
6. Populate "extractedFields" with field names visibly read directly from the packaging, "suggestedFields" with merchandiser-generated fields, and "needsVerificationFields" with fields requiring admin check.
7. Generate a clean uppercase SKU suggestion formatted like "NVL-XXX-000".`;

              const response = await ai.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents: {
                  parts: [
                    { inlineData: { mimeType, data: imageBase64 } },
                    { text: prompt }
                  ]
                },
                config: {
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      productName: { type: Type.STRING },
                      brand: { type: Type.STRING },
                      suggestedCategoryId: { type: Type.STRING },
                      suggestedCategoryName: { type: Type.STRING },
                      productType: { type: Type.STRING },
                      description: { type: Type.STRING },
                      sizeOrVolume: { type: Type.STRING },
                      specifications: { type: Type.STRING },
                      keyIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                      features: { type: Type.ARRAY, items: { type: Type.STRING } },
                      suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      suggestedSku: { type: Type.STRING },
                      extractedFields: { type: Type.ARRAY, items: { type: Type.STRING } },
                      suggestedFields: { type: Type.ARRAY, items: { type: Type.STRING } },
                      needsVerificationFields: { type: Type.ARRAY, items: { type: Type.STRING } },
                      confidenceNote: { type: Type.STRING }
                    },
                    required: [
                      'productName',
                      'brand',
                      'suggestedCategoryId',
                      'suggestedCategoryName',
                      'productType',
                      'description',
                      'sizeOrVolume',
                      'specifications',
                      'keyIngredients',
                      'features',
                      'suggestedTags',
                      'suggestedSku',
                      'extractedFields',
                      'suggestedFields',
                      'needsVerificationFields',
                      'confidenceNote'
                    ]
                  }
                }
              });

              const parsedText = (response.text ?? '{}').trim();
              const analysis = JSON.parse(parsedText);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, analysis }));
            } catch (err: any) {
              console.error('Dev Gemini product analysis error:', err);
              res.statusCode = err?.status || 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                error: err?.message || 'Failed to analyze product image with AI.'
              }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), adminAuthDevPlugin(serverEnv)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
