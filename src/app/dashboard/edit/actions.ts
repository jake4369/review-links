"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveProfileState = {
  error: string;
  success: string;
};

const platforms = [
  { name: "Google", field: "google" },
  { name: "Trustpilot", field: "trustpilot" },
  { name: "Facebook", field: "facebook" },
] as const;

export async function saveBusinessProfile(
  businessId: string,
  _previousState: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  const logoText = String(formData.get("logoText") ?? "").trim();

  const welcomeMessage = String(formData.get("message") ?? "").trim();

  const invitationMessage = String(
    formData.get("invitationMessage") ?? "",
  ).trim();

  // Validate the business information.
  if (!name || name.length > 120) {
    return {
      error: "Business name must be 1–120 characters.",
      success: "",
    };
  }

  if (logoText.length > 12) {
    return {
      error: "Logo text cannot exceed 12 characters.",
      success: "",
    };
  }

  if (welcomeMessage.length > 500 || invitationMessage.length > 500) {
    return {
      error: "Messages cannot exceed 500 characters.",
      success: "",
    };
  }

  // Validate and prepare review destinations.
  const reviewLinks: {
    platform: string;
    url: string;
  }[] = [];

  for (const platform of platforms) {
    const value = String(formData.get(platform.field) ?? "").trim();

    // Empty field means this platform is disabled.
    if (!value) continue;

    if (value.length > 2048) {
      return {
        error: `${platform.name} URL is too long.`,
        success: "",
      };
    }

    try {
      const parsed = new URL(value);

      if (
        parsed.protocol !== "https:" ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      return {
        error: `Please enter a valid HTTPS review URL for ${platform.name}.`,
        success: "",
      };
    }

    reviewLinks.push({
      platform: platform.name,
      url: value,
    });
  }

  const supabase = await createClient();

  // Verify the signed-in user.
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return {
      error: "Your session has expired. Please sign in again.",
      success: "",
    };
  }

  // Verify this particular business belongs to the user.
  const { data: ownedBusiness, error: lookupError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("id", businessId)
    .eq("owner_id", authData.claims.sub)
    .maybeSingle();

  if (lookupError || !ownedBusiness) {
    return {
      error: "You are not authorised to edit this business.",
      success: "",
    };
  }

  // Update details and review links in one transaction.
  const { error } = await supabase.rpc("save_business_profile", {
    p_business_id: businessId,
    p_name: name,
    p_logo_text: logoText,
    p_welcome_message: welcomeMessage,
    p_invitation_message: invitationMessage,
    p_review_links: reviewLinks,
  });

  if (error) {
    console.error("Profile save failed:", error);

    return {
      error: "Unable to save your profile. Please try again.",
      success: "",
    };
  }

  // Refresh the database-backed pages.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  revalidatePath(`/r/${ownedBusiness.slug}`);

  return {
    error: "",
    success: "Your business profile has been saved successfully.",
  };
}
