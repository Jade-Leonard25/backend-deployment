import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { secureHeaders } from 'hono/secure-headers';
import 'dotenv/config';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:5173'], // add your production domain later
}));
app.use('*', secureHeaders());
app.get('/api/health', async (c) => {
  try {
    // Later: await db.execute(sql`select 1`);  // verify DB connection
    return c.json({ status: 'ok' });
  } catch (e) {
    console.error('Health check failed:', e);
    return c.json({ status: 'error', message: 'Service unavailable' }, 503);
  }
});
app.get('/', (c) => c.text('Hello World'));

const port = Number(process.env.PORT) || 4002;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
