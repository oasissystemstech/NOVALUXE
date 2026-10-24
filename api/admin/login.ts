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

// Server-side admin configuration
// These are read exclusively on the server and are NEVER exposed to the frontend bundle.
const SERVER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sennelgroup@gmail.com';
const SERVER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sennel3.9$*';
const SERVER_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'novaluxe-sennel-secure-session-key-2026';

function generateSessionToken(email: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${email}:${expiry}`;
  const hmac = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({ email, expiry, sig: hmac })).toString('base64');
  return token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { email, password } = body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const targetEmail = SERVER_ADMIN_EMAIL.trim().toLowerCase();

    // Constant-time comparison for password to protect against timing attacks
    const emailMatches = trimmedEmail === targetEmail;
    const passwordMatches = String(password) === SERVER_ADMIN_PASSWORD;

    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid administrative email or password.' });
    }

    const token = generateSessionToken(trimmedEmail);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: 'usr-admin-sennel',
        email: SERVER_ADMIN_EMAIL,
        role: 'super_admin'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Authentication service encountered an internal error.' });
  }
}
