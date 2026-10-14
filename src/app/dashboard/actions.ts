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

  const publish = formData.get("publish") === "true";

  const supabase = await createClient();

  // Verify the signed-in user.
  const { data, error: authError } = await supabase.auth.getClaims();

  if (authError || !data?.claims?.sub) {
    return {
      error: "Please sign in again.",
      success: "",
    };
  }

  // Retrieve only a business owned by this user.
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("id", businessId)
    .eq("owner_id", data.claims.sub)
    .maybeSingle();

  if (businessError || !business) {
    return {
      error: "Business not found or access denied.",
      success: "",
    };
  }

  // Require at least one review destination
  // before publishing.
  if (publish) {
    const { count, error: linksError } = await supabase
      .from("review_links")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", business.id);

    if (linksError) {
      return {
        error: "Unable to check review destinations.",
        success: "",
      };
    }

    if (!count) {
      return {
        error: "Add at least one review destination before publishing.",
        success: "",
      };
    }
  }

  // Update publication status.
  const { data: updated, error: updateError } = await supabase
    .from("businesses")
    .update({
      is_published: publish,
    })
    .eq("id", business.id)
    .eq("owner_id", data.claims.sub)
    .select("id")
    .single();

  if (updateError || !updated) {
    return {
      error: "Unable to update publication status.",
      success: "",
    };
  }

  // Refresh the owner dashboard and public page.
  revalidatePath("/dashboard");
  revalidatePath(`/r/${business.slug}`);

  return {
    error: "",
    success: publish
      ? "Your review page is now published."
      : "Your review page has been unpublished.",
  };
}
