# Variant-aware session deduction with first-time pricing

## Behavior

When an admin deducts a session on a customer package:

- If the package has variants, admin picks which variant applies for **this** session (defaults to the variant chosen at assignment, if any). Admin can switch per session.
- Price applied is decided as follows:
  - If this is the customer's **first purchase** of this package (any variant) AND this is the **first session** ever deducted on that purchase → use the variant's `first_time_price` (fall back to package `first_time_price`, then variant `price`, then package `price`).
  - Otherwise → variant `price` (fall back to package `price`).
- "First purchase of this package" = the customer has no prior `customer_packages` row for the same `package_id` with any session already used. Once any session on any purchase of that package has been deducted, all future purchases of the same package (any variant) are treated as non-first-time.
- The chosen variant and the price actually charged are recorded on the `usage_logs` row so history reflects exactly what was applied.

## Data changes

Add to `usage_logs`:
- `variant_id uuid null` (FK to `package_variants`)
- `variant_label text null` (snapshot)
- `price_applied numeric not null default 0`
- `was_first_time boolean not null default false`

No changes to `customer_packages` schema. Existing `variant_id` there stays as the assignment default.

## Backend (`admin-api` edge function)

Update `useSession` action:
- Accept `variantId?: string | null` in payload.
- Load the customer package + its package + variants.
- Compute `isFirstTimeEligible`:
  - Find all `customer_packages` for this `customer_id` + `package_id`.
  - Query `usage_logs` for any row whose `customer_package_id` is in that set AND (`used_at` is earlier than now OR simply exists) — if none exist, this is the first-ever session for this customer on this package → eligible.
- Resolve price using the rules above.
- Insert `usage_logs` with `variant_id`, `variant_label`, `price_applied`, `was_first_time`.
- Decrement `sessions_remaining` (unchanged).
- Continue existing staff-approval / session_deduction_requests flow; carry `variantId` through the request row so the eventual log records the variant the admin picked when creating the request.

Add `variant_id` + `variant_label` columns to `session_deduction_requests` (nullable) so pending requests remember the admin's variant choice until staff approves.

## Frontend

`src/routes/_authenticated/admin.customers.$id.index.tsx` (deduction dialog):
- If the package has variants, show a variant select (default = assigned variant, else first variant).
- Show a live price preview: "First-time price $X" badge when eligible, else "$Y". Compute eligibility client-side from the loaded data (mirrors server), server is source of truth.
- Pass `variantId` to `useSession`.

`src/lib/admin.functions.ts`:
- Extend `useSession` typing with `variantId?: string | null`.

History views (`admin.history.tsx`, `app.history.tsx`, `staff.history.tsx`):
- Show variant label and `price_applied` on each row (small text, non-intrusive).

## Files touched

- New migration: add columns to `usage_logs` and `session_deduction_requests`.
- `supabase/functions/admin-api/index.ts` — `useSession`, `respondSessionRequest`, history queries.
- `src/lib/admin.functions.ts` — typing.
- `src/routes/_authenticated/admin.customers.$id.index.tsx` — deduction dialog UI.
- `src/routes/_authenticated/admin.history.tsx`, `app.history.tsx`, `staff.history.tsx` — display applied variant + price.
- `src/integrations/supabase/types.ts` — regenerated after migration.
