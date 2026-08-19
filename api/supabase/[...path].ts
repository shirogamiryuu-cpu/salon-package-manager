/**
 * Vercel Edge proxy for Supabase HTTP APIs.
 *
 * Browser -> https://<your-app>.vercel.app/api/supabase/<supabase-path>
 *         -> https://<project>.supabase.co/<supabase-path>
 *
 * Only the four HTTP surfaces the app uses are allowed through:
 *   auth/v1, rest/v1, functions/v1, storage/v1
 *
 * Realtime (WebSocket) is NOT proxied — Vercel serverless/edge functions
 * cannot hold a WebSocket upgrade. The client keeps talking to Supabase
 * directly for Realtime only.
 *
 * No service-role key is used or required here: the browser keeps sending its
 * own anon key + user JWT, so Row Level Security is fully preserved.
 */

export const config = { runtime: "edge" };

const TARGET = (
  process.env.SUPABASE_PROXY_TARGET ?? "https://elvvyhxdahaldpdfsksd.supabase.co"
).replace(/\/+$/, "");

const ALLOWED_PREFIXES = ["auth/v1", "rest/v1", "functions/v1", "storage/v1"];

// Same-origin browser calls need no CORS. These extra origins exist for the
// Capacitor native shells and local dev.
const DEFAULT_ORIGINS = [
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:8080",
];

function allowedOrigins(): string[] {
  const extra = (process.env.PROXY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  const url = new URL(req.url);
  const sameOrigin = origin === url.origin;
  if (!sameOrigin && !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, accept, accept-profile, content-profile, prefer, range, x-client-info, x-supabase-api-version, x-upsert",
    "Access-Control-Expose-Headers":
      "content-range, content-length, content-type, x-supabase-api-version",
    Vary: "Origin",
  };
}

// Headers we must never forward upstream (hop-by-hop / host-specific).
const STRIP_REQUEST = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-for",
  "x-vercel-id",
  "x-vercel-deployment-url",
  "x-real-ip",
]);

const STRIP_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/supabase\/?/, "");

  if (!ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return new Response(JSON.stringify({ error: "Path not allowed" }), {
      status: 403,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const upstream = `${TARGET}/${path}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);

  let res: Response;
  try {
    res = await fetch(upstream, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      redirect: "manual",
      // @ts-expect-error - required by undici/edge when streaming a request body
      duplex: hasBody ? "half" : undefined,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Upstream request failed", detail: String(e) }),
      { status: 502, headers: { ...cors, "content-type": "application/json" } },
    );
  }

  const out = new Headers();
  res.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE.has(key.toLowerCase())) out.append(key, value);
  });
  Object.entries(cors).forEach(([k, v]) => out.set(k, v));

  // Rewrite storage/auth redirects so the browser stays on the proxy origin.
  const location = res.headers.get("location");
  if (location && location.startsWith(TARGET)) {
    out.set("location", `${url.origin}/api/supabase${location.slice(TARGET.length)}`);
  }

  return new Response(res.body, { status: res.status, headers: out });
}
