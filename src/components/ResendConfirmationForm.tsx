"use client";

import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import TurnstileChallenge from "@/components/TurnstileChallenge";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type Feedback = { kind: "error"; text: string } | null;

export default function ResendConfirmationForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileInstance | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setFeedback(null);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setFeedback({
        kind: "error",
        text: "Complete the security verification before continuing.",
      });
      return;
    }

    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-email`,
          ...(captchaToken ? { captchaToken } : {}),
        },
      });

      if (error) {
        setFeedback({
          kind: "error",
          text:
            "We couldn't send a confirmation email right now. " +
            "Please wait a moment and try again.",
        });
        return;
      }

      setSent(true);
    } catch {
      setFeedback({
        kind: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      // CAPTCHA tokens are single-use; reset after each resend attempt.
      if (TURNSTILE_SITE_KEY) {
        captchaRef.current?.reset();
        setCaptchaToken(null);
      }
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
        <div className="w-full max-w-md">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold">Check your email</h1>

            <p
              role="status"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              If an unconfirmed ReviewBranch account exists for that email
              address, we&apos;ve sent a new confirmation email.
            </p>

            <Link
              href="/login"
              className="mt-8 inline-block text-sm font-semibold text-blue-600 hover:underline"
            >
              Back to sign in
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-center text-2xl font-bold">
            Resend confirmation email
          </h1>

          <p className="mt-3 text-center text-sm leading-6 text-slate-600">
            Enter the email address you used to create your ReviewBranch
            account.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
            aria-busy={loading}
          >
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@business.co.uk"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {TURNSTILE_SITE_KEY && (
              <TurnstileChallenge
                siteKey={TURNSTILE_SITE_KEY}
                widgetRef={captchaRef}
                onTokenChange={setCaptchaToken}
              />
            )}

            <button
              type="submit"
              disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {loading && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                />
              )}

              {loading ? "Sending..." : "Resend confirmation email"}
            </button>

            <p role="status" aria-live="polite" className="sr-only">
              {loading ? "Sending confirmation email, please wait." : ""}
            </p>
          </form>

          {feedback && (
            <div
              role="alert"
              aria-atomic="true"
              className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <span aria-hidden="true" className="shrink-0 font-bold">
                !
              </span>
              <p>{feedback.text}</p>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
