import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { getCookie } from 'hono/cookie';
import {
  clearSession,
  requireNexusAdmin,
  isPublicRoute,
  verifySessionToken,
  SESSION_COOKIE,
} from './_lib/auth';
import { funnelsRoutes } from './_lib/routes/funnels';
import { customFieldsRoutes } from './_lib/routes/custom-fields';
import { webhooksRoutes } from './_lib/routes/webhooks';
import { notificationsRoutes } from './_lib/routes/notifications';
import { usersTeamsRoutes } from './_lib/routes/users-teams';
import { leadsRoutes } from './_lib/routes/leads';
import { authPublicRoutes } from './_lib/routes/auth-public';
import { adminRoutes } from './_lib/routes/admin';
import { trackingRoutes } from './_lib/routes/tracking';
import { marketingRoutes } from './_lib/routes/marketing';
import { bioLinksRoutes } from './_lib/routes/bio-links';
import { emailMarketingRoutes } from './_lib/routes/email-marketing';
import { segmentsRoutes } from './_lib/routes/segments';
import { automationsRoutes } from './_lib/routes/automations';
import { scoringRoutes } from './_lib/routes/scoring';

type Bindings = {
  DB: any; // Using any for D1Database to avoid type errors if @cloudflare/workers-types is not fully configured
  SESSION_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', async (c: any, next: any) => {
  if (isPublicRoute(c.req.method, c.req.path)) return next();
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: 'Autenticação não configurada no servidor.' }, 500);
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Não autenticado.' }, 401);
  const payload = await verifySessionToken(token, secret);
  if (!payload) {
    clearSession(c);
    return c.json({ error: 'Sessão inválida ou expirada.' }, 401);
  }
  c.set('authUser', payload);
  await next();
});

app.use('/admin/*', requireNexusAdmin);

// Safety net for the handful of routes with no try/catch of their own (an uncaught
// exception used to fall through to Hono's default error page). Never leaks
// error.message/stack to the client — only logs it server-side.
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Erro interno no servidor.' }, 500);
});

// Domain routers — each mounted at '/' so their own route paths (already
// matching the real /api/... URLs, since this app has basePath('/api')) are
// used as-is. See functions/api/_lib/routes/*.
app.route('/', funnelsRoutes);
app.route('/', customFieldsRoutes);
app.route('/', webhooksRoutes);
app.route('/', notificationsRoutes);
app.route('/', usersTeamsRoutes);
app.route('/', leadsRoutes);
app.route('/', authPublicRoutes);
app.route('/', adminRoutes);
app.route('/', trackingRoutes);
app.route('/', marketingRoutes);
app.route('/', bioLinksRoutes);
app.route('/', emailMarketingRoutes);
app.route('/', segmentsRoutes);
app.route('/', automationsRoutes);
app.route('/', scoringRoutes);

// NOTE: /debug-schema and /debug-db were removed — they dumped full table contents
// (including plaintext passwords from `users`) to any unauthenticated caller.

export { app };
export const onRequest = handle(app);
