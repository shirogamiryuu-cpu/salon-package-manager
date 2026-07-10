## Call the salon — global button with admin-managed numbers

### What you'll get
- A **phone icon button** in the app header (visible on every authenticated page for customers, staff, and admins).
- Clicking it opens a dropdown listing every salon phone number with its label (e.g. "Reception", "Booking"). Tapping one launches the device's phone dialer via `tel:`.
- A new **Admin → Salon contacts** page where you can add, edit, reorder, and delete numbers. Numbers you add appear in the dropdown immediately.
- If no numbers are configured yet, the button is hidden so it never shows an empty menu.

### Where it appears
Global — inside `src/components/app-shell.tsx`, next to the existing header actions. Same button for admin/staff/customer.

### Technical details

**Database** — new migration:
- Table `public.salon_contacts` with `label` (text), `phone` (text), `sort_order` (int), `is_active` (bool), plus standard id/timestamps.
- GRANTs: `SELECT` to `anon` + `authenticated` (public directory), full CRUD to `service_role`; admins write via edge function.
- RLS: anyone signed-in can read active rows; writes restricted to admins via `has_role`.
- Small `updated_at` trigger reusing existing `update_updated_at_column()`.

**Edge function** (`admin-api`):
- Add `adminListSalonContacts`, `adminUpsertSalonContact`, `adminDeleteSalonContact` actions (admin-only, mirrors existing patterns).

**Frontend**:
- `src/components/salon-contacts-button.tsx` — new component using shadcn `DropdownMenu` + `Phone` icon; fetches active contacts once on mount.
- `src/components/app-shell.tsx` — mount the button in the header.
- `src/routes/_authenticated/admin.contacts.tsx` — new admin route: list, add/edit dialog (label + phone + sort order + active toggle), delete.
- `src/lib/admin.functions.ts` — thin wrappers for the three new actions.
- Add a nav link to the new admin page in the admin section of `app-shell.tsx`.

No changes to existing packages/pricing logic.
