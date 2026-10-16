#!/usr/bin/env node
/**
 * ReviewBranch Phase 4.1: minimally invasive branding update.
 * Usage: node scripts/rebrand-reviewbranch.mjs [--apply]
 * Dry run by default. No network or dependencies required.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apply = process.argv.includes('--apply');
const required = ['package.json', 'src/app/layout.tsx', 'src/app/dashboard/layout.tsx'];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    console.error(`Not a ReviewBranch application root: missing ${relative}`);
    process.exit(1);
  }
}

const planned = [];
function recordChange(relative, content) {
  const absolute = path.join(root, relative);
  const previous = fs.readFileSync(absolute, 'utf8');
  if (previous === content) return;
  planned.push(relative);
  if (apply) fs.writeFileSync(absolute, content, 'utf8');
}

function walk(directory) {
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...walk(absolute));
    else if (entry.isFile() && /\.(?:js|jsx|ts|tsx|md|mdx)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}

// Rename visible brand text only. Lowercase reviewLinks etc. are code identifiers,
// not product branding, and must remain unchanged.
for (const absolute of walk(path.join(root, 'src'))) {
  const relative = path.relative(root, absolute);
  const previous = fs.readFileSync(absolute, 'utf8');
  const updated = previous.replaceAll('ReviewLinks', 'ReviewBranch');
  recordChange(relative, updated);
}

const packageFile = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path.join(root, packageFile), 'utf8'));
if (pkg.name === 'review-links-app' || pkg.name === 'reviewlinks') {
  pkg.name = 'reviewbranch';
  recordChange(packageFile, JSON.stringify(pkg, null, 2) + '\n');
} else if (pkg.name !== 'reviewbranch') {
  console.warn(`Package name is '${pkg.name}'. Leaving it unchanged to avoid replacing a custom setting.`);
}

if (fs.existsSync(path.join(root, 'package-lock.json'))) {
  const filename = 'package-lock.json';
  const lock = JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
  if (lock.name === 'review-links-app' || lock.name === 'reviewlinks') lock.name = 'reviewbranch';
  if (lock.packages?.['']?.name === 'review-links-app' || lock.packages?.['']?.name === 'reviewlinks') {
    lock.packages[''].name = 'reviewbranch';
  }
  recordChange(filename, JSON.stringify(lock, null, 2) + '\n');
}

if (fs.existsSync(path.join(root, 'README.md'))) {
  const filename = 'README.md';
  const readme = fs.readFileSync(path.join(root, filename), 'utf8');
  if (readme.startsWith('# ReviewLinks — bottom Dashboard button')) {
    // Replace the old patch-install readme rather than retaining misleading
    // directions for a previously installed ZIP package.
    recordChange(filename, `# ReviewBranch\n\nReviewBranch is a lightweight review-sharing SaaS. Businesses manage a public review page, customise review destinations, and share a permanent link or QR code with customers.\n\n## Local development\n\nThe application uses Next.js (App Router), TypeScript, Tailwind CSS and Supabase.\n\n1. Install dependencies with \`npm install\`.\n2. Configure the existing required Supabase environment variables in \`.env.local\` (do not commit secrets).\n3. Run \`npm run dev\`, then open \`http://localhost:3000\`.\n\n## Checks\n\nRun \`npm run lint\`, \`npx tsc --noEmit\`, and \`npm run build\` before deployment.\n\n## Domains\n\n- Canonical production domain: **https://reviewbranch.com**\n- Secondary domain: **https://reviewbranch.co.uk** (permanent redirect to the matching path on the canonical domain, configured at the hosting provider)\n\nThe local project directory can retain its current name. Existing business slugs and database identifiers remain unchanged.\n\n## Deployment\n\nThe domains and authentication URLs must be configured at the hosting provider and in Supabase before production launch. Do not use real business QR codes until the canonical live URL and redirects have been tested.\n`);
  } else {
    recordChange(filename, readme.replaceAll('ReviewLinks', 'ReviewBranch'));
  }
}

console.log(`${apply ? 'Updated' : 'Would update'} ${planned.length} file(s):`);
for (const file of planned) console.log(`  ${file}`);
if (!apply) console.log('\nDry run only. To make the changes: node scripts/rebrand-reviewbranch.mjs --apply');
else console.log('\nNext: git diff --check && npm run lint && npx tsc --noEmit && npm run build');
