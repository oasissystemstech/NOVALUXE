import type { IncomingMessage, ServerResponse } from 'http';
import { cleanEnv } from '../_lib/canonicalCatalog.js';
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

export async function processAdminVerify(
  req: IncomingMessage,
  envSource: Record<string, string | undefined> = process.env
): Promise<{ status: number; body: Record<string, any> }> {
  const result = await verifyAdminRequest(req, envSource);
  if (!result.authorized || (result.role !== 'admin' && result.role !== 'super_admin')) {
    return {
      status: result.configError ? 503 : 401,
      body: {
        valid: false,
        error: result.reason || 'Session token is invalid or expired'
      }
    };
  }

  const serverAdminEmail = cleanEnv(envSource.ADMIN_EMAIL, '');
  return {
    status: 200,
    body: {
      valid: true,
      user: {
        id: result.userId || 'usr-admin-sennel',
        email: result.email || serverAdminEmail || 'administrator',
        role: result.role
      }
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, 'GET,POST,OPTIONS') === 'ended') {
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await processAdminVerify(req);
  return res.status(result.status).json(result.body);
}
