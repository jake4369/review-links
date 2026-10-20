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
