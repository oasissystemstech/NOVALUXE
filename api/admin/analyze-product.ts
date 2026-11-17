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
  const tTotalStart = Date.now();
  let authDurationMs = 0;
  let aiRequestDurationMs = 0;
  let parseDurationMs = 0;

  const tAuthStart = Date.now();
  const auth = await verifyAdminRequest(req, envSource);
  authDurationMs = Date.now() - tAuthStart;

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

    const prompt = `You are a luxury retail merchandiser for NOVALUXE by Sennel. Analyze product photo "${fileName}" and output JSON.
RULES:
1. Extract text/facts visible on packaging (name, brand, size/volume, ingredients).
2. If illegible, return "" or [] and add field to "needsVerificationFields". Never hallucinate.
3. Never generate or guess selling prices.
4. No unverified medical/therapeutic claims.
5. Category must be strictly from:
${categoryGuide}
6. Populate "extractedFields", "suggestedFields", and "needsVerificationFields" (include "price").
7. Suggest uppercase SKU like "NVL-SKN-000".`;

    const tAiStart = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Clear commercial product title.' },
            brand: { type: Type.STRING, description: 'Brand name if visible; empty otherwise.' },
            suggestedCategoryId: { type: Type.STRING, description: 'Exact category id.' },
            suggestedCategoryName: { type: Type.STRING, description: 'Exact category name.' },
            productType: { type: Type.STRING, description: 'Short product type.' },
            description: { type: Type.STRING, description: 'Concise 2-3 sentence luxury description.' },
            sizeOrVolume: { type: Type.STRING, description: 'Net weight, volume, or count if visible.' },
            specifications: { type: Type.STRING, description: 'Packaging format specifications.' },
            keyIngredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key ingredients readable on packaging.'
            },
            features: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-4 factual highlights.'
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-5 search keywords.'
            },
            suggestedSku: { type: Type.STRING, description: 'Suggested SKU e.g. NVL-SKN-101.' },
            extractedFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Fields extracted from label.'
            },
            suggestedFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Fields synthesized by AI.'
            },
            needsVerificationFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Fields needing admin verification.'
            },
            confidenceNote: { type: Type.STRING, description: '1-sentence confidence summary.' }
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
    aiRequestDurationMs = Date.now() - tAiStart;

    const tParseStart = Date.now();
    const parsedText = (response.text ?? '{}').trim();
    const analysis = JSON.parse(parsedText);
    parseDurationMs = Date.now() - tParseStart;

    const totalDurationMs = Date.now() - tTotalStart;
    console.info(
      `[AI Analyze] file="${fileName}" auth=${authDurationMs}ms ai=${aiRequestDurationMs}ms parse=${parseDurationMs}ms total=${totalDurationMs}ms`
    );

    return {
      status: 200,
      body: {
        success: true,
        analysis,
        timings: {
          authDurationMs,
          aiRequestDurationMs,
          parseDurationMs,
          totalDurationMs
        }
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
