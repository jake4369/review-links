import { redirect } from "next/navigation";

import ProfileEditor from "@/components/ProfileEditor";
import { createClient } from "@/lib/supabase/server";

import type { Business, ReviewLink } from "@/lib/businesses";

export default async function EditProfilePage() {
  const supabase = await createClient();

  // Identify the signed-in user.
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    redirect("/login");
  }

  // Find the user's business.
  const { data: record, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_text, welcome_message, invitation_message")
    .eq("owner_id", authData.claims.sub)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (businessError) {
    throw new Error("Unable to load business profile.");
  }

  if (!record) {
    redirect("/dashboard/create");
  }

  // Retrieve the business's review destinations.
  const { data: links, error: linksError } = await supabase
    .from("review_links")
    .select("platform, url")
    .eq("business_id", record.id)
    .order("display_order", { ascending: true });

  if (linksError) {
    throw new Error("Unable to load review destinations.");
  }

  const savedLinks = (links ?? []) as {
    platform: string;
    url: string;
  }[];

  const reviewPlatforms: ReviewLink["platform"][] = [
    "Google",
    "Trustpilot",
    "Facebook",
  ];

  // Convert database records to our existing Business type.
  const business: Business = {
    name: record.name,
    slug: record.slug,
    logoText: record.logo_text,
    message: record.welcome_message,
    invitationMessage: record.invitation_message,
    reviewLinks: reviewPlatforms.map((platform) => ({
      platform,
      url: savedLinks.find((link) => link.platform === platform)?.url ?? null,
    })),
  };

  return <ProfileEditor businessId={record.id} business={business} />;
}
