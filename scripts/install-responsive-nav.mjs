#!/usr/bin/env node
/**
 * ReviewBranch homepage header migration.
 * Dry-run by default; writes only if the existing homepage contains exactly
 * one header with the previously installed HomeAuthNav component.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src/app/page.tsx");
const componentPath = path.join(root, "src/components/HomeSiteHeader.tsx");
const apply = process.argv.includes("--apply");

function fail(message) {
  console.error(`${message}\nNo changes made.`);
  process.exitCode = 1;
}

if (!fs.existsSync(pagePath) || !fs.existsSync(componentPath)) {
  fail("Missing src/app/page.tsx or src/components/HomeSiteHeader.tsx. Run from project root after extracting package.");
} else {
  const original = fs.readFileSync(pagePath, "utf8");
  if (original.includes("<HomeSiteHeader")) {
    console.log("Responsive navigation already installed. No changes needed.");
  } else {
    const openers = [...original.matchAll(/<header\b/g)];
    const closers = [...original.matchAll(/<\/header>/g)];
    if (openers.length !== 1 || closers.length !== 1) {
      fail(`Expected exactly one homepage header. Found ${openers.length} open and ${closers.length} close tags.`);
    } else {
      const start = openers[0].index;
      const end = closers[0].index + closers[0][0].length;
      const contents = original.slice(start, end);
      const looksLikeOurHeader =
        contents.includes("<HomeAuthNav") &&
        /Review\s*<span/.test(contents) &&
        /How it works/i.test(contents) &&
        [...contents.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)].every((match) =>
          ["/", "#how-it-works", "/#how-it-works"].includes(match[1])
        );
      if (!looksLikeOurHeader) {
        fail("Homepage header does not match the previous ReviewBranch logo, How it works and HomeAuthNav structure.");
      } else {
        let updated = original.slice(0, start) + "<HomeSiteHeader />" + original.slice(end);
        const oldImport = /^import\s+HomeAuthNav\s+from\s+["']@\/components\/HomeAuthNav["'];?\s*\n/m;
        if (!oldImport.test(updated)) {
          fail("Unable to find the expected HomeAuthNav import. Please share the homepage header for a tailored patch.");
        } else {
          updated = updated.replace(oldImport, "");
          // Removing the old header can leave an unused next/link import.
          if (!/<Link\b/.test(updated)) {
            updated = updated.replace(/^import\s+Link\s+from\s+["']next\/link["'];?\s*\n/m, "");
          }
          const headerImport = 'import HomeSiteHeader from "@/components/HomeSiteHeader";\n';
          const clientDirective = updated.match(/^\s*["']use client["'];?\s*\n/);
          if (clientDirective) {
            updated = updated.slice(0, clientDirective[0].length) + headerImport + updated.slice(clientDirective[0].length);
          } else {
            updated = headerImport + updated;
          }
          console.log(`${apply ? "Replacing" : "Would replace"} the existing homepage header with <HomeSiteHeader />.`);
          console.log("  Preserves the rest of src/app/page.tsx, including the hero and preview.");
          console.log("  Removes the old HomeAuthNav import; leaves src/components/HomeAuthNav.tsx untouched.");
          if (apply) {
            fs.writeFileSync(pagePath, updated);
            console.log("Done. Run: npm run lint && npx tsc --noEmit && npm run build");
          } else {
            console.log("Dry run only. Apply with: node scripts/install-responsive-nav.mjs --apply");
          }
        }
      }
    }
  }
}
