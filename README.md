# ReviewLinks — bottom Dashboard button (post-Phase 3.4 UX refinement)

This is an incremental update to the **Phase 3.3 Notifications** version of `src/components/ProfileEditor.tsx`.

## What changed

- Added **Back to dashboard** beside **Save Changes** at the bottom of the editor. The buttons stack on small screens and sit side by side on wider screens.
- The existing **Back to dashboard** link at the top remains.
- Both dashboard links warn before discarding **unsaved changes**. Choosing Cancel leaves the user in the editor; choosing OK leaves without saving.
- While a save request is pending, dashboard navigation from either link is prevented.
- Reloading or closing the tab with unsaved changes triggers the browser's standard unsaved-changes warning (where supported).
- A successful server save clears the unsaved-changes flag, so the bottom dashboard link navigates without a warning.
- The existing six-second success notifications, persistent errors and small **Saved to your profile** indicator remain unchanged.

## Install

Create a Git checkpoint first, then extract the ZIP **at your Next.js project root**:

```bash
cd ~/Documents/review-links-app
git add .
git commit -m "Phase 3.4 signed off before bottom dashboard navigation"
unzip -o ~/Downloads/reviewlinks-bottom-dashboard-button.zip -d .
npm run lint
npx tsc --noEmit
npm run build
```

Only `src/components/ProfileEditor.tsx` is replaced. No SQL or new npm dependencies are required.

## Tests

1. Load `/dashboard/edit` and scroll down: the two buttons should be visible on mobile and desktop.
2. With no changes made, click **Back to dashboard** at the bottom: should navigate without a warning.
3. Edit the welcome message without saving; click the **bottom** dashboard button. **Cancel** should keep you on the editor; **OK** should leave without saving.
4. Repeat using the **top** dashboard link.
5. Edit a destination URL, confirm removal, and reorder destinations separately; each should count as unsaved changes.
6. Save a valid change: the small saved indicator should appear. The bottom dashboard link should return to the dashboard without a warning.
7. Make an additional edit after saving: the saved indicator should disappear and the leave warning should return.
8. Refresh the browser tab with unsaved edits: the browser should warn before discarding the edits (browser behavior varies).
9. Confirm the 6-second success notice, persistent errors, removal confirmation, saved order and public review page still work.

## Validation and scope

This file passed TypeScript TSX syntax/transpilation checks in the authoring environment, but has **not** been compiled against your local Next.js project or exercised against live Supabase data. Run the three checks above and the browser tests.

Phase 3.5 legacy database cleanup is **not** included here. Do not drop the old save function or unique index yet.
