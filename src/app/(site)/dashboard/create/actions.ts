"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CreateBusinessState = {
  error: string;
};

export async function createBusiness(
  _previousState: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const name = String(formData.get("name") ?? "").trim();

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();

  // Validate the business name.
  if (name.length < 1 || name.length > 120) {
    return {
      error: "Enter a business name (maximum 120 characters).",
    };
  }

  // Validate the public slug.
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  if (slug.length < 3 || slug.length > 60 || !slugPattern.test(slug)) {
    return {
      error:
        "Your address must be 3–60 characters and contain only lowercase letters, numbers or hyphens.",
    };
  }

  const supabase = await createClient();

  // Identify the authenticated user.
  const { data, error: authError } = await supabase.auth.getClaims();

  if (authError || !data?.claims?.sub) {
    return {
      error: "Your session has expired. Please sign in again.",
    };
  }

  const userId = data.claims.sub;

  // Limit the MVP interface to one business per user.
  const { data: existing, error: lookupError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return {
      error: "Unable to check your account. Please try again.",
    };
  }

  if (existing) {
    redirect("/dashboard");
  }

  // Create the business.
  const { error } = await supabase.from("businesses").insert({
    owner_id: userId,
    name,
    slug,
    logo_text: name.slice(0, 12),
    welcome_message:
      "Thank you for choosing us! We'd love to hear about your experience.",
    invitation_message:
      `Hi! Thank you for choosing ${name}. ` +
      "We'd appreciate an honest review of your experience.",
    is_published: false,
  });

  if (error) {
    // PostgreSQL unique constraint violation.
    if (error.code === "23505") {
      return {
        error:
          "That review page address is already taken. Please choose another.",
      };
    }

    console.error("Business creation failed:", error);

    return {
      error: "Unable to create your business. Please try again.",
    };
  }

  // Refresh server-rendered dashboard data.
  revalidatePath("/dashboard");

  // Only redirect after a successful insert.
  redirect("/dashboard");
}
