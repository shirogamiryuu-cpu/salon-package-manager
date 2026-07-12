## Goal
Let admins enter a manual price override when (1) assigning a package to a customer, (2) adding sessions to an existing package, and (3) deducting a session — for one-off discounts. The override propagates through the deposit math, commissions, and history so revenue/reports reflect the real charged amount.

## What already exists
- `assignPackage` and `adminAddSessions` already accept `totalPrice` / `addedPrice` args, but the UI doesn't always expose them clearly.
- `useSession` → `respondSessionRequest` always **computes** `price_applied` from variant/package price. There is no way to override it.

## Changes

### 1. Database
Migration on `session_deduction_requests`:
- Add `manual_price NUMERIC(10,2) NULL` — admin-entered override carried from request → approval.

(No changes to `usage_logs`; it already has `price_applied`.)

### 2. Edge function `supabase/functions/admin-api/index.ts`
- `useSession`: accept optional `manualPrice`. Validate `>= 0`. Persist into the new `session_deduction_requests.manual_price` column.
- `respondSessionRequest`: when `req.manual_price` is set, use it as `price_applied` and set `was_first_time = false` (manual price overrides first-time logic). Deposit-sufficiency check uses the manual price for this session instead of the computed unit.
- `assignPackage`: no logic change — already honors `totalPrice`; just ensure it's used when provided (already true).
- `adminAddSessions`: no logic change — already honors `addedPrice`.
- Commission trigger already prefers `usage_logs.price_applied` for revenue, so overrides automatically flow into commissions.

### 3. SPA wrappers `src/lib/admin.functions.ts`
- Extend `useSession` signature with `manualPrice?: number`.

### 4. UI
- **Assign package dialog** (`admin.customers.$id.index.tsx` or the assign modal it uses): surface/label the existing "Total price" input as "Total price (override for discounts)" with a helper hint; default to computed price × sessions but editable.
- **Add sessions dialog** (`admin.customers.$id.packages.$cpId.tsx`): same treatment for `addedPrice` — label as "Added price (override)".
- **Deduct-session dialog** (staff/admin flow that calls `useSession`, in `admin.customers.$id.packages.$cpId.tsx` / staff index): add a new optional "Custom price for this session" number input. If left blank → current behavior. If filled → passed as `manualPrice`.
- Customer approval screen (`app.notifications.tsx`) shows the request; if `manual_price` present, display it so the customer sees the actual charge before approving.

### 5. History display
- No schema change; existing `price_applied` column already renders on history rows (`app.history.tsx`, admin history). Will automatically show the overridden value.

## Out of scope
- No changes to promotions, warranty, or points logic.
- No bulk re-price tool for past sessions.

## Technical notes
- Validation: manual price must be a non-negative number and, for `useSession`, cannot exceed remaining deposit balance (`deposit_amount - already-consumed`), otherwise the deposit check throws as it does today.
- Backwards compatible: `manual_price` is nullable; existing requests keep computed pricing.
