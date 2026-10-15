# ReviewLinks — Phase 3.3 Notification Refinement

This is a focused follow-up to the **Phase 3.3 Accessible Destination Ordering & Safer Removal** update.

## What changed

Only `src/components/ProfileEditor.tsx` is replaced. All ordering, confirmation, URL validation, Supabase calls and UUID-based saving remain in place.

- **Successful saves** display a top-of-screen confirmation for **6 seconds**, then disappear automatically. No click is required.
- **Routine information** (e.g. cancellation of a removal) also disappears after **6 seconds**.
- **Errors** remain visible until dismissed or corrected. Error notifications keep a Dismiss button; success notifications do not need one.
- **Pending deletion and ordering** are still identified in the persistent inline *Unsaved changes* warning until the changes are saved or the form is abandoned.
- **Completed deletion** is reported only after successful saving and reloading from the database.
- A subtle **✓ Saved to your profile** indicator appears below the Save Changes button after successful saving. It disappears when the form is edited, a destination is removed/added, or its order changes.
- The notification remains a polite live announcement for success/info and an alert for errors.

## Installation

Before extracting, create a Git checkpoint or save a copy of your current `src/components/ProfileEditor.tsx`.

From the project root:

```bash
cd ~/Documents/review-links-app
unzip -o ~/Downloads/reviewlinks-phase-3-3-notifications.zip -d .
npm run lint
npx tsc --noEmit
npm run build
```

No SQL changes or additional npm packages are required.

## Manual tests (use `testbus`)

1. Save a valid change. Verify the top success notification appears **immediately**, then disappears after approximately **6 seconds** without needing to dismiss it.
2. Check the small *Saved to your profile* indicator remains near Save Changes. Edit any field or reorder/remove/add a destination; verify it clears.
3. Enter an invalid review URL and try to save. The error message should **remain beyond 6 seconds** and the affected input should still be highlighted until corrected. You may dismiss the top error manually; field-level errors remain.
4. Click Remove on a saved destination, then confirm. Check that the **Unsaved changes** warning stays visible after the top informational message disappears. Refresh without saving: the record should reappear.
5. Repeat removal, then save. Verify the top notification reports a completed removal **only after** success. Check the record is absent after refresh.
6. Click Remove > Keep destination. The short information message should disappear automatically; the link should remain.
7. Try Move Up / Move Down, save and refresh. Check the public review page displays the new order and UUIDs remain stable.
8. With a published profile, attempt to remove its last link. Verify the save fails and the error does not auto-dismiss.
9. Test on mobile, with keyboard and VoiceOver; run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## Scope and limitations

The supplied TSX component passed TypeScript syntax/transpilation checks, but it was **not** compiled against your local Next.js project and connected Supabase instance. Complete the tests above.

The original `review_links_unique_platform_idx` restriction is unchanged; do not remove it until the coordinated legacy function cutover in the next phase.
