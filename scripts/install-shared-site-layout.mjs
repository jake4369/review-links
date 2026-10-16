#!/usr/bin/env node
/**
 * ReviewBranch shared layout migration (corrected for dashboard <nav> markup).
 * Dry-run by default. Changes only when all prechecks pass.
 * Current dashboard auth guard stays inside its own layout.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = path.join(root, 'src/app');
const site = path.join(app, '(site)');
const home = path.join(app, 'page.tsx');
const dashboard = path.join(app, 'dashboard');
const dashboardLayout = path.join(dashboard, 'layout.tsx');
const targetHome = path.join(site, 'page.tsx');
const targetDashboard = path.join(site, 'dashboard');
const siteLayout = path.join(site, 'layout.tsx');
const siteHeader = path.join(root, 'src/components/SiteHeader.tsx');
const apply = process.argv.includes('--apply');

function fail(message) {
  console.error(`PRECHECK FAILED: ${message}\nNo project files changed.`);
  process.exit(1);
}
const relative = (p) => path.relative(root, p);
for (const p of [home, dashboardLayout, siteLayout, siteHeader]) {
  if (!fs.existsSync(p)) fail(`Missing ${relative(p)}. Extract the original shared-header package first.`);
}
if (fs.existsSync(targetHome) || fs.existsSync(targetDashboard)) {
  fail('Site route group already contains a homepage or dashboard. Installation may already have been applied.');
}
if (!fs.existsSync(path.join(app, 'r', '[slug]', 'page.tsx'))) {
  fail('Cannot locate public customer profile src/app/r/[slug]/page.tsx.');
}

const page = fs.readFileSync(home, 'utf8');
const dashboardText = fs.readFileSync(dashboardLayout, 'utf8');
const siteLayoutText = fs.readFileSync(siteLayout, 'utf8');
const headerText = fs.readFileSync(siteHeader, 'utf8');
if (!siteLayoutText.includes('<SiteHeader />')) fail('Shared (site)/layout.tsx does not render <SiteHeader />.');
if (!headerText.includes('sticky top-0')) fail('SiteHeader.tsx does not appear to include sticky positioning.');

const homeToken = /<HomeSiteHeader\s*\/>/g;
if ([...page.matchAll(homeToken)].length !== 1) {
  fail('Expected exactly one <HomeSiteHeader /> in src/app/page.tsx.');
}
const homeImport = /^import\s+HomeSiteHeader\s+from\s+["']@\/components\/HomeSiteHeader["'];?\s*\n/m;
if (!homeImport.test(page)) fail('Expected homepage import from @/components/HomeSiteHeader.');
let newHome = page.replace(homeToken, '').replace(homeImport, '');

// Imports in other components may refer to the former file-system location.
// Route URLs are unchanged, but TypeScript @/app aliases are file-system paths.
const oldAlias = '@/app/dashboard/';
const newAlias = '@/app/(site)/dashboard/';
function findSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...findSourceFiles(file));
    else if (/\.(?:tsx?|jsx?)$/.test(entry.name)) files.push(file);
  }
  return files;
}
const aliasChanges = [];
for (const file of findSourceFiles(path.join(root, 'src'))) {
  if (file === home || file === dashboardLayout) continue;
  const original = fs.readFileSync(file, 'utf8');
  if (original.includes(oldAlias)) {
    aliasChanges.push({ file, original, updated: original.replaceAll(oldAlias, newAlias) });
  }
}

// A relative import that escapes the dashboard directory would change target
// when moving the dashboard folder under (site). Intra-dashboard imports are fine.
for (const file of findSourceFiles(dashboard)) {
  const original = fs.readFileSync(file, 'utf8');
  for (const match of original.matchAll(/\b(?:from\s*|import\s*\()\s*['"](\.\.\/[^'"]+)['"]/g)) {
    const resolved = path.resolve(path.dirname(file), match[1]);
    if (resolved !== dashboard && !resolved.startsWith(dashboard + path.sep)) {
      fail(`Dashboard file ${relative(file)} has an import outside dashboard: ${match[1]}. Review it before moving.`);
    }
  }
}

// Existing dashboard layout uses <nav>, not <header>.
// Handle either known shape, but stop for anything unexpected.
const navMatches = [...dashboardText.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/g)];
const headerMatches = [...dashboardText.matchAll(/<header\b[^>]*>[\s\S]*?<\/header>/g)];
if (navMatches.length + headerMatches.length !== 1) {
  fail(`Expected one known dashboard navigation block; found ${navMatches.length} <nav> and ${headerMatches.length} <header>.`);
}
const oldNavigation = navMatches.length ? navMatches[0][0] : headerMatches[0][0];
if (!oldNavigation.includes('ReviewBranch') || !oldNavigation.includes('signOut')) {
  fail('Dashboard navigation does not match the ReviewBranch logo + signOut form. Refusing to remove unrecognised markup.');
}
if (!dashboardText.includes('supabase.auth.getClaims()') ||
    !dashboardText.includes('redirect("/login")') ||
    !dashboardText.includes('{children}')) {
  fail('Dashboard auth guard / children differ from the expected implementation.');
}

let newDashboard = dashboardText.replace(oldNavigation, '');
// Remove now-unused signOut import (only when it was exclusive to the old nav).
const signOutImport = /^import\s*\{\s*signOut\s*\}\s*from\s*["']@\/app\/auth\/actions["'];?\s*\n/m;
if (!signOutImport.test(dashboardText)) {
  fail('Missing expected signOut import in the dashboard layout.');
}
newDashboard = newDashboard.replace(signOutImport, '');
// Remove only the old JSX comment labelling its now-deleted navigation.
newDashboard = newDashboard.replace(/^\s*\{\/\* Account navigation \*\/\}\s*\n/m, '\n');
if (/\bsignOut\b/.test(newDashboard)) {
  fail('signOut is still referenced after removing the old navigation; share the layout for manual adjustment.');
}
if (!newDashboard.includes('supabase.auth.getClaims()') || !newDashboard.includes('redirect("/login")')) {
  fail('Authentication checks would not be preserved.');
}
newHome = newHome.replaceAll(oldAlias, newAlias);
newDashboard = newDashboard.replaceAll(oldAlias, newAlias);

console.log('PRECHECK PASSED. Planned changes:');
console.log('  src/app/page.tsx           -> src/app/(site)/page.tsx (remove old homepage header)');
console.log('  src/app/dashboard/         -> src/app/(site)/dashboard/ (preserve dashboard auth guard)');
console.log('  Dashboard layout          : remove redundant <nav> and now-unused signOut import');
console.log('  src/app/(site)/layout.tsx  : shared sticky SiteHeader (already extracted)');
console.log('  src/app/r/[slug]/          : untouched, remains header-free');
console.log('  All route URLs remain unchanged.');
for (const change of aliasChanges) {
  console.log(`  Update path alias references in ${relative(change.file)}`);
}

if (!apply) {
  console.log('DRY RUN ONLY. Apply with: node scripts/install-shared-site-layout.mjs --apply');
  process.exit(0);
}

// Roll back file moves on an unexpected filesystem failure.
let homeMoved = false;
let dashboardMoved = false;
const rewrittenFiles = [];
try {
  fs.renameSync(home, targetHome);
  homeMoved = true;
  fs.writeFileSync(targetHome, newHome);
  fs.renameSync(dashboard, targetDashboard);
  dashboardMoved = true;
  fs.writeFileSync(path.join(targetDashboard, 'layout.tsx'), newDashboard);
  for (const change of aliasChanges) {
    const target = change.file.startsWith(dashboard + path.sep)
      ? path.join(targetDashboard, path.relative(dashboard, change.file))
      : change.file === home ? targetHome : change.file;
    fs.writeFileSync(target, change.updated);
    rewrittenFiles.push({ target, original: change.original });
  }
  console.log('Applied successfully. Next run npm run lint, npx tsc --noEmit and npm run build.');
} catch (error) {
  // Restore exact original bytes even if an intermediate write happened.
  try {
    for (const change of rewrittenFiles) {
      fs.writeFileSync(change.target, change.original);
    }
    if (dashboardMoved) {
      fs.renameSync(targetDashboard, dashboard);
      fs.writeFileSync(dashboardLayout, dashboardText);
    }
    if (homeMoved) {
      fs.renameSync(targetHome, home);
      fs.writeFileSync(home, page);
    }
  } catch (rollbackError) {
    console.error('Automatic filesystem rollback failed:', rollbackError);
    console.error('Restore from the Git checkpoint before retrying.');
  }
  console.error('Installation failed:', error);
  process.exit(1);
}
