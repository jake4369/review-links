"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

type Feedback =
  | { kind: "error"; text: string }
  | { kind: "success"; text: string }
  | null;

export default function ForgotPasswordForm({
  recoveryFailed = false,
}: {
  recoveryFailed?: boolean;
}) {
  const [feedback, setFeedback] = useState<Feedback>(() =>
    recoveryFailed
      ? {
          kind: "error",
          text:
            "We couldn't verify that password reset link. " +
            "It may be invalid or expired. " +
            "Request a new password reset email below.",
        }
      : null,
  );
  const [loading, setLoading] = useState(false);

  const requestSent = feedback?.kind === "success";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setFeedback(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recover-password`,
      });

      if (error) {
        setFeedback({
          kind: "error",
          text: "Unable to send password reset instructions right now. Please try again.",
        });
        return;
      }

      setFeedback({
        kind: "success",
        text:
          "If an account exists for that email address, we've sent password reset instructions.",
      });
    } catch {
      setFeedback({
        kind: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Review
            <span className="text-blue-700">Branch</span>
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {requestSent ? (
            <div role="status" aria-live="polite" aria-atomic="true">
              <h1 className="text-center text-2xl font-bold">
                Check your email
              </h1>

              <p className="mt-3 text-center text-sm leading-6 text-slate-600">
                {feedback.text} Follow the link in that email to choose a new
                password.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold">
                Reset your password
              </h1>

              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                Enter the email address you use for ReviewBranch and we&apos;ll
                send password reset instructions.
              </p>

              <form
                onSubmit={handleSubmit}
                aria-busy={loading}
                className="mt-8 space-y-5"
              >
                <div>
                  <label htmlFor="recovery-email" className="text-sm font-medium">
                    Email address
                  </label>

                  <input
                    id="recovery-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@business.co.uk"
                    disabled={loading}
                    onChange={() => {
                      if (feedback?.kind === "error") setFeedback(null);
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-wait disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                >
                  {loading && (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                    />
                  )}

                  {loading ? "Sending..." : "Send reset link"}
                </button>

                <p role="status" aria-live="polite" className="sr-only">
                  {loading
                    ? "Sending password reset instructions, please wait."
                    : ""}
                </p>
              </form>

              {feedback?.kind === "error" && (
                <div
                  role="alert"
                  aria-atomic="true"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
                >
                  {feedback.text}
                </div>
              )}
            </>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
