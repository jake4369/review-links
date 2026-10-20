"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PublicationState = {
  error: string;
  success: string;
};

export async function changePublication(
  _previousState: PublicationState,
  formData: FormData,
): Promise<PublicationState> {
  const businessId = String(formData.get("businessId") ?? "");
  const requestedValue = formData.get("publish");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)) {
    return { error: "Invalid business identifier.", success: "" };
  }

  if (requestedValue !== "true" && requestedValue !== "false") {
    return { error: "Invalid publication request.", success: "" };
  }

  const publish = requestedValue === "true";
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const ownerId = authData?.claims?.sub;

  if (authError || !ownerId) {
    return { error: "Please sign in again.", success: "" };
  }

  // Only the authenticated owner may change this business.
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("id", businessId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (businessError || !business) {
    return { error: "Business not found or access denied.", success: "" };
  }

  if (publish) {
    const { count, error: linksError } = await supabase
      .from("review_links")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id);

    if (linksError) {
      return { error: "Unable to check review destinations.", success: "" };
    }

    if (!count) {
      return {
        error: "Add at least one review destination before publishing.",
        success: "",
      };
    }
  }

  const { data: updatedBusiness, error: updateError } = await supabase
    .from("businesses")
    .update({ is_published: publish })
    .eq("id", business.id)
    .eq("owner_id", ownerId)
    .select("id")
    .single();

  if (updateError || !updatedBusiness) {
    return { error: "Unable to change publication status.", success: "" };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/r/${business.slug}`);

  return {
    error: "",
    success: publish
      ? "Your review page is now published."
      : "Your review page has been unpublished.",
  };
}
