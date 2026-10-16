# ReviewBranch — responsive homepage navigation

This is a targeted navigation update for the existing **Next.js 16 App Router + Supabase Auth** application. It does not replace the homepage's hero, examples or footer and requires no database migration or new npm dependency.

## Intended navigation

| Screen | Signed out | Signed in |
|---|---|---|
| Desktop (md+) | Logo left; **How it works** centred; **Log in** on right | Logo left; site links centred; hamburger/account menu on right with site links, **Dashboard**, **Log out** |
| Mobile | Logo left; visible **Log in** and hamburger right; public site links inside menu | Logo left; hamburger right; public site links plus **Dashboard** and **Log out** inside menu |

For future public navigation, add items to `SITE_LINKS` in `src/components/HomeSiteHeader.tsx` only when the corresponding page or section exists. The single list supplies the desktop and dropdown links automatically.

The menu provides keyboard Tab navigation, closes with Escape or outside click, focuses the first menu link when opened, and returns focus to its trigger on Escape. Successful logout clears the session and refreshes the route; failures show an error message. Authentication controls are for navigation only; RLS/server checks continue to protect data.

## Install — **run from the local project root**

First save a Git checkpoint:

```bash
cd ~/Documents/review-links-app
git add .
git commit -m "Checkpoint before responsive homepage navigation"
```

Extract the ZIP in the project, adding the `HomeSiteHeader.tsx` component and the installer:

```bash
unzip -o ~/Downloads/reviewbranch-responsive-navigation.zip -d .
```

Review the proposed change, then apply it:

```bash
node scripts/install-responsive-nav.mjs
node scripts/install-responsive-nav.mjs --apply
```

The installer looks for the **existing** ReviewBranch header containing `HomeAuthNav`, the logo and **How it works**. If its structure differs, it stops without changing the homepage. Do not overwrite your homepage with an old copy; share the current header JSX for a tailored fix if the installer stops. The installer can be rerun safely.

Run quality checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Your previous `HomeAuthNav.tsx` file is left untouched but no longer imported by the homepage. It can be removed later once everything is verified. The application directory and internal review links are unchanged.

## Checklist before deployment

1. Desktop while signed out: **How it works** is centred, **Log in** is right-aligned and no hamburger is visible.
2. Mobile width **320px**, **375px**, **390px**: visible **Log in** plus hamburger; no horizontal scrolling; opening menu shows site links.
3. Desktop and mobile while signed in: **Log in** disappears; hamburger contains **How it works**, **Dashboard**, **Log out**.
4. Click **Dashboard** and verify the correct business dashboard opens.
5. Click **Log out**; the UI changes to **Log in** and `/dashboard` is protected.
6. Open the menu with the keyboard; check Tab, Enter/Space, Escape and outside-click dismissal.
7. Click **How it works** from the menu and confirm it scrolls to that section.
8. Confirm the homepage hero and public review page are unchanged, and no browser or server errors appear.

The TSX syntax and installer were tested with representative inputs. Because this package does not contain your whole local source tree, the full Next.js build and runtime auth tests must be run on your Mac.
