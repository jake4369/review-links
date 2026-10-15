export type ReviewLink = {
  platform: string;
  url: string | null;
};

export type Business = {
  name: string;
  slug: string;
  logoText: string;
  message: string;
  invitationMessage: string;
  reviewLinks: ReviewLink[];
};

export const businesses: Record<string, Business> = {
  devxdesign: {
    name: "DevXDesign - Web Agency",
    slug: "devxdesign",
    logoText: "DevX",
    message:
      "Thank you for choosing us! We'd love to hear about your experience.",
    invitationMessage:
      "Hi! Thank you for choosing DevXDesign. We'd appreciate an honest review of your experience.",
    reviewLinks: [
      {
        platform: "Google",
        url: null,
      },
      {
        platform: "Trustpilot",
        url: null,
      },
      {
        platform: "Facebook",
        url: null,
      },
    ],
  },
};

export function getBusinessBySlug(slug: string): Business | undefined {
  return businesses[slug];
}
