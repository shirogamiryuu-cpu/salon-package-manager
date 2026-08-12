## Goal

Let an admin deduct a session immediately, without waiting for the customer to approve — for customers who have no phone / no app access.

## How it works today

`useSession` always creates a pending row in `session_deduction_requests`, sends a push, and waits for the customer to call `respondSessionRequest`. Only on approval does the app reduce `sessions_remaining`, write the `usage_logs` row, and fire the commission trigger.

## Changes

### 1. Admin UI — Deduct dialog
In the "Deduct a session" dialog (`admin.customers.$id.index.tsx`), add a toggle:

- **Request customer approval** (default, current behaviour)
- **Deduct now without approval** — shown with a short warning line ("Use only when the customer has no app/phone. This is recorded as admin-approved.")

When the toggle is on, the confirm button reads "Deduct now" and no push is sent.

### 2. Backend — `admin-api` edge function
- `useSession` accepts a new optional `skipApproval: boolean`.
- When `skipApproval` is true (admin-only, already enforced by `assertAdmin`):
  - Run the same deposit/variant/manual-price validation as today.
  - Insert the `session_deduction_requests` row as usual (pending), then immediately perform the approval path server-side: decrement `sessions_remaining`, insert the `usage_logs` row with the computed `price_applied`, insert `session_staff` rows, and update the request to `approved` with `usage_log_id`.
  - Updating the request to `approved` keeps the existing commission trigger working unchanged, so commissions are still created.
  - Skip the push notification.
- The approval path is factored into a shared internal helper so `respondSessionRequest` and the skip-approval path use identical logic (no duplicated pricing rules).

### 3. Audit trail
Add `approved_by_admin BOOLEAN NOT NULL DEFAULT false` to `session_deduction_requests` (migration), set to true for admin-side deductions, so history can distinguish self-approved sessions.

### 4. History display
Admin history rows for these sessions show a small "Admin approved" tag; customer history is unchanged apart from the session appearing normally.

### 5. SPA wrapper
`src/lib/admin.functions.ts` → `useSession` signature gains `skipApproval?: boolean`.

## Out of scope
- No change to first-time pricing, variants, deposits, or commission rules.
- Staff (non-admin) users cannot skip approval.
