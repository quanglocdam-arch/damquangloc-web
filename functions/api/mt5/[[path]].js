export async function onRequest(context) {
  const { request, env, params } = context;
  const pathParam = params.path;
  const path = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || 'health');
  const incomingUrl = new URL(request.url);
  const baseUrl = env.MT5_API_BASE_URL || 'https://api.damquangloc.com';
  const targetUrl = new URL(`/api/${path}`, baseUrl);

  incomingUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  if (env.MT5_API_KEY) {
    targetUrl.searchParams.set('api_key', env.MT5_API_KEY);
  }

  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: { accept: 'application/json' },
  });

  const headers = new Headers(upstream.headers);
  headers.set('cache-control', 'no-store');
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
