"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setMessage("");
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
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        // Some Supabase projects may not require
        // email confirmation.
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        setMessage(
          "Account created! Please check your email and " +
            "click the confirmation link. Once verified, " +
            "return here and sign in.",
        );

        return;
      }

      // Existing user login.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setMessage("");
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 " +
    "bg-white px-4 py-3 text-sm outline-none " +
    "focus:border-blue-500";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Review
            <span className="text-blue-600">Branch</span>
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                className={inputClass}
              />

              {isSignup && (
                <p className="mt-2 text-xs text-slate-500">
                  Use a strong, unique password with at least 8 characters.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isSignup
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700"
            >
              {message}
            </p>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">
              {isSignup ? "Already have an account?" : "Don't have an account?"}
            </p>

            <button
              type="button"
              onClick={switchMode}
              className="mt-2 text-sm font-semibold text-blue-600 hover:underline"
            >
              {isSignup ? "Sign In" : "Create an Account"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
