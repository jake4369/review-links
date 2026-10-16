# ReviewBranch — Desktop Navigation Alignment

This replaces **only** `src/components/SiteHeader.tsx` from the previously installed shared sticky header package.

## What changes

- On desktop (>= 1024px), the brand stays on the left, site links remain truly centred, and account controls are right-aligned.
- When signed out: the right-side control is **Log in**.
- When signed in: the right-side controls are **Dashboard** and **Log out**.
- During session checking, the loading placeholder sits on the right.
- The sticky header, mobile/tablet hamburger menu, authentication, page routing, and header-free public review pages are unchanged.

## Install

In the repository root, after creating a Git checkpoint:

```bash
unzip -o ~/Downloads/reviewbranch-desktop-nav-alignment.zip -d .
```

Then run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Check at desktop widths 1024 and 1440px in signed-in/out states, and at 320px and 375px for mobile regression. Verify that `How it works` is centred relative to the page content container, and the account buttons align with the hamburger's right edge.

This package has passed file-level TSX transpilation checks; it has **not** been built against your actual macOS project.
