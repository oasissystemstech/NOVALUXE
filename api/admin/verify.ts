import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: { [key: string]: string | string[] };
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

function cleanEnv(val: unknown, fallback: string): string {
  if (!val || typeof val !== 'string') return fallback;
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned || fallback;
}

function verifySessionToken(token: string, secret: string): { valid: boolean; email?: string } {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    const { email, expiry, sig } = parsed;

    if (!email || !expiry || !sig) return { valid: false };
    if (Date.now() > expiry) return { valid: false };

    const expectedPayload = `${email}:${expiry}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

    if (sig === expectedSig) {
      return { valid: true, email };
    }
  } catch {
    return { valid: false };
  }
  return { valid: false };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ valid: false, error: 'No authorization token provided' });
  }

  const serverSessionSecret = cleanEnv(process.env.ADMIN_SESSION_SECRET, 'novaluxe-sennel-secure-session-key-2026');
  const serverAdminEmail = cleanEnv(process.env.ADMIN_EMAIL, 'sennelgroup@gmail.com');

  const verification = verifySessionToken(token, serverSessionSecret);
  if (!verification.valid) {
    return res.status(401).json({ valid: false, error: 'Session token is invalid or expired' });
  }

  return res.status(200).json({
    valid: true,
    user: {
      id: 'usr-admin-sennel',
      email: verification.email || serverAdminEmail,
      role: 'super_admin'
    }
  });
}
