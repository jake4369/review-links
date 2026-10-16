# ReviewBranch shared header — dashboard `<nav>` installer fix

Your dashboard layout has an existing `<nav>` element, not a `<header>`. This replacement installer recognises your exact structure, preserving `supabase.auth.getClaims()` and the redirect to `/login`.

This ZIP updates **only** `scripts/install-shared-site-layout.mjs`. It does not replace any JSX or existing data and does not itself move routes until you run with `--apply`.

## Installation

From `~/Documents/review-links-app` after your Git checkpoint:

```sh
unzip -o ~/Downloads/reviewbranch-shared-header-fix.zip -d .
node scripts/install-shared-site-layout.mjs
```

Check that you see `PRECHECK PASSED` and `DRY RUN ONLY` before proceeding.

Then:

```sh
node scripts/install-shared-site-layout.mjs --apply
npm run lint
npx tsc --noEmit
npm run build
```

The installer moves `src/app/page.tsx` to `src/app/(site)/page.tsx` and `src/app/dashboard/` to `src/app/(site)/dashboard/`, leaving existing `/` and `/dashboard` URLs untouched. It removes the now-duplicate header on the homepage and the redundant dashboard `<nav>`, preserving the dashboard authentication guard. It also updates filesystem-based imports such as `@/app/dashboard/edit/actions` to `@/app/(site)/dashboard/edit/actions` (and similar dashboard action imports), so the relocated modules continue to resolve. The previously extracted `SiteHeader.tsx` and `(site)/layout.tsx` remain in place. Customer pages under `/r/[slug]` stay outside the route group.

## Verify

The installer is guarded: it refuses unexpected dashboard markup and parent-relative imports that would escape the moved dashboard folder. If it reports a precheck failure, stop and share the error.

Test homepage and dashboard on desktop and 320px mobile, signed in and out, sticky scroll, logging out, redirects to login when signed out, and a public `/r/testbus` page **without** a shared header. Verify dashboard editing still saves.

If the build fails, do not deploy. Share the exact output or restore via your saved Git checkpoint.
