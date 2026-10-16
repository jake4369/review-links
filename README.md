# ReviewBranch

ReviewBranch is a lightweight review-sharing SaaS. Businesses manage a public review page, customise review destinations, and share a permanent link or QR code with customers.

## Local development

The application uses Next.js (App Router), TypeScript, Tailwind CSS and Supabase.

1. Install dependencies with `npm install`.
2. Configure the existing required Supabase environment variables in `.env.local` (do not commit secrets).
3. Run `npm run dev`, then open `http://localhost:3000`.

## Checks

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` before deployment.

## Domains

- Canonical production domain: **https://reviewbranch.com**
- Secondary domain: **https://reviewbranch.co.uk** (permanent redirect to the matching path on the canonical domain, configured at the hosting provider)

The local project directory can retain its current name. Existing business slugs and database identifiers remain unchanged.

## Deployment

The domains and authentication URLs must be configured at the hosting provider and in Supabase before production launch. Do not use real business QR codes until the canonical live URL and redirects have been tested.
