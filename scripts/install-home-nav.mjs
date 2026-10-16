#!/usr/bin/env node
/**
 * Adds HomeAuthNav to the FIRST existing homepage header and imports it.
 * Dry-run unless --apply is provided. Bails rather than guessing when the
 * homepage structure differs from the expected single-header structure.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pageFile = path.join(root, "src/app/page.tsx");
const componentFile = path.join(root, "src/components/HomeAuthNav.tsx");
const apply = process.argv.includes("--apply");

if (!fs.existsSync(pageFile) || !fs.existsSync(componentFile)) {
  console.error("Run from the project root after extracting the ZIP; expected homepage and HomeAuthNav.tsx.");
  process.exitCode = 1;
} else {
  const original = fs.readFileSync(pageFile, "utf8");
  if (original.includes("<HomeAuthNav")) {
    console.log("HomeAuthNav is already installed. No changes made.");
  } else {
    const headerOpeners = [...original.matchAll(/<header(?:\s|>)/g)];
    if (headerOpeners.length !== 1) {
      console.error(`Expected exactly one homepage <header>; found ${headerOpeners.length}.`);
      console.error("No changes made. Share the homepage header JSX for a tailored insertion.");
      process.exitCode = 1;
    } else {
      const start = headerOpeners[0].index;
      const close = original.indexOf("</header>", start);
      if (close < 0) {
        console.error("Could not find the closing </header>. No changes made.");
        process.exitCode = 1;
      } else {
        const existingHeader = original.slice(start, close);
        if (existingHeader.includes("<nav") || /href=["']\/(?:login|dashboard)["']/.test(existingHeader)) {
          console.error("The header already contains navigation. No automatic changes made to avoid duplicate controls.");
          console.error("Share src/app/page.tsx so the existing navigation can be updated safely.");
          process.exitCode = 1;
        } else {
          const beginningOfCloseLine = original.lastIndexOf("\n", close - 1) + 1;
          const closeIndent = original.slice(beginningOfCloseLine, close).match(/^\s*/)?.[0] ?? "";
          const insertion = `${closeIndent}  <HomeAuthNav />\n`;
          let updated = original.slice(0, beginningOfCloseLine) + insertion + original.slice(beginningOfCloseLine);
          const importLine = 'import HomeAuthNav from "@/components/HomeAuthNav";\n';
          const clientDirective = updated.match(/^(?:\s*)(?:"use client"|'use client');?\s*\n/);
          if (clientDirective) {
            updated = updated.slice(0, clientDirective[0].length) + importLine + updated.slice(clientDirective[0].length);
          } else {
            updated = importLine + updated;
          }
          console.log(`${apply ? "Updated" : "Would update"} src/app/page.tsx:`);
          console.log(`  + import HomeAuthNav from "@/components/HomeAuthNav";`);
          console.log(`  + <HomeAuthNav /> before first </header>`);
          if (apply) {
            fs.writeFileSync(pageFile, updated);
            console.log("Next: npm run lint && npx tsc --noEmit && npm run build");
          } else {
            console.log("Dry run only. Run again with --apply to write the change.");
          }
        }
      }
    }
  }
}
