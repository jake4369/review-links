import AuthForm from "@/components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
