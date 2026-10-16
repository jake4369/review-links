# ReviewBranch — Phase 4.1 Branding Patch

**Canonical domain:** https://reviewbranch.com

**Redirect:** https://reviewbranch.co.uk to the same URL path on https://reviewbranch.com. The redirect is **not live** until domains, DNS and hosting are configured.

This package contains only a safe local rebranding script; it does not include snapshots of Next.js source files.

## Apply

1. Make a Git checkpoint in your current project.
2. Extract this ZIP into your current project root (it adds `scripts/rebrand-reviewbranch.mjs` and this guide).
3. Run `node scripts/rebrand-reviewbranch.mjs` to preview the affected files.
4. Run `node scripts/rebrand-reviewbranch.mjs --apply` to apply the changes.
5. Review `git diff --check` and `git diff`; run `npm run lint`, `npx tsc --noEmit`, `npm run build`.
6. Run `git grep -n 'ReviewLinks' -- src README.md` to verify no old visible product name remains. `reviewLinks` camelCase identifiers should remain.

## What the script updates

- Visible text `ReviewLinks` -> `ReviewBranch` in `src` source files.
- Root `package.json` package name -> `reviewbranch` if it is currently `review-links-app`.
- Matching root package names in `package-lock.json`.
- The legacy installation-guide README is replaced with a short project README; otherwise visible `ReviewLinks` text is updated in the existing README.

## What the script deliberately does NOT change

- The on-disk folder name (`review-links-app`), existing Git repository, database or RLS.
- Business slugs, destination URLs, UUIDs, Supabase credentials, invitation text, environment variables, or `reviewLinks` JavaScript identifiers.
- Live DNS records, HTTPS certificate, domain redirects, authentication redirect allow-list, or canonical metadata. Those are part of the deployment stage.

## Production domain routing plan

1. Deploy ReviewBranch to the agreed hosting platform.
2. Connect `reviewbranch.com` as the canonical production domain.
3. Connect `reviewbranch.co.uk` and configure a **permanent host redirect** to `reviewbranch.com`, preserving the original path and query string.
4. Also configure `www.reviewbranch.com` and `www.reviewbranch.co.uk` to redirect to `https://reviewbranch.com` if desired.
5. Test `https://reviewbranch.co.uk/r/testbus?source=qr` and confirm the redirect reaches `https://reviewbranch.com/r/testbus?source=qr` (when that business is published).
6. Configure Supabase authentication URL settings for the production domain; check QR codes, invitation messages and HTTPS redirects.

Do not create the domain redirect until the canonical site is reachable over HTTPS.
