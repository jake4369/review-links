# ReviewLinks — Phase 3.2: Dynamic Review Destinations

## Prerequisites

- Phase 3.1 migration is installed and **all 10 checks passed**.
- PostgreSQL function `public.save_business_profile_v2(uuid,text,text,text,text,jsonb)` exists and grants EXECUTE to `authenticated`.
- The existing `review_destination_is_valid(text,text)` function and URL CHECK constraint remain in place.
- Your current app is based on the prior Step 4C package and inline URL validation patch.

This ZIP updates the existing dynamic editor; it is based on those previously delivered files, not a live checkout of your Mac. **Review your diff before applying.**

## Very important: one-line type change before applying the ZIP

Open `src/lib/businesses.ts`. Change the `ReviewLink` platform property from this:

```ts
platform: "Google" | "Trustpilot" | "Facebook";
```

to:

```ts
platform: string;
```

Keep the rest of `src/lib/businesses.ts` unchanged. This allows the owner dashboard to display and publish businesses using custom destinations. Do not delete the hardcoded demo business; the homepage may still use it.

## Files in this ZIP

- `src/components/ProfileEditor.tsx` — adds/removes up to ten custom destinations, with editable names, URL fields, inline validation and accessibility attributes. Existing links retain database UUIDs after saving.
- `src/app/dashboard/edit/actions.ts` — authenticated server save action, with row-specific feedback and `save_business_profile_v2` RPC.
- `src/app/dashboard/edit/page.tsx` — loads all destinations, including their permanent UUIDs, from PostgreSQL.
- `src/app/dashboard/page.tsx` — loads all destinations for the owner dashboard, not just Google/Trustpilot/Facebook.
- `src/lib/review-destination-validation.ts` — same client-side URL validator as the previously tested inline-validation patch; included for completeness.

## Install

1. Stop `npm run dev` or `npm run start` if running.
2. Save a Git checkpoint:

```bash
git add . && git commit -m "Checkpoint before Phase 3.2 dynamic review destinations"
```

3. Make the **one-line type change** above to `src/lib/businesses.ts`.
4. Extract this ZIP in the root of your `review-links-app` directory, preserving `src/...` paths. Example, after downloading to `~/Downloads`:

```bash
unzip -o ~/Downloads/reviewlinks-phase-3-2.zip -d .
```

5. Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

**Do not drop `review_links_unique_platform_idx` or remove the original `save_business_profile` function yet.** The old editor/function might still be needed for rollback. Until they are retired, give each destination a distinct platform name (e.g., `Google — Wolverhampton` and `Google — Birmingham`).

## Testing — please do this before Phase 3.3

1. Sign in as DevXDesign. Check that the two existing destination records display correctly in `/dashboard/edit`.
2. Add **Checkatrade**, using a *genuine* HTTPS review URL. Save and refresh; it must remain and show a UUID in Supabase.
3. Add another custom service; save again **without refreshing**. Verify the Checkatrade UUID didn't change (the server action returns new IDs and updates the editor state).
4. Change an existing destination's display name and URL. Save; its UUID must be retained.
5. Remove one destination, save, refresh and confirm it is gone.
6. Attempt to add an eleventh destination: the Add button must be disabled at ten.
7. Test an invalid URL such as `https://google.com.example.org/review`: highlight the offending field and reject the save. Other fields should remain unsaved (atomic transaction).
8. Test duplicate platform names: the editor must explain the temporary unique-name restriction.
9. Confirm the public review page lists the newly added destinations and their hostnames.
10. Confirm the dashboard can publish a draft whose **only** destination is custom (e.g., Checkatrade). You may want to use the `testbus` account.
11. Verify a published business cannot save with zero destinations.
12. Verify that Account B cannot modify Account A's review destinations.

**Known limitations:** Reordering controls are reserved for Phase 3.3; records currently appear in their current order with additions appended. The unique-platform-name index remains until a later coordinated cutover. Production domain/QR deployment remains pending.

## Recovering from a failed installation

Use your Git checkpoint to restore the four modified files and the one-line type change. The old `save_business_profile` function is intentionally still installed; no SQL changes are needed for Phase 3.2.
