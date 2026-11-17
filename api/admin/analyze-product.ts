import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { cleanEnv, readJsonBody } from '../_lib/canonicalCatalog.js';
import { applyCors } from '../_lib/cors.js';
import { verifyAdminRequest } from '../_lib/adminAuth.js';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: { [key: string]: string | string[] };
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

export interface CategoryInput {
  id: string;
  name: string;
  slug: string;
}

export async function processAnalyzeProduct(
  req: VercelRequest,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any> }> {
  const auth = await verifyAdminRequest(req, envSource);
  if (!auth.authorized || (auth.role !== 'admin' && auth.role !== 'super_admin')) {
    return {
      status: auth.configError ? 503 : auth.authorized ? 403 : 401,
      body: { error: auth.reason || 'Unauthorized administrative request. Please sign in again.' }
    };
  }

  const apiKey = cleanEnv(envSource.GEMINI_API_KEY, '');
  if (!apiKey) {
    return {
      status: 500,
      body: {
        error:
          'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in project secrets or Vercel environment variables.'
      }
    };
  }

  try {
    const bodyData = await readJsonBody(req);
    const imageBase64 = String(bodyData.imageBase64 || '')
      .replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
      .trim();
    const mimeType = String(bodyData.mimeType || 'image/jpeg').trim();
    const fileName = String(bodyData.fileName || 'product.jpg').trim();
    const availableCategories: CategoryInput[] = Array.isArray(bodyData.availableCategories)
      ? bodyData.availableCategories
      : [];

    if (!imageBase64) {
      return { status: 400, body: { error: 'Image payload (imageBase64) is required.' } };
    }

    const categoryGuide =
      availableCategories.length > 0
        ? availableCategories.map(c => `- id: "${c.id}", name: "${c.name}"`).join('\n')
        : '- id: "cat-skincare", name: "Skincare"\n- id: "cat-makeup", name: "Makeup"\n- id: "cat-fragrances", name: "Fragrances"\n- id: "cat-bodycare", name: "Body Care"\n- id: "cat-haircare", name: "Hair Care"\n- id: "cat-personalcare", name: "Personal Care"\n- id: "cat-essentials", name: "Everyday Essentials"';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
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
6. Populate "extractedFields" with field names visibly read directly from the packaging (e.g., ["productName", "brand", "sizeOrVolume"]), "suggestedFields" with merchandiser-generated fields (e.g., ["description", "suggestedTags", "suggestedSku"]), and "needsVerificationFields" with any items the admin should double-check visually (always include "price" if missing from packaging, plus any obscured label info).
7. Generate a clean uppercase SKU suggestion formatted like "NVL-XXX-000" (or reading visible batch/SKU if present).`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Clear commercial product title.' },
            brand: { type: Type.STRING, description: 'Brand name only if clearly visible on packaging; empty string otherwise.' },
            suggestedCategoryId: { type: Type.STRING, description: 'Exact id from the provided store categories list.' },
            suggestedCategoryName: { type: Type.STRING, description: 'Exact name from the provided store categories list.' },
            productType: { type: Type.STRING, description: 'Short product type e.g. Eau de Parfum, Facial Serum, Matte Lipstick, Body Butter.' },
            description: { type: Type.STRING, description: 'Refined 2-3 sentence luxury retail description grounded in visible packaging without medical claims.' },
            sizeOrVolume: { type: Type.STRING, description: 'Net weight, volume, or count ONLY if visibly printed on label; empty string otherwise.' },
            specifications: { type: Type.STRING, description: 'Concise packaging/format specifications visible from the image (e.g. bottle type, shade tone, finish).' },
            keyIngredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key ingredients ONLY if clearly readable on the packaging or product title.'
            },
            features: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 concise factual product highlights grounded in the packaging.'
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 lowercase search keywords.'
            },
            suggestedSku: { type: Type.STRING, description: 'Suggested SKU identifier e.g. NVL-SKN-412.' },
            extractedFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of fields directly extracted from visible label text.'
            },
            suggestedFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of fields synthesized by AI merchandiser.'
            },
            needsVerificationFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of fields requiring admin verification (e.g. brand, sizeOrVolume, keyIngredients, category).'
            },
            confidenceNote: { type: Type.STRING, description: 'Brief 1-sentence note on label legibility and what needs admin verification.' }
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

    return {
      status: 200,
      body: {
        success: true,
        analysis
      }
    };
  } catch (err: any) {
    console.error('Gemini product analysis error:', err);
    return {
      status: err?.status || 500,
      body: {
        error: err?.message || 'Failed to analyze product image with AI.'
      }
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, 'POST,OPTIONS') === 'ended') {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await processAnalyzeProduct(req);
  return res.status(result.status).json(result.body);
}
