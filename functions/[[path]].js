import { onRequest as handleAdRequest } from './dh.js';

/**
 * Cloudflare Pages Functions catch-all route.
 *
 * Pages Functions normally map functions/dh.js to /dh rather than /dh.js.
 * This catch-all keeps the public integration URL as /dh.js while allowing
 * normal static assets and the root page to pass through to Pages assets.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/dh.js') {
    return handleAdRequest(context);
  }

  return context.next();
}
