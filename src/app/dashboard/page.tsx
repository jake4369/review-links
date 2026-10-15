import { redirect } from "next/navigation";
import BusinessDashboard from "@/components/BusinessDashboard";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/businesses";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) redirect("/login");

  const { data: record, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_text, welcome_message, invitation_message, is_published")
    .eq("owner_id", authData.claims.sub)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (businessError) throw new Error("Unable to load your business.");
  if (!record) redirect("/dashboard/create");

  const { data: links, error: linksError } = await supabase
    .from("review_links")
    .select("platform, url")
    .eq("business_id", record.id)
    .order("display_order", { ascending: true });

  if (linksError) throw new Error("Unable to load your review destinations.");

  // Include ALL destinations, not only the three original presets.
  const business: Business = {
    name: record.name,
    slug: record.slug,
    logoText: record.logo_text,
    message: record.welcome_message,
    invitationMessage: record.invitation_message,
    reviewLinks: (links ?? []).map((link) => ({
      platform: link.platform,
      url: link.url,
    })),
  };

  return (
    <BusinessDashboard
      businessId={record.id}
      business={business}
      isPublished={record.is_published}
      canPublish={business.reviewLinks.some((link) => Boolean(link.url))}
    />
  );
}
