import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { recovery } = await searchParams;
  const recoveryFailed = recovery === "failed";

  return (
    <ForgotPasswordForm
      key={recoveryFailed ? "recovery-failed" : "forgot-password"}
      recoveryFailed={recoveryFailed}
    />
  );
}
