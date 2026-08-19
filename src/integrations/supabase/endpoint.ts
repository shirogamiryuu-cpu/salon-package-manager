/**
 * Supabase network endpoint resolution.
 *
 * Some networks (notably several ISPs in Myanmar) cannot reach
 * `*.supabase.co` over HTTPS, which surfaces in the app as "Failed to fetch".
 * To work around that we can route all Supabase *HTTP* traffic through a
 * same-origin proxy that we control (a Vercel Edge route at
 * `/api/supabase/*`).
 *
 * Configure with `VITE_SUPABASE_PROXY_URL`, e.g.
 *   VITE_SUPABASE_PROXY_URL="https://my-app.vercel.app/api/supabase"
 * Later, with a custom domain, just change it to
 *   VITE_SUPABASE_PROXY_URL="https://api.example.com/api/supabase"
 * Leave it unset to talk to Supabase directly (current default behaviour).
 *
 * Realtime (WebSocket) is intentionally NOT proxied — serverless/edge
 * functions cannot hold a WebSocket upgrade, so the Realtime client keeps
 * using the canonical Supabase URL.
 */

const RAW_PROXY = (import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined)?.trim();

export const SUPABASE_PROXY_URL = RAW_PROXY ? RAW_PROXY.replace(/\/+$/, "") : null;

/** Rewrite an absolute Supabase URL onto the proxy origin (no-op if unset). */
export function proxiedUrl(input: string, supabaseUrl: string): string {
  if (!SUPABASE_PROXY_URL) return input;
  const base = supabaseUrl.replace(/\/+$/, "");
  return input.startsWith(base) ? SUPABASE_PROXY_URL + input.slice(base.length) : input;
}

/**
 * A `fetch` implementation for the Supabase JS client that transparently
 * redirects auth / rest / functions / storage calls to the proxy.
 */
export function createProxyFetch(supabaseUrl: string): typeof fetch | undefined {
  if (!SUPABASE_PROXY_URL) return undefined;
  return (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" || input instanceof URL) {
      return fetch(proxiedUrl(input.toString(), supabaseUrl), init);
    }
    const rewritten = proxiedUrl(input.url, supabaseUrl);
    return rewritten === input.url ? fetch(input, init) : fetch(new Request(rewritten, input), init);
  };
}
