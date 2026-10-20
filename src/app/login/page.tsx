import { redirect } from "next/navigation";

import AuthForm from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims?.sub) {
    redirect("/dashboard");
  }

  const { confirmation } = await searchParams;
  const confirmationFailed = confirmation === "failed";

  // Reset initial feedback if navigation changes the confirmation outcome.
  return (
    <AuthForm
      key={confirmationFailed ? "confirmation-failed" : "login"}
      confirmationFailed={confirmationFailed}
    />
  );
}
