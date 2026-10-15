# ReviewLinks — Phase 3.3: Accessible Ordering & Safer Removal

This package is built from the **Phase 3.2 ProfileEditor.tsx** used in the previous ReviewLinks update. It intentionally contains only one modified source file:

- `src/components/ProfileEditor.tsx`

## What changed

1. **Accessible ordering.** Up and Down controls update the form order. First/last actions are disabled as appropriate; each button has a descriptive accessible name. After movement, a live announcement describes the new position. Keyboard focus follows the moved destination.
2. **Removal confirmation.** `Remove` now opens an inline confirmation with `Yes, remove` and `Keep destination`. Removing changes only the unsaved editor state. Business data is not deleted until Save Changes is successful.
3. **Clear removal states.** Previously saved destinations marked for removal appear in an unsaved-changes notice. Following a successful save and re-fetch of database records, an on-screen notification confirms how many destinations were removed.
4. **Immediately visible feedback.** Success, failure, and informational notifications appear in a fixed, dismissible, screen-reader-announced banner at the top of the viewport; users no longer have to scroll below Save Changes to see a result.
5. **Unchanged security/validation.** The existing save Server Action and Supabase `save_business_profile_v2()` function are retained, along with field-specific URL validation, the 10-destination limit, publication safeguards and UUID preservation.

## Install

**Commit your current working app first**, or back up `src/components/ProfileEditor.tsx`.

From your Next.js project root:

```bash
cd ~/Documents/review-links-app
unzip -o ~/Downloads/reviewlinks-phase-3-3.zip -d .
npm run lint
npx tsc --noEmit
npm run build
```

No SQL changes or additional npm packages are required.

## Verify, preferably using `testbus`

1. **Cancel removal:** Select Remove for a destination, then `Keep destination`. It must stay in the editor and in Supabase.
2. **Confirm removal:** Select Remove > `Yes, remove`. The destination disappears from the form, but the UI must say its deletion is **pending until Save Changes**. Refresh **without** saving to verify the persisted destination returns.
3. **Save a removal:** Repeat the removal, then save. The top notification must say a destination was successfully removed; refresh and check it is gone. Do this with a draft or with a published profile that has more than one destination.
4. **Protect last link:** When published, removing the last configured link and pressing Save should show an error immediately. PostgreSQL must retain that link.
5. **Reorder:** With at least two destinations, use Up/Down, save, refresh the editor, and inspect the public page. The order must persist and reflect `display_order`.
6. **Check stable UUIDs:** Use Supabase SQL Editor before/after reorder; `id` values must not change, only `display_order`.
7. **Keyboard:** Tab through the controls and activate Up/Down and confirmation buttons with Enter/Space. Check focus stays usable and position changes are announced by VoiceOver.
8. **Save result at the top:** Save successfully while scrolled near the bottom of the editor; confirm the notification is visible without scrolling. Then deliberately use an invalid destination URL to verify that an error notification is also visible.
9. **Regression:** Test adding a custom destination, editing URLs, reloading saved fields, QR sharing, publishing, and `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Expected behaviour and limitations

- Removing an **unsaved new row** only discards that row; no database deletion occurs.
- Removing a **previously saved row** is staged until Save Changes and database success. There is no claim of completed deletion beforehand.
- An interrupted save or failure to refresh saved records is **not** presented as a confirmed deletion; check the database state/reload before retrying.
- Reordering is also staged until Save Changes and uses the same v2 RPC, which derives `display_order` from list order.
- The old `review_links_unique_platform_idx` index still enforces distinct platform names; do not drop it during Phase 3.3. We will remove it during the coordinated legacy function cutover later.
- A full local Next.js build was not possible from this isolated source package; the TSX passed TypeScript **syntax** validation. Run the project checks shown above.
