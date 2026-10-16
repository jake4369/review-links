# ReviewBranch — homepage login / dashboard navigation

A minimal navigation enhancement for the existing **Next.js 16 App Router + Supabase Auth** application. It keeps the marketing homepage static and puts authentication checks in a small client component. No new packages, migrations or environment variables are required.

## Before installation

Create a clean Git checkpoint. The installer will **not** overwrite the homepage with an archived version; it only adds a component into its existing `<header>`. It deliberately stops if it cannot identify an unambiguous header, or if the header already contains other navigation.

## Install

From `~/Documents/review-links-app`:

```sh
unzip -o ~/Downloads/reviewbranch-home-navigation.zip -d .
node scripts/install-home-nav.mjs            # dry run
node scripts/install-home-nav.mjs --apply    # apply only if the dry run is sensible
npm run lint
npx tsc --noEmit
npm run build
```

If the installer refuses to edit because there is no single `<header>` or there is existing navigation, no homepage changes are made. Open `src/app/page.tsx`, import `HomeAuthNav` and place `<HomeAuthNav />` as a sibling to the brand mark inside your existing header. Do **not** nest it inside a linked logo. If you're unsure, share your homepage component so it can be integrated precisely.

## Test

1. Signed out: visit `/` and confirm **Log in** links to `/login`.
2. Signed in: visit `/` and confirm **Dashboard** and **Log out** appear.
3. Click Dashboard: goes to `/dashboard` with the correct account.
4. Click Log out: account navigation changes back to Log in; `/dashboard` should now redirect to `/login`.
5. Open `/` in a private window, on phone widths, and with keyboard Tab/Enter/Space.
6. Confirm no unexpected layout shift, console errors or Supabase authentication regression.

## How it works

`src/components/HomeAuthNav.tsx` uses the same `@/lib/supabase/client` factory as your other client-side Supabase code, listens for auth changes (including other tabs), and asks Supabase for the signed-in user on mount. The auth state is **display-only**: the dashboard still enforces login on the server, and database RLS remains authoritative. Log out invokes `supabase.auth.signOut()` and refreshes the current route.

If your existing dashboard uses a custom centralized sign-out action, this independent homepage sign-out can be adapted to call it instead. Both paths use the same underlying Supabase session semantics; no server-side security protections have been changed.

This patch does not alter the domain configuration, brand metadata, database schema, or business links.
