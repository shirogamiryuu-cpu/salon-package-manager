# Salon Package Manager — Core v1

A salon package management app on TanStack Start + Lovable Cloud. v1 covers the core flow; multi-admin, points adjustments, customer purchase flow, and audit logs come next.

## What you get in v1

**Auth & roles**
- Email/password sign-up & sign-in via Lovable Cloud
- Two roles: `admin`, `customer` (stored in a separate `user_roles` table — never on profiles)
- Seed migration creates `admin@salon.com` with temp password `Admin123!` and grants admin role; you'll be prompted to change it on first login
- Route gating: `/admin/*` requires admin role, `/app/*` requires sign-in

**Admin**
- Dashboard with totals (customers, packages, packages sold)
- Packages CRUD (name, description, price, total_sessions, points_awarded, image)
- Customers list + search by email/phone
- Customer detail: profile, points, owned packages with remaining sessions
- Assign a package to a customer (creates a customer_package with full sessions)
- "Use session" button decrements remaining count by 1 and writes a usage log

**Customer**
- Sign up (email, password, phone, optional avatar)
- Dashboard with profile + editable phone/avatar/password
- "My packages" list with remaining-sessions progress bars
- Browse available packages (read-only in v1 — purchase flow comes in v2)

**Not in v1 (next iteration)**
- Multi-admin creation UI, manual points adjustments + transactions audit, customer self-purchase flow, full usage history view per package

## Technical details

**Stack:** TanStack Start (already configured) + Lovable Cloud (Postgres, auth, storage) + Tailwind + shadcn/ui. Replaces the Node/Express + JWT + bcrypt + S3 stack in your spec — Cloud handles all of that natively.

**Schema (migration):**
- `profiles` (id → auth.users, phone, avatar_url, created_at) + auto-create trigger on signup
- `app_role` enum (`admin`, `customer`) + `user_roles` (user_id, role) + `has_role(uuid, app_role)` security-definer function
- `packages` (id, name, description, price numeric, total_sessions int, points_awarded int, image_url, created_at)
- `customer_packages` (id, customer_id, package_id, sessions_remaining, purchase_date)
- `usage_logs` (id, customer_package_id, used_at, admin_id)
- `customer_points` (user_id, points) — running total; transactions table deferred to v2
- RLS on all tables with explicit GRANTs:
  - Customers: read/update own profile, read own customer_packages, read all packages
  - Admins (via `has_role`): full read/write on packages, customers, customer_packages, usage_logs

**Storage:** one public `package-images` bucket and one public `avatars` bucket with per-user-folder write policies.

**Server functions** (`createServerFn` with `requireSupabaseAuth`, in `src/lib/*.functions.ts`):
- `assignPackage`, `useSession`, `adminListCustomers`, `adminGetCustomer` — gated by `has_role(uid,'admin')` check inside handler
- Plain client-side Supabase queries for customer's own data (RLS enforces)

**Routes:**
- `/` public landing
- `/auth` sign-in/sign-up
- `/_authenticated/app` customer dashboard, `/_authenticated/app/packages` browse
- `/_authenticated/admin` admin dashboard, `/admin/packages`, `/admin/customers`, `/admin/customers/$id` (admin role check inside each page, redirects non-admins)

**Seeding:** migration uses `supabaseAdmin` via SQL to insert the admin auth user + role grant. After first sign-in, the app forces a password change before showing the dashboard.

## Out-of-scope clarifications
- Your spec's `POST /api/admin/login` with hardcoded `admin123` is replaced by standard Supabase auth + the seeded account above (you can change the temp password I use before I run it if you'd like).
- File uploads go to Lovable Cloud Storage, not S3/Cloudinary.