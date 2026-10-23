import { redirect } from "next/navigation";

export default async function RecoverPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token_hash: tokenHash, type } = await searchParams;

  if (
    typeof tokenHash !== "string" ||
    !tokenHash ||
    type !== "recovery"
  ) {
    redirect("/forgot-password?recovery=failed");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">Reset your password</h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Continue to securely verify this password reset request and choose
            a new password.
          </p>

          <form action="/auth/recovery" method="post" className="mt-8">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value="recovery" />

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Continue to reset password
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
