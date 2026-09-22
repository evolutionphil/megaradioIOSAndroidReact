// Keep megaradio-tv intact: it owns the pre-migration asset store and custom domain.
// This Worker runs on a route in front of it and only falls back through a binding.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET, HEAD, OPTIONS' } });
    }
    const isEntry = url.pathname === '/' || url.pathname === '/index.html';
    const assetURL = new URL(url);
    if (isEntry) assetURL.pathname = '/index.html';
    let response = await env.ASSETS.fetch(new Request(assetURL, request));
    if (response.status === 404 && !isEntry && url.pathname !== '/version.json') {
      response = await env.LEGACY_CDN.fetch(request);
      // The old static host uses SPA fallback. Missing files must not become HTML.
      if ((response.headers.get('content-type') || '').includes('text/html')) {
        response = new Response('Not found', { status: 404 });
      }
    }
    const result = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
    if ((result.headers.get('content-type') || '').includes('text/html') || isEntry) {
      // Preserve the TV bootstrap bytes; edge-injected browser scripts break old TVs.
      result.headers.set('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-transform');
    } else if (url.pathname === '/version.json') {
      result.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (response.ok && url.pathname.startsWith('/assets/')) {
      result.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      result.headers.set('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    }
    return result;
  },
};
