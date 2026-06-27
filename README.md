# Salon Manager (React + Vite SPA)

Mobile-first salon package manager. Built as a pure React + Vite SPA so it can ship to web **and** Capacitor Android.

## Stack

- **Vite 8** + **React 19** (SPA, no SSR)
- **TanStack Router** (file-based routing, hash history for Capacitor compatibility)
- **TanStack Query** for data fetching
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** (Lovable Cloud) — Postgres, Auth, Storage
- **Supabase Edge Function** `admin-api` for all privileged operations (service-role key stays server-side)

## Develop

```bash
bun install
bun run dev
```

Visit http://localhost:8080.

### Seed the initial admin

POST to the edge function once to create `admin@salon.com / SalonAdmin!2026`:

```bash
curl -X POST "$VITE_SUPABASE_URL/functions/v1/admin-api" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -d '{"action":"seedAdmin"}'
```

## Build for web

```bash
bun run build       # writes dist/
bun run preview
```

## Build for Android (Capacitor)

```bash
bun add -d @capacitor/cli
bun add @capacitor/core @capacitor/android
bun run build
npx cap add android
npx cap sync android
npx cap open android
```

`capacitor.config.ts` is preconfigured. The app uses hash-based routing so deep links and refreshes work inside the WebView without any server rewrites.

## Architecture notes

- All admin/staff/cross-user reads and writes go through `supabase/functions/admin-api/index.ts`.
- Client-side admin call helpers live in `src/lib/admin.functions.ts` and use `src/lib/admin-api.ts`.
- The `useServerFn` import in route files comes from `src/lib/server-fn.ts` — an identity shim kept for source-compat with the previous TanStack Start setup.
- Customer-owned reads (their packages, their profile) use the browser Supabase client directly with RLS.
