# ReviewBranch — Shared sticky navigation (Phase 4.1 refinement)

## Design
- Desktop (`lg` and above): logo left; "How it works", "Log in" (or "Dashboard" and "Log out") as directly visible, centre-aligned links. No hamburger.
- Phone/tablet: logo left, hamburger right. All links and authentication actions inside the dropdown. No logo/login collision at 320px.
- Sticky, full-width header on homepage and dashboard, with subtle border and backdrop.
- **No header on `/r/[slug]`** because public review pages remain outside the `(site)` route group.
- Includes Escape, outside click, focus states, focus return and session updates.

## Installation — one reviewed step at a time

1. Save a Git checkpoint **before** installing:

   ```bash
   cd ~/Documents/review-links-app
   git add .
   git commit -m "Checkpoint before shared sticky navigation"
   ```

2. Extract the ZIP to your project root:

   ```bash
   unzip -o ~/Downloads/reviewbranch-shared-sticky-header.zip -d .
   ```

3. Run the **dry run** first:

   ```bash
   node scripts/install-shared-site-layout.mjs
   ```

   It must say `PRECHECK PASSED`. If it stops, **do not** manually move files. Share the error and `src/app/dashboard/layout.tsx` to create a tailored installation.

4. Apply:

   ```bash
   node scripts/install-shared-site-layout.mjs --apply
   ```

5. Verify:

   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   npm run dev
   ```

6. Test at 320, 375, 390, 768 and 1024px: desktop/mobile; signed in/out; menu keyboard; sticky scroll; dashboard session; no site navigation on `/r/testbus`; no duplicate headers. Confirm `/dashboard/edit` still saves properly.

## Notes
- Route groups do **not** appear in URLs. `/dashboard` and `/r/testbus` stay exactly the same.
- The root layout `src/app/layout.tsx`, Supabase Auth, redirects, database, public profile, and links are unchanged.
- Existing `src/components/HomeSiteHeader.tsx` and `src/components/HomeAuthNav.tsx` remain in the project for now but are no longer rendered; remove obsolete components after the new layout passes tests.
- The dashboard's auth guard and content wrappers are preserved. The installer removes only its old branded `<header>` block.
- The installer is intentionally conservative. It will not alter an unexpected dashboard layout.
- If lint flags an import or declaration that was only used by the removed dashboard header, share the exact error and the dashboard layout; the change is small and we should fix it rather than rewriting the entire layout blindly.
