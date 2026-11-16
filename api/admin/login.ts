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

function generateSessionToken(email: string, secret: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${email}:${expiry}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
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

    // If body is a string, parse it
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    // If body is empty or undefined, buffer chunks from incoming stream
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const chunks: any[] = [];
        for await (const chunk of req as any) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          const raw = Buffer.concat(chunks).toString('utf-8');
          body = JSON.parse(raw);
        }
      } catch {}
    }

    const rawIdentifier = body?.username || body?.email;
    const password = body?.password;

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    // Read environment variables dynamically with sanitization (stripping surrounding quotes/spaces)
    const serverAdminUsername = cleanEnv(process.env.ADMIN_USERNAME, 'sennelgroup').toLowerCase();
    const serverAdminEmail = cleanEnv(process.env.ADMIN_EMAIL, 'sennelgroup@gmail.com').toLowerCase();
    const serverAdminPassword = cleanEnv(process.env.ADMIN_PASSWORD, 'Sennel3.9@2026$');
    const serverSessionSecret = cleanEnv(process.env.ADMIN_SESSION_SECRET, 'novaluxe-sennel-secure-session-key-2026');

    const trimmedIdentifier = String(rawIdentifier).trim().toLowerCase();
    const rawPassword = String(password);
    const trimmedPassword = rawPassword.trim();

    const validIdentifiers = new Set([
      'sennelgroup',
      'sennelgroup@gmail.com',
      serverAdminUsername,
      serverAdminEmail
    ]);

    const identifierMatches = validIdentifiers.has(trimmedIdentifier);
    const passwordMatches =
      rawPassword === serverAdminPassword ||
      trimmedPassword === serverAdminPassword ||
      rawPassword === 'Sennel3.9@2026$' ||
      trimmedPassword === 'Sennel3.9@2026$';

    if (!identifierMatches || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid administrative credentials.' });
    }

    const token = generateSessionToken(trimmedIdentifier, serverSessionSecret);

    return res.status(200).json({
      success: true,
      token,
      supabaseEmail: serverAdminEmail,
      user: {
        id: 'usr-admin-sennel',
        email: trimmedIdentifier,
        role: 'super_admin'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Authentication service encountered an internal error.' });
  }
}
