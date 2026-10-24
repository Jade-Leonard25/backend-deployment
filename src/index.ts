import 'dotenv/config';
import path from 'node:path';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import loginControllers from './controllers/login.controllers';
import signControllers from './controllers/signup.controller.data';
import deploymentControllers from './controllers/deployment.controllers';
import db from './db';
import { DEPLOYMENTS_DIR } from './paths';

// ---------- API app (everything under /api) ----------
const app = new Hono().basePath('/api');
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/', (c) => c.text('Hello World')); // GET /api
app.route('/deployments', deploymentControllers);
app.route('/auth', loginControllers);
app.route('/auth', signControllers);
app.get('/health', async (c) => {
  try {
    await db.execute('select 1');
    return c.json({ status: 'ok', database: 'connected' });
  } catch (e) {
    console.error('Health check failed:', e);
    return c.json({ status: 'degraded', database: 'disconnected' }, 503);
  }
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error('Unhandled server error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// ---------- Root app: subdomain sites first, then the API ----------
const root = new Hono();

// <deploymentId>.localhost:4002 -> <DEPLOYMENTS_DIR>/<id>/public
root.use('*', async (c, next) => {
  const host = c.req.header('host') ?? '';
  const match = host.match(/^([0-9a-f-]{36})\.localhost(?::\d+)?$/);
  if (!match) return next();

  const id = match[1];
  return serveStatic({
    root: path.relative(process.cwd(), DEPLOYMENTS_DIR),
    rewriteRequestPath: (p) => `/${id}/public${p}`,
  })(c, next);
});

root.route('/', app);
root.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = Number(process.env.PORT) || 4002;

serve({ fetch: root.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});