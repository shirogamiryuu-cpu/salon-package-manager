
## Goal

Replace the current minimal pre-signin page with a proper public marketing site — a Home ("About Us"-driven) plus at least 3 additional public pages — styled to the uploaded Charme branding guidelines.

## Public pages (all accessible without signing in)

1. **/** — Home / About Us hero
   - Full-viewport hero with Charme logo, tagline "beautify with confidence"
   - Short brand story section
   - Feature strip (Hair · Nails · Men · Kids) using the iconography from the guidelines (Scissors, Nail polish, Comb, Wand)
   - Call to action → Sign in / Sign up
2. **/about** — Our Story
   - Founding story, philosophy, "beautify with confidence" ethos
   - Values (3 pillars) with hairline dividers
   - Team highlight (Co-Founder & CEO placeholder from guidelines)
3. **/services** — What We Do
   - 4 service categories (Hair, Nails, Men, Kids) as editorial cards with icon + description
   - Signature treatments list
4. **/contact** — Visit Us
   - Address: 14 Scotts Road #04-105, Far East Plaza, Singapore 228 213
   - Phone (65) 6733 6958, socials /beautifullycharme, @bellusdecharme
   - Opening hours: Mon–Fri 11:30–20:30, Sat/Sun/PH 11:30–19:30
   - Simple map embed (Google Maps iframe) + sign-in CTA

## Shared public layout

New `src/routes/_public.tsx` layout route wrapping the 4 pages with:
- Slim top nav: logo left; links Home · About · Services · Contact; "Sign in" button right (gold outline)
- Footer: logo, address, hours, socials, copyright, subtle Charme pattern hint
- Auto-redirect to `/app` / `/admin` / `/staff` if a session already exists (preserved from current landing behavior)

Files:
- new `src/routes/_public.tsx` (layout with nav + footer + session redirect)
- rewrite `src/routes/index.tsx` → Home
- new `src/routes/about.tsx`
- new `src/routes/services.tsx`
- new `src/routes/contact.tsx`

## Branding application (from PDF)

- **Palette**: warm cream background `#FAF9F7`, ink `#222`, gold accent `#B79A5C` (mapped to Pantone 871C gold family in guidelines), muted gold tints for section bands. Reuse the existing tokens in `src/styles.css` — no new color tokens needed.
- **Typography**: keep Cormorant Garamond (already loaded) as the Didot/Bodoni stand-in for display; body in same serif per current design system. Headings use wide letter-spacing (0.18–0.2em) per current rules.
- **Motifs**:
  - Hairline 1px `#333` dividers between sections
  - Slash motif: a 20°-rotated thin gold slash used as a section separator / accent (pure CSS, no image asset)
  - Twinkle/dot micro-pattern behind hero using an inline SVG at ~15% opacity (per "50% opacity" guidance for background use; toned down for web legibility)
- **Iconography**: use `lucide-react` equivalents — Scissors (Hair), Sparkles (Nails), User (Men), Baby (Kids). Each icon sits inside a 20°-rotated hairline square to echo the brand's slash rule.
- **Logo**: reuse existing `@/public/EmpireCharme.png` import already used in `app-shell.tsx`.

## Behavior

- All 4 routes are `ssr: false` and public (outside the `_authenticated` layout).
- The `_public` layout runs the same session check as today's `Landing` and redirects signed-in users to their role-based home. Unauthenticated visitors see the marketing pages.
- Nav uses TanStack Router `<Link>`; active link gets the gold underline treatment matching the app shell.

## Out of scope

- No changes to authenticated routes, admin, staff, or customer flows.
- No changes to database, edge functions, or auth logic.
- No new fonts, colors, or design tokens beyond what's already in `src/styles.css`.
- No copywriting sign-off — placeholder brand copy inspired by the guidelines; user can revise.
