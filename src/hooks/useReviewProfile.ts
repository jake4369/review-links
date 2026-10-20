"use client";

import { useSyncExternalStore } from "react";

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
