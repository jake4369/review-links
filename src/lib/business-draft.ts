import type { Business } from "@/lib/businesses";

function getDraftKey(slug: string) {
  return `reviewlinks:draft:${slug}`;
}

export function saveBusinessDraft(business: Business) {
  localStorage.setItem(getDraftKey(business.slug), JSON.stringify(business));

  // Notify components that the saved draft has changed.
  window.dispatchEvent(new Event("reviewlinks:draft-updated"));
}

export function readBusinessDraft(original: Business): Business {
  try {
    const saved = localStorage.getItem(getDraftKey(original.slug));

    if (!saved) return original;

    const draft = JSON.parse(saved) as Partial<Business>;

    const savedLinks = Array.isArray(draft.reviewLinks)
      ? draft.reviewLinks
      : original.reviewLinks;

    return {
      ...original,
      name: typeof draft.name === "string" ? draft.name : original.name,
      logoText:
        typeof draft.logoText === "string" ? draft.logoText : original.logoText,
      message:
        typeof draft.message === "string" ? draft.message : original.message,
      invitationMessage:
        typeof draft.invitationMessage === "string"
          ? draft.invitationMessage
          : original.invitationMessage,
      reviewLinks: original.reviewLinks.map((link) => {
        const savedLink = savedLinks.find(
          (item) => item?.platform === link.platform,
        );

        return {
          ...link,
          url: typeof savedLink?.url === "string" ? savedLink.url : null,
        };
      }),
    };
  } catch {
    return original;
  }
}
