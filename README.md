# ReviewBranch — Authentication Feedback UX

A narrowly scoped update to `src/components/AuthForm.tsx`, based on the last working login loading-UX component.

## What it changes

- **Sign In and Create Account errors:** both show a red-bordered, light-red feedback message, with readable dark-red text and an accessible `role="alert"` announcement. Supabase's original error text is preserved, including `Invalid login credentials`.
- **Successful account creation:** a separate green confirmation message (`role="status"`) instructs users to check their confirmation email.
- **Correcting an error:** editing the email or password clears a previous error message; switching between the two form modes also clears old feedback.
- **Field borders:** remain neutral for ambiguous authentication errors because the server cannot say which credential is incorrect. Browser `type=email`, `required` and `minLength` validation are preserved.
- Existing **Signing in...**, **Creating account...**, spinner, disabled-button behaviour, Supabase auth, origin-based confirmation redirect and dashboard navigation are preserved.

## Installation

From the project root:

```bash
cd ~/Documents/review-links-app
git status --short
git add .
git commit -m "Checkpoint before auth feedback update"
unzip -o ~/Downloads/reviewbranch-auth-feedback-ux.zip -d .
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

If `git commit` reports nothing to commit, continue. The ZIP overwrites **only** `src/components/AuthForm.tsx` and includes this README. If you have made further AuthForm changes after the last login UX patch, inspect `git diff` and merge instead of overwriting them blindly.

## Testing on localhost

1. Sign in with an incorrect password: `Invalid login credentials` (or the current Supabase message) appears inside the red error banner; the button is enabled again; both fields remain neutral.
2. Start correcting an input: the previous error message clears.
3. Enter valid credentials: spinner + `Signing in...` remain visible through dashboard navigation.
4. Create an account with an error (e.g. an email already associated with an account, if Supabase returns an error): it uses the **same red alert style** as login. Some Supabase signup flows intentionally don't disclose whether an email exists; do not assume a specific error message.
5. Create a new account requiring email confirmation: successful response shows the **green confirmation message**, not a red error.
6. Check keyboard focus, screen-reader announcement and mobile at 320px.

After passing, push the file to GitHub and verify on reviewbranch.com. No SQL, SMTP, DNS or Vercel variable changes are needed.

## Test limitation

The component passed a local TSX syntax/transpilation check and static assertions, **not** a full Next.js build, live Supabase sign-in or browser test. Those need to run in your project.
