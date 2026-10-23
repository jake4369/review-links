"use client";

import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Feedback = {
  kind: "error";
  text: string;
} | null;

export default function ResetPasswordForm() {
  const router = useRouter();

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  const isBusy = loading || isNavigating;

  async function finishRecovery() {
    setFeedback(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        setFeedback({
          kind: "error",
          text:
            "Your password was updated, but we couldn't finish signing you out. " +
            "Try again using the button below.",
        });
        return;
      }

      startNavigation(() => {
        router.replace("/login?password=reset");
        router.refresh();
      });
    } catch {
      setFeedback({
        kind: "error",
        text:
          "Your password was updated, but we couldn't finish signing you out. " +
          "Try again using the button below.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) return;

    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setFeedback({
        kind: "error",
        text: "Your new password must be at least 8 characters long.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        kind: "error",
        text: "The passwords do not match. Please enter them again.",
      });
      return;
    }

    setLoading(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setFeedback({
          kind: "error",
          text: error.message,
        });
        return;
      }

      setPasswordUpdated(true);

      // End only the temporary recovery session on this browser.
      await finishRecovery();
    } catch {
      setFeedback({
        kind: "error",
        text: "Unable to update your password right now. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    setFeedback(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {passwordUpdated ? (
            <>
              <h1 className="text-center text-2xl font-bold">
                Password updated
              </h1>

              <p className="mt-3 text-center text-sm leading-6 text-slate-600">
                Your new password has been saved. Finish signing out of this
                recovery session to return to sign in.
              </p>

              {feedback && (
                <div
                  role="alert"
                  aria-atomic="true"
                  className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={finishRecovery}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
              >
                {isBusy ? "Finishing..." : "Finish and return to sign in"}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold">
                Choose a new password
              </h1>

              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                Enter a new password for your ReviewBranch account.
              </p>

              <form
                onSubmit={handleSubmit}
                aria-busy={isBusy}
                className="mt-8 space-y-5"
              >
            <div>
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>

              <input
                id="new-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isBusy}
                onChange={clearError}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-wait disabled:opacity-60"
              />

              <p className="mt-2 text-xs text-slate-500">
                Use a strong, unique password with at least 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium"
              >
                Confirm new password
              </label>

              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isBusy}
                onChange={clearError}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-wait disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isBusy && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                />
              )}

              {isBusy ? "Updating password..." : "Update password"}
            </button>

            <p role="status" aria-live="polite" className="sr-only">
              {isBusy ? "Updating your password, please wait." : ""}
            </p>
          </form>

              {feedback && (
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
        </section>
      </div>
    </main>
  );
}
