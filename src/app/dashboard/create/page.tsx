import { redirect } from "next/navigation";

import CreateBusinessForm from "@/components/CreateBusinessForm";
import { createClient } from "@/lib/supabase/server";

export default async function CreateBusinessPage() {
  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.getClaims();

  if (authError || !data?.claims?.sub) {
    redirect("/login");
  }

  // Check whether this user already owns a business.
  const { data: existing, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", data.claims.sub)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load your business account.");
  }

  if (existing) {
    redirect("/dashboard");
  }

  return <CreateBusinessForm />;
}
