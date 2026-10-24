import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function adminAuthDevPlugin() {
  return {
    name: 'admin-auth-dev-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/admin/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { email, password } = JSON.parse(body || '{}');
              const SERVER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sennelgroup@gmail.com';
              const SERVER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sennel3.9$*';
              const SERVER_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'novaluxe-sennel-secure-session-key-2026';

              if (!email || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Email and password are required.' }));
              }

              const emailMatches = String(email).trim().toLowerCase() === SERVER_ADMIN_EMAIL.trim().toLowerCase();
              const passwordMatches = String(password) === SERVER_ADMIN_PASSWORD;

              if (!emailMatches || !passwordMatches) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Invalid administrative email or password.' }));
              }

              const crypto = await import('crypto');
              const expiry = Date.now() + 24 * 60 * 60 * 1000;
              const payload = `${email}:${expiry}`;
              const hmac = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
              const token = Buffer.from(JSON.stringify({ email, expiry, sig: hmac })).toString('base64');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  success: true,
                  token,
                  user: {
                    id: 'usr-admin-sennel',
                    email: SERVER_ADMIN_EMAIL,
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
          const SERVER_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'novaluxe-sennel-secure-session-key-2026';
          const SERVER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sennelgroup@gmail.com';

          if (!token) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ valid: false }));
          }

          try {
            const crypto = await import('crypto');
            const raw = Buffer.from(token, 'base64').toString('utf-8');
            const { email, expiry, sig } = JSON.parse(raw);
            if (Date.now() > expiry) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ valid: false, error: 'Token expired' }));
            }
            const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(`${email}:${expiry}`).digest('hex');
            if (sig === expectedSig) {
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

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), adminAuthDevPlugin()],
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
