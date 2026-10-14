"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Business } from "@/lib/businesses";
import { readBusinessDraft } from "@/lib/business-draft";

// Listen for changes to saved business drafts.
function subscribeToDraft(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("reviewlinks:draft-updated", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("reviewlinks:draft-updated", callback);
  };
}

function getServerDraft() {
  return null;
}

// Read saved business information.
export function useSavedBusiness(business: Business) {
  const savedDraft = useSyncExternalStore(
    subscribeToDraft,
    () => {
      try {
        return localStorage.getItem(`reviewlinks:draft:${business.slug}`);
      } catch {
        return null;
      }
    },
    getServerDraft,
  );

  return useMemo(
    () => (savedDraft === null ? business : readBusinessDraft(business)),
    [business, savedDraft],
  );
}

// The website origin doesn't need an event listener.
function subscribeToOrigin() {
  return () => {};
}

function getServerOrigin() {
  return "";
}

// Generate the public review URL.
export function useReviewPageUrl(slug: string) {
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    getServerOrigin,
  );

  return origin ? new URL(`/r/${slug}`, origin).toString() : "";
}
