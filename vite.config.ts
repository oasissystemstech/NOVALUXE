import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { applyCors } from './api/_lib/cors.js';
import { processOrderLookup } from './api/orders/lookup.js';
import { processCheckoutOrder } from './api/orders/checkout.js';
import { processSignedStorageRequest } from './api/admin/storage-sign.js';
import { processAdminPersist } from './api/admin/persist.js';
import { processAdminLogin } from './api/admin/login.js';
import { processAdminVerify } from './api/admin/verify.js';
import { processAnalyzeProduct } from './api/admin/analyze-product.js';

function adminAuthDevPlugin(serverEnv: Record<string, string>) {
  return {
    name: 'admin-auth-dev-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const mergedEnv = { ...serverEnv, ...process.env };
        const urlPath = (req.url || '').split('?')[0];

        const sendJson = (status: number, body: any, headers?: Record<string, string>) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          if (headers) {
            for (const [k, v] of Object.entries(headers)) {
              res.setHeader(k, v);
            }
          }
          res.end(JSON.stringify(body));
        };

        if (urlPath === '/api/orders/lookup') {
          if (applyCors(req, res, 'POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processOrderLookup(req, mergedEnv);
          return sendJson(result.status, result.body, result.headers);
        }

        if (urlPath === '/api/orders/checkout') {
          if (applyCors(req, res, 'POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processCheckoutOrder(req, mergedEnv);
          return sendJson(result.status, result.body, result.headers);
        }

        if (urlPath === '/api/admin/storage-sign') {
          if (applyCors(req, res, 'POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processSignedStorageRequest(req, mergedEnv);
          return sendJson(result.status, result.body);
        }

        if (urlPath === '/api/admin/persist') {
          if (applyCors(req, res, 'GET,POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'GET' && req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processAdminPersist(req, mergedEnv);
          return sendJson(result.status, result.body);
        }

        if (urlPath === '/api/admin/login') {
          if (applyCors(req, res, 'POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processAdminLogin(req, mergedEnv);
          return sendJson(result.status, result.body, result.headers);
        }

        if (urlPath === '/api/admin/verify') {
          if (applyCors(req, res, 'GET,POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'GET' && req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processAdminVerify(req, mergedEnv);
          return sendJson(result.status, result.body);
        }

        if (urlPath === '/api/admin/analyze-product') {
          if (applyCors(req, res, 'POST,OPTIONS', mergedEnv) === 'ended') return;
          if (req.method !== 'POST') return sendJson(405, { error: 'Method Not Allowed' });
          const result = await processAnalyzeProduct(req, mergedEnv);
          return sendJson(result.status, result.body);
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
