"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthState = "checking" | "signed-in" | "signed-out";

const baseButton =
  "inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export default function HomeAuthNav() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    // Keep navigation in sync across tabs. Let getUser() verify the initial
    // state; the INITIAL_SESSION event is only a local cache snapshot.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;
        receivedAuthEvent = true;
        if (active) {
          setAuthState(session?.user ? "signed-in" : "signed-out");
        }
      },
    );

    // Confirm the initial identity with Supabase rather than trusting a raw
    // locally stored session. RLS and server routes remain the security boundary.
    void supabase.auth.getUser()
      .then(({ data, error: authError }) => {
        if (active && !receivedAuthEvent) {
          setAuthState(!authError && data.user ? "signed-in" : "signed-out");
        }
      })
      .catch(() => {
        if (active && !receivedAuthEvent) setAuthState("signed-out");
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    if (isSigningOut) return;
    setError("");
    setIsSigningOut(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError("Couldn't sign you out. Please try again.");
        return;
      }

      setAuthState("signed-out");
      // Reconcile any cached server-rendered auth state after cookies are cleared.
      router.refresh();
    } catch {
      setError("Couldn't sign you out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <nav aria-label="Account navigation" className="flex flex-wrap items-center justify-end gap-2">
        {authState === "checking" ? (
          <span className="min-h-10 px-3 py-2 text-sm text-slate-600" role="status">
            Checking account…
          </span>
        ) : authState === "signed-out" ? (
          <Link
            href="/login"
            className={`${baseButton} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Log in
          </Link>
        ) : (
          <>
            <Link
              href="/dashboard"
              className={`${baseButton} bg-blue-600 text-white hover:bg-blue-700`}
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              aria-busy={isSigningOut}
              className={`${baseButton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60`}
            >
              {isSigningOut ? "Logging out…" : "Log out"}
            </button>
          </>
        )}
      </nav>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
