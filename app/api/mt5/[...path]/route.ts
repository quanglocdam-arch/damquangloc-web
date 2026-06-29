type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

async function getPath(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.path ?? [];
}

function jsonError(message: string, status = 500) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  const baseUrl = process.env.MT5_API_BASE_URL || "https://api.damquangloc.com";
  const apiKey = process.env.MT5_API_KEY;

  if (!apiKey) {
    return jsonError("Missing MT5_API_KEY environment variable", 500);
  }

  const path = await getPath(context);
  const upstreamPath = path.join("/");

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${upstreamPath}`, baseUrl);

  incomingUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  targetUrl.searchParams.set("api_key", apiKey);

  const upstream = await fetch(targetUrl.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  const contentType = upstream.headers.get("content-type") || "application/json";
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}
