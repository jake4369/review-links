"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  REVIEW_DESTINATIONS,
  reviewDestinationError,
  type ReviewField,
} from "@/lib/review-destination-validation";

export type SaveProfileState = {
  error: string;
  success: string;
  fieldErrors?: Partial<Record<ReviewField, string>>;
  submittedValues?: Partial<Record<ReviewField, string>>;
};

export async function saveBusinessProfile(
  businessId: string,
  _previousState: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  const logoText = String(formData.get("logoText") ?? "").trim();
  const welcomeMessage = String(formData.get("message") ?? "").trim();
  const invitationMessage = String(formData.get("invitationMessage") ?? "").trim();

  if (!name || name.length > 120) {
    return { error: "Business name must be 1–120 characters.", success: "" };
  }
  if (logoText.length > 12) {
    return { error: "Logo text cannot exceed 12 characters.", success: "" };
  }
  if (welcomeMessage.length > 500 || invitationMessage.length > 500) {
    return { error: "Messages cannot exceed 500 characters.", success: "" };
  }

  const fieldErrors: Partial<Record<ReviewField, string>> = {};
  const submittedValues: Partial<Record<ReviewField, string>> = {};
  const reviewLinks: { platform: string; url: string }[] = [];

  for (const destination of REVIEW_DESTINATIONS) {
    const value = String(formData.get(destination.field) ?? "").trim();
    submittedValues[destination.field] = value;

    const error = reviewDestinationError(destination.name, value);
    if (error) {
      fieldErrors[destination.field] = error;
    } else if (value) {
      reviewLinks.push({ platform: destination.name, url: value });
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Please correct the highlighted review links before saving.",
      success: "",
      fieldErrors,
      submittedValues,
    };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const ownerId = authData?.claims?.sub;
  if (authError || !ownerId) {
    return { error: "Your session has expired. Please sign in again.", success: "" };
  }

  const { data: ownedBusiness, error: lookupError } = await supabase
    .from("businesses")
    .select("id, slug, is_published")
    .eq("id", businessId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (lookupError || !ownedBusiness) {
    return { error: "You are not authorised to edit this business.", success: "" };
  }

  if (ownedBusiness.is_published && reviewLinks.length === 0) {
    return {
      error: "Unpublish your profile before removing the final review destination.",
      success: "",
    };
  }

  // Verify against PostgreSQL's authoritative URL policy before saving.
  // If SQL ever changes, the rejected destination still gets its own error.
  for (const destination of REVIEW_DESTINATIONS) {
    const value = submittedValues[destination.field];
    if (!value) continue;

    const { data: accepted, error: validationError } = await supabase.rpc(
      "review_destination_is_valid",
      { p_platform: destination.name, p_url: value },
    );

    if (validationError) {
      console.error("Review link validation unavailable:", validationError);
      return {
        error: "Unable to verify review destinations right now. Please try again.",
        success: "",
      };
    }

    if (accepted !== true) {
      fieldErrors[destination.field] =
        "This destination was rejected by the security rules. Check that it is a direct, official review URL.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Please correct the highlighted review links before saving.",
      success: "",
      fieldErrors,
      submittedValues,
    };
  }

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
    if (
      error.code === "23514" ||
      error.message.includes("review_links_destination_valid")
    ) {
      return {
        error: "A review URL was rejected by the database. Check the destination links and try again.",
        success: "",
      };
    }
    return { error: "Unable to save your profile. Please try again.", success: "" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  revalidatePath(`/r/${ownedBusiness.slug}`);

  return { error: "", success: "Your business profile has been saved successfully." };
}
