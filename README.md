# ReviewBranch

ReviewBranch is a simple review-sharing SaaS for businesses.

A business creates one public review page containing links to the places where customers can leave feedback. That page can then be shared using a direct link, QR code, WhatsApp, SMS, email, or the device's native share sheet.

The current MVP is intentionally focused on making review sharing simple rather than becoming a full review-management platform.

---

## Current MVP

Business owners can:

- create an account using email and password
- create a business profile and choose a public review-page slug
- edit the business name and profile messaging
- add up to 10 review destinations
- use custom destination labels and URLs
- reorder and remove review destinations
- publish and unpublish the review page
- automatically unpublish when the final destination is removed with confirmation
- copy the public review-page link
- display and download a QR code
- share by WhatsApp, SMS, email, or Share Anywhere

Customers can:

- open a published ReviewBranch page
- view the business profile
- choose a review destination
- continue to the external review platform

The current MVP does not include analytics, CRM/customer storage, automated review campaigns, AI-generated responses, complex subscription tiers, or a separate mobile application.

The current interface supports one business per account. The database intentionally does not enforce one-business-per-owner cardinality so multi-business support can be added later without redesigning the underlying ownership model.

---

## Tech Stack

- Next.js 16.4.0
- React 19.3.0
- TypeScript
- Tailwind CSS 4
- Supabase Auth
- Supabase PostgreSQL
- `@supabase/ssr`
- `@supabase/supabase-js`
- `qrcode.react`
- Supabase CLI 2.121.0
- Vercel

---

## Main Routes

| Route               | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `/`                 | Marketing homepage                                |
| `/login`            | Sign in / create account                          |
| `/auth/confirm`     | Email confirmation callback                       |
| `/dashboard`        | Business owner dashboard                          |
| `/dashboard/create` | Create the initial business profile               |
| `/dashboard/edit`   | Edit the business profile and review destinations |
| `/r/[slug]`         | Public customer review page                       |

Draft or missing public profiles return a not-found response rather than exposing unpublished business information.

---

## Local Development

### Requirements

- Node.js 20+
- npm
- Docker Desktop for local Supabase development

The project has been tested with:

- Node.js 22
- PostgreSQL 17
- Supabase CLI 2.121.0

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file containing:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Do not commit `.env.local`, database passwords, access tokens, service-role keys, or other secrets.

### Start Next.js

```bash
npm run dev
```

The app will normally be available at:

```text
http://localhost:3000
```

If port 3000 is already in use, Next.js may select another local port.

---

## Useful Commands

### Development server

```bash
npm run dev
```

### ESLint

```bash
npm run lint
```

### TypeScript check

```bash
npx tsc --noEmit
```

### Production build

```bash
npm run build
```

### Run production build locally

```bash
npm run start
```

---

## Supabase Local Development

The repository contains a Supabase CLI configuration under:

```text
supabase/
```

Start the local Supabase stack with:

```bash
npx supabase start
```

Stop it with:

```bash
npx supabase stop
```

Recreate the local database from the migration history with:

```bash
npx supabase db reset
```

Lint the local database schema with:

```bash
npx supabase db lint --local
```

The local Supabase environment runs in Docker and is separate from the hosted production database.

---

## Database Migrations

Database migrations are stored in:

```text
supabase/migrations/
```

The initial production baseline is:

```text
20261020180344_reviewbranch_baseline.sql
```

This migration represents the verified ReviewBranch production database schema and security configuration as of 20 October 2026.

It includes:

- `businesses`
- `review_links`
- constraints and indexes
- review-destination validation
- publication safeguards
- maximum destination enforcement
- transactional profile saving
- onboarding-completion persistence
- Row Level Security policies
- table and column permissions
- function permissions

### Important migration rule

**Never edit an already-applied migration.**

In particular:

```text
supabase/migrations/20261020180344_reviewbranch_baseline.sql
```

must now be treated as immutable.

Every future database change must be created as a new timestamped migration:

```bash
npx supabase migration new descriptive_migration_name
```

Then edit the newly created migration file.

### Recommended migration workflow

Create a migration:

```bash
npx supabase migration new descriptive_name
```

Test migrations against a fresh local database:

```bash
npx supabase db reset
```

Run the database linter:

```bash
npx supabase db lint --local
```

Before applying a migration to the linked hosted project, inspect what would happen:

```bash
npx supabase db push --dry-run
```

Only after the migration has been reviewed and tested should the real remote migration be applied:

```bash
npx supabase db push
```

Do not use `db push` as a substitute for testing migrations locally first.

---

## Database Security

ReviewBranch uses PostgreSQL Row Level Security as part of its application security model.

The main rules are:

- authenticated owners can manage only their own business
- review destinations are scoped through their parent business
- anonymous users can read only published businesses
- anonymous users can read review destinations only when the parent business is published
- public access is restricted to the columns required by the public review page
- editable fields use deliberately restricted update permissions
- the transactional save function operates as `SECURITY INVOKER`
- published businesses must always have at least one review destination
- each business is limited to a maximum of 10 destinations

The database remains the authoritative enforcement layer even when equivalent validation also exists in the application.

---

## Review Destination Validation

Review destinations must:

- use HTTPS
- use a normal public DNS hostname
- remain within the configured URL and label length limits
- avoid localhost, IP-address, local/reserved, malformed, and ambiguous destinations

Known destination labels such as Google, Trustpilot, and Facebook are restricted to recognised provider domains.

Custom review destinations are also supported.

---

## Database Baseline Verification

The baseline migration has been tested by:

- creating a completely fresh local Supabase database
- resetting and rebuilding that database from migrations
- running Supabase database linting
- comparing the resulting schema against the hosted production definitions
- comparing constraints, indexes, functions, triggers, RLS policies, and permissions
- testing review-destination validation
- testing publication safeguards
- testing final-destination protection
- testing the 10-destination limit
- testing transactional save and automatic unpublish behaviour
- testing cross-account isolation
- testing anonymous draft/published visibility
- testing onboarding-completion persistence
- testing atomic rollback on a failed save

The hosted project migration history has been reconciled with the baseline migration, and a migration dry run reports the remote database as up to date.

---

## Deployment

The application is deployed using Vercel from the `main` branch.

The production domain is:

```text
https://reviewbranch.com
```

Changes should normally follow this flow:

```text
local development
→ focused testing
→ lint / TypeScript / production build
→ commit
→ push to main
→ verify Vercel deployment
→ production smoke test when appropriate
```

Database changes additionally require the migration workflow described above.

The production deployment may remain behind Vercel Deployment Protection during internal development and controlled testing.

---

## Current Development Status

ReviewBranch currently has a stable internal MVP foundation.

The core owner-to-customer journey has been implemented and tested:

```text
Account
→ Business profile
→ Review destinations
→ Publish
→ Share link / QR
→ Customer review page
→ External review destination
```

Current development is focused on internal quality, reliability, product polish, and preparing the application for controlled external testing rather than expanding the MVP with unnecessary features.
