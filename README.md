# ReviewLinks — Phase 2, Step 4C (drop-in files)

This package was prepared from the code and folder structure described in your ChatGPT conversation. It is **not** a copy of your complete Mac project. It does not include any credentials.

## Files in this package

- `src/app/dashboard/actions.ts` — publish/unpublish Server Action (new)
- `src/app/dashboard/page.tsx` — database-backed dashboard page (replacement)
- `src/components/BusinessDashboard.tsx` — QR code and manual sharing UI (replacement)
- `src/app/r/[slug]/page.tsx` — public published profile (replacement)
- `src/lib/supabase/public.ts` — unauthenticated client for public pages (new)
- `src/app/dashboard/edit/actions.ts` — profile save with public-page revalidation and guard against removing all published links (replacement)
- `src/components/ProfileEditor.tsx` — same editor, updated explanatory text (replacement)

## Before installing

1. Your Step 4A and 4B work must already be working, including the `public.save_business_profile(...)` PostgreSQL function and its permissions.
2. Keep your `src/app/dashboard/edit/page.tsx`, `src/lib/businesses.ts`, `src/hooks/useReviewProfile.ts`, `src/lib/supabase/server.ts`, and auth files: they are still needed.
3. The required packages should already be installed: `@supabase/supabase-js`, `@supabase/ssr`, and `qrcode.react`.
4. Your `.env.local` must include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Installation

**Back up your current work first.** In the root of your project:

```bash
git status
git add .
git commit -m "Checkpoint before ReviewLinks Step 4C"
```

Then copy the files from this archive into matching paths under your existing `review-links-app` folder. The archive contains seven files that replace or add code, plus this README. Avoid copying the files into a nested `reviewlinks-step-4c` folder: place the `src` folder's **contents** into your existing `src` tree.

**Unzip using Terminal (optional):** Copy the downloaded ZIP file into the root of your `review-links-app` project and run:

```bash
unzip -o reviewlinks-step-4c.zip
```

This overwrites matching files, so do this only after checking the included file names and backing up your local edits.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run dev
```

Then test:

1. Sign in at `/login`; visit `/dashboard`.
2. In `/dashboard/edit`, add a real HTTPS review destination and save.
3. Publish the profile on `/dashboard`.
4. Visit `/r/your-slug` in a signed-out/incognito browser. It should display the saved business name, welcome message and clickable platforms.
5. On the dashboard, copy the review URL, download the QR PNG, and test WhatsApp/SMS/email sharing; check the invitation message has the automatic URL suffix.
6. Edit the welcome message and refresh the public page to verify the change appears.
7. Unpublish. A signed-out visit to `/r/your-slug` should now return 404.
8. Republishing should restore the public page.

## Scope and limitations

- There is no real Supabase project or local Mac source available in this workspace, so live database and Mac build tests must be run on your device.
- This implements the **one-business-per-account** dashboard planned in earlier steps.
- A published business is prevented by the normal editor from removing its final review link. Database-level concurrency protection and complete multi-account RLS tests are for the security review (Step 5).
- The public page uses a Supabase **publishable** key (not service role). It ignores owner cookies so public access follows anonymous RLS.
- `localhost` QR codes are useful for development but cannot be opened by other devices without a hosted or accessible network address.
- Do not expose or commit secrets in Git or screenshots.
