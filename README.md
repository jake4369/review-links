# ReviewLinks — Inline Review URL Validation

Adds clear client and server feedback for invalid review destinations to the existing Step 4C editor. This is a focused usability patch; it does not implement the future custom-destination feature.

## Files

- `src/lib/review-destination-validation.ts` — shared policy-aware URL checks and specific error explanations (new).
- `src/components/ProfileEditor.tsx` — red-border highlighting, inline errors, focus on invalid URL, correction clears error (replacement).
- `src/app/dashboard/edit/actions.ts` — preserve server-side validation; use the PostgreSQL `review_destination_is_valid` function from Step 5C.3 to identify the rejected field (replacement).

## Before installing

You must have completed **Step 5C.3** including `public.review_destination_is_valid(text,text)` and its CHECK constraint. The authenticated role must be permitted to execute that validation function (PostgreSQL ordinarily grants EXECUTE to PUBLIC on newly created functions unless the privilege was revoked).

The patch is based on the Step 4C source package shared earlier in this chat. If you've changed the editor or save action since then, review the diff and merge, instead of blindly overwriting your changes.

## Install

Make a Git checkpoint first:

```bash
git add . && git commit -m "Checkpoint before inline URL validation"
```

Extract the contents of this ZIP **into the root** of your existing `review-links-app` folder so `src/...` paths align.

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Test

1. In Google URL, enter `https://google.com.example.org/review`, click Save. The Google field should turn red with a specific explanation and **nothing is saved**.
2. Change it to a genuine `https://g.page/...` or `https://www.google.com/...` review URL. The error should clear.
3. Try `http://...`, `https://localhost/...`, `https://www.google.com/url?q=...`, and credentials in an address: each should show an appropriate message.
4. Verify valid Google, Facebook and Trustpilot review links can still be saved and persist after refreshing.
5. Verify blank optional destination fields still remove an existing link (unless it is the last link on a published profile, which remains blocked).
6. Test a URL that looks valid to the browser but fails PostgreSQL's validation; it should be flagged by the server with the corresponding field highlighted.

The browser checks aim to match the current SQL validation from Step 5C.3. PostgreSQL remains authoritative; if the SQL function changes, update the helper too. Actual Supabase and Mac build tests still need running in your app.
