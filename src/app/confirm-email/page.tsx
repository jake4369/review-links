import { redirect } from "next/navigation";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token_hash: tokenHash, type } = await searchParams;

  if (
    typeof tokenHash !== "string" ||
    !tokenHash ||
    type !== "email"
  ) {
    redirect("/login?confirmation=failed");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">Confirm your email address</h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Continue to securely confirm your email address and activate your
            ReviewBranch account.
          </p>

          <form action="/auth/confirm" method="post" className="mt-8">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value="email" />

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Confirm email address
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
