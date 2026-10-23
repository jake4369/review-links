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

  const { confirmation, password } = await searchParams;
  const confirmationFailed = confirmation === "failed";
  const passwordReset = password === "reset";

  const stateKey = confirmationFailed
    ? "confirmation-failed"
    : passwordReset
      ? "password-reset"
      : "login";

  return (
    <AuthForm
      key={stateKey}
      confirmationFailed={confirmationFailed}
      passwordReset={passwordReset}
    />
  );
}
