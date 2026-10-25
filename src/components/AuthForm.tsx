"use client";

import { useRef, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import TurnstileChallenge from "@/components/TurnstileChallenge";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
const CAPTCHA_REQUIRED_MESSAGE =
  "Complete the security verification before continuing.";

type AuthMode = "login" | "signup";
type AuthFeedback = { kind: "error" | "success"; text: string } | null;

export default function AuthForm({
  confirmationFailed,
  passwordReset,
}: {
  confirmationFailed: boolean;
  passwordReset: boolean;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [feedback, setFeedback] = useState<AuthFeedback>(() => {
    if (confirmationFailed) {
      return {
        kind: "error",
        text:
          "We couldn't confirm your email address. " +
          "The link may be invalid or expired. " +
          "Open the most recent confirmation email and try its link. " +
          "If you have already confirmed your email, sign in.",
      };
    }

    if (passwordReset) {
      return {
        kind: "success",
        text: "Password changed successfully. Sign in with your new password.",
      };
    }

    return null;
  });
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileInstance | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  const isSignup = mode === "signup";
  const isBusy = loading || isNavigating;

  function goToDashboard() {
    // Keep the button busy until the dashboard navigation completes,
    // not just until Supabase has accepted the credentials.
    startNavigation(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) return;

    setFeedback(null);

    // Both signup and sign-in require a token when Turnstile is configured.
    // Hosted enforcement stays disabled until every authentication flow is ready.
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setFeedback({ kind: "error", text: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }

    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") ?? "");

    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/confirm-email`,
            ...(captchaToken ? { captchaToken } : {}),
          },
        });

        if (error) {
          setFeedback({ kind: "error", text: error.message });
          return;
        }

        // Some Supabase projects may not require email confirmation.
        if (data.session) {
          goToDashboard();
          return;
        }

        setFeedback({
          kind: "success",
          text:
            "Account created! Please check your email and " +
            "follow the confirmation link to activate your account.",
        });

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      });

      if (error) {
        setFeedback({ kind: "error", text: error.message });
        return;
      }

      goToDashboard();
    } catch {
      setFeedback({
        kind: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      // Tokens are single-use. Reset after every authentication attempt.
      if (TURNSTILE_SITE_KEY) {
        captchaRef.current?.reset();
        setCaptchaToken(null);
      }

      // isNavigating remains true through Next.js route navigation.
      setLoading(false);
    }
  }

  function switchMode() {
    if (isBusy) return;
    setMode(isSignup ? "login" : "signup");
    setCaptchaToken(null);
    setFeedback(null);
  }

  // General credential errors do not identify which input was wrong.
  // Keep both fields neutral instead of incorrectly marking one as invalid.
  function clearErrorOnEdit() {
    setFeedback((current) => (current?.kind === "error" ? null : current));
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 " +
    "bg-white px-4 py-3 text-sm outline-none " +
    "focus:border-blue-500";

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
          <h1 className="text-center text-2xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>

          <p className="mt-2 text-center text-sm text-slate-500">
            {isSignup
              ? "Start collecting reviews the easy way."
              : "Sign in to manage your review page."}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
            aria-busy={isBusy}
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
                onChange={clearErrorOnEdit}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                required
                onChange={clearErrorOnEdit}
                className={inputClass}
              />

              {isSignup ? (
                <p className="mt-2 text-xs text-slate-500">
                  Use a strong, unique password with at least 8 characters.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-2">
                  <Link
                    href="/resend-confirmation"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Resend confirmation email
                  </Link>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isBusy || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isBusy && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                />
              )}
              {isBusy
                ? isSignup
                  ? "Creating account..."
                  : "Signing in..."
                : isSignup
                  ? "Create Account"
                  : "Sign In"}
            </button>

            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <TurnstileChallenge
                  key={mode}
                  siteKey={TURNSTILE_SITE_KEY}
                  widgetRef={captchaRef}
                  onTokenChange={(token) => {
                    setCaptchaToken(token);
                    if (token) {
                      setFeedback((current) =>
                        current?.kind === "error" &&
                        current.text === CAPTCHA_REQUIRED_MESSAGE
                          ? null
                          : current,
                      );
                    }
                  }}
                />
              </div>
            )}

            <p role="status" aria-live="polite" className="sr-only">
              {isBusy
                ? isSignup
                  ? "Creating your account, please wait."
                  : "Signing you in, please wait."
                : ""}
            </p>
          </form>

          {feedback && (
            <div
              role={feedback.kind === "error" ? "alert" : "status"}
              aria-atomic="true"
              className={
                "mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm " +
                (feedback.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800")
              }
            >
              <span aria-hidden="true" className="shrink-0 font-bold">
                {feedback.kind === "error" ? "!" : "✓"}
              </span>
              <p>{feedback.text}</p>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">
              {isSignup ? "Already have an account?" : "Don't have an account?"}
            </p>

            <button
              type="button"
              disabled={isBusy}
              onClick={switchMode}
              className="mt-2 text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSignup ? "Sign In" : "Create an Account"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
