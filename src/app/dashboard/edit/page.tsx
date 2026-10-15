import { redirect } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";
import { createClient } from "@/lib/supabase/server";

export default async function EditProfilePage() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError || !authData?.claims?.sub) redirect("/login");

  const { data: record, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_text, welcome_message, invitation_message")
    .eq("owner_id", authData.claims.sub)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (businessError) throw new Error("Unable to load your business profile.");
  if (!record) redirect("/dashboard/create");

  // Load ALL destinations, including custom platforms, with their permanent UUIDs.
  const { data: links, error: linksError } = await supabase
    .from("review_links")
    .select("id, platform, url")
    .eq("business_id", record.id)
    .order("display_order", { ascending: true });

  if (linksError) throw new Error("Unable to load review destinations.");

  return (
    <ProfileEditor
      businessId={record.id}
      business={{
        name: record.name,
        slug: record.slug,
        logoText: record.logo_text,
        message: record.welcome_message,
        invitationMessage: record.invitation_message,
      }}
      destinations={links ?? []}
    />
  );
}
