# ReviewBranch — Authentication loading UX (Phase 4)

This patch contains one file: `src/components/AuthForm.tsx`.

## Why this change?

The previous version cleared `loading` in the `finally` block immediately after calling `router.replace("/dashboard")`. Since Next.js navigation can continue after that call, the Sign In button looked idle while the next page was loading.

This version keeps a visible loading state through the Supabase request **and** the Next.js navigation via `useTransition`:

- Disabled button during submission/navigation, plus animated spinner.
- **Signing in...** or **Creating account...** text.
- Accessible live status for screen readers.
- Keeps the existing `emailRedirectTo` production fix.
- Re-enables the form after an auth error, or when signup requires email confirmation.
- Prevents switching between login/signup mid-request.

## Apply

From the project root on your Mac:

```bash
cd ~/Documents/review-links-app

git status --short
git add .
git commit -m "Checkpoint before login loading UX"

unzip -o ~/Downloads/reviewbranch-auth-loading-ux.zip -d .

npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

The zip will overwrite `src/components/AuthForm.tsx`. Confirm that your current file still resembles the previously shared version (email/password form and Supabase `emailRedirectTo`) before replacing it. If you have newer changes, back up/merge rather than overwriting them.

## Test

1. Submit valid credentials on localhost. Button shows spinner and **Signing in...**, is disabled until dashboard appears.
2. Submit incorrect credentials. Button becomes enabled again and error displays.
3. On signup, button shows **Creating account...**, then the confirmation message or navigation.
4. Test keyboard activation and screen-reader status.
5. Once local tests pass, commit and push to GitHub to deploy to Vercel; repeat on `https://reviewbranch.com/login`.

Do not change Supabase settings for this UX update.
