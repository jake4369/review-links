"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewDestinationError } from "@/lib/review-destination-validation";

export type DestinationFieldErrors = {
  platform?: string;
  url?: string;
};

export type SaveProfileState = {
  error: string;
  success: string;
  fieldErrors?: Record<string, DestinationFieldErrors>;
  submittedPayload?: string;
  savedDestinations?: Array<{ id: string; platform: string; url: string }>;
};

type SubmittedDestination = {
  clientKey: string;
  id?: string;
  platform: string;
  url: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDestinations(input: string): SubmittedDestination[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 10) return null;

  const rows: SubmittedDestination[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.clientKey !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(item.clientKey) ||
      typeof item.platform !== "string" ||
      typeof item.url !== "string" ||
      (item.id !== undefined && (typeof item.id !== "string" || !UUID_PATTERN.test(item.id)))
    ) return null;
    rows.push({
      clientKey: item.clientKey,
      ...(typeof item.id === "string" ? { id: item.id } : {}),
      platform: item.platform.trim(),
      url: item.url.trim(),
    });
  }
  return rows;
}

export async function saveBusinessProfile(
  businessId: string,
  formData: FormData,
): Promise<SaveProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  const logoText = String(formData.get("logoText") ?? "").trim();
  const welcomeMessage = String(formData.get("message") ?? "").trim();
  const invitationMessage = String(formData.get("invitationMessage") ?? "").trim();
  const rawPayload = formData.get("destinations");

  if (!name || name.length > 120) return { error: "Business name must be 1–120 characters.", success: "" };
  if (logoText.length > 12) return { error: "Logo text cannot exceed 12 characters.", success: "" };
  if (welcomeMessage.length > 500 || invitationMessage.length > 500) {
    return { error: "Messages cannot exceed 500 characters.", success: "" };
  }
  if (typeof rawPayload !== "string" || rawPayload.length > 25000) {
    return { error: "Invalid review destination data. Please reload and try again.", success: "" };
  }

  const destinations = parseDestinations(rawPayload);
  if (!destinations) {
    return { error: "Invalid review destination list. You may have added more than 10 destinations.", success: "" };
  }

  const fieldErrors: Record<string, DestinationFieldErrors> = {};
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const destination of destinations) {
    const errors: DestinationFieldErrors = {};
    const normalizedName = destination.platform.toLocaleLowerCase("en");

    if (seenKeys.has(destination.clientKey)) {
      return { error: "Duplicate destination identifiers. Reload the editor and try again.", success: "" };
    }
    seenKeys.add(destination.clientKey);

    if (destination.id) {
      if (seenIds.has(destination.id)) {
        return { error: "The same saved destination was submitted twice.", success: "" };
      }
      seenIds.add(destination.id);
    }

    if (!destination.platform || destination.platform.length > 40) {
      errors.platform = "Enter a destination name (1–40 characters).";
    } else if (seenNames.has(normalizedName)) {
      errors.platform = "Use a different destination name for each link, such as Google — Birmingham.";
    } else {
      seenNames.add(normalizedName);
    }

    if (!destination.url) {
      errors.url = "Enter a review URL or remove this destination.";
    } else {
      const localUrlError = reviewDestinationError(destination.platform, destination.url);
      if (localUrlError) errors.url = localUrlError;
    }

    if (errors.platform || errors.url) fieldErrors[destination.clientKey] = errors;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Please correct the highlighted destinations before saving.",
      success: "",
      fieldErrors,
      submittedPayload: rawPayload,
    };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError || !authData?.claims?.sub) {
    return { error: "Your session has expired. Please sign in again.", success: "" };
  }

  const { data: ownedBusiness, error: lookupError } = await supabase
    .from("businesses")
    .select("id, slug, is_published")
    .eq("id", businessId)
    .eq("owner_id", authData.claims.sub)
    .maybeSingle();

  if (lookupError || !ownedBusiness) {
    return { error: "You are not authorised to edit this business.", success: "" };
  }
  if (ownedBusiness.is_published && destinations.length === 0) {
    return { error: "Unpublish your profile before removing its final review destination.", success: "", submittedPayload: rawPayload };
  }

  // Database URL policy is authoritative; identify the exact invalid row.
  for (const destination of destinations) {
    const { data: allowed, error: validationError } = await supabase.rpc(
      "review_destination_is_valid",
      { p_platform: destination.platform, p_url: destination.url },
    );
    if (validationError) {
      console.error("Review destination validation unavailable:", validationError);
      return { error: "Unable to verify review destinations right now. Please try again.", success: "" };
    }
    if (allowed !== true) {
      fieldErrors[destination.clientKey] = {
        url: "The database rejected this destination. Check the platform name and official review URL.",
      };
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please correct the highlighted destinations before saving.", success: "", fieldErrors, submittedPayload: rawPayload };
  }

  const { error: saveError } = await supabase.rpc("save_business_profile_v2", {
    p_business_id: businessId,
    p_name: name,
    p_logo_text: logoText,
    p_welcome_message: welcomeMessage,
    p_invitation_message: invitationMessage,
    p_review_links: destinations.map(({ id, platform, url }) => ({ ...(id ? { id } : {}), platform, url })),
  });

  if (saveError) {
    console.error("Profile save failed:", saveError);
    if (saveError.code === "23505") {
      return { error: "Destination names must currently be unique. Use a different name for each link.", success: "", submittedPayload: rawPayload };
    }
    if (saveError.code === "23514") {
      return { error: "A database safety rule rejected this change. Check the destination URLs and publication status.", success: "", submittedPayload: rawPayload };
    }
    return { error: "Unable to save your profile. Please try again.", success: "", submittedPayload: rawPayload };
  }

  // Returning database-generated UUIDs matters: otherwise saving again without
  // reloading would recreate new destinations rather than updating them.
  const { data: saved, error: refreshError } = await supabase
    .from("review_links")
    .select("id, platform, url")
    .eq("business_id", businessId)
    .order("display_order", { ascending: true });

  if (refreshError) {
    console.error("Profile saved but destination refresh failed:", refreshError);
    return {
      error: "",
      success: "Saved successfully. Reload this page before making more changes.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  revalidatePath(`/r/${ownedBusiness.slug}`);

  return { error: "", success: "Profile saved successfully.", savedDestinations: saved ?? [] };
}
