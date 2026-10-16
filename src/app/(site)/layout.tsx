import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";

/**
 * Shared chrome for ReviewBranch's marketing home page and authenticated dashboard.
 * The route group does not change their URLs.
 * Public customer-facing review pages at /r/[slug] stay outside this layout.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
