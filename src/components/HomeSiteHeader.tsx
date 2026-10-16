"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthState = "checking" | "signed-in" | "signed-out";

type SiteLink = { label: string; href: string };

// Add future public navigation links here (only when their pages exist).
const SITE_LINKS: SiteLink[] = [
  { label: "How it works", href: "/#how-it-works" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

const buttonBase =
  `inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${focusRing}`;

export default function HomeSiteHeader() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement | null>(null);
  const loginLinkRef = useRef<HTMLAnchorElement | null>(null);
  const focusLoginAfterLogout = useRef(false);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;
        receivedAuthEvent = true;
        if (active) {
          setAuthState(session?.user ? "signed-in" : "signed-out");
          setSignOutError("");
        }
      },
    );

    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (active && !receivedAuthEvent) {
          setAuthState(!error && data.user ? "signed-in" : "signed-out");
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

  // When the sign-out button disappears, restore focus to the visible login link.
  useEffect(() => {
    if (authState === "signed-out" && !menuOpen && focusLoginAfterLogout.current) {
      focusLoginAfterLogout.current = false;
      loginLinkRef.current?.focus();
    }
  }, [authState, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    firstMenuLinkRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuAreaRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    if (isSigningOut) return;
    setSignOutError("");
    setIsSigningOut(true);
    focusLoginAfterLogout.current = true;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        focusLoginAfterLogout.current = false;
        setSignOutError("Couldn't log out. Please try again.");
        return;
      }
      setAuthState("signed-out");
      setMenuOpen(false);
      router.refresh();
    } catch {
      focusLoginAfterLogout.current = false;
      setSignOutError("Couldn't log out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  const signedIn = authState === "signed-in";
  const signedOut = authState === "signed-out";

  return (
    <header className="relative z-50 mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <Link
        href="/"
        className={`min-w-0 justify-self-start whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 sm:text-xl ${focusRing}`}
        aria-label="ReviewBranch homepage"
        onClick={() => setMenuOpen(false)}
      >
        Review<span className="text-blue-600">Branch</span>
      </Link>

      {/* Public site navigation stays centred on desktop. */}
      <nav aria-label="Site navigation" className="hidden items-center justify-center gap-8 md:flex">
        {SITE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-1 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 ${focusRing}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex min-w-0 items-center justify-end gap-2 md:justify-self-end" ref={menuAreaRef}>
        {signedOut && (
          <Link
            ref={loginLinkRef}
            href="/login"
            className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
            onClick={() => setMenuOpen(false)}
          >
            Log in
          </Link>
        )}

        {authState === "checking" && (
          <span role="status" aria-label="Checking sign-in status" className="inline-flex min-h-11 w-20 animate-pulse items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500 motion-reduce:animate-none">
            <span className="sr-only">Checking your account</span>
          </span>
        )}

        {/* Signed-out: mobile only. Signed-in: both mobile and desktop. */}
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="reviewbranch-nav-panel"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 transition-colors hover:bg-slate-50 ${focusRing} ${signedIn ? "" : "md:hidden"}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
            {menuOpen ? (
              <path d="M5 5l14 14M19 5L5 19" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {menuOpen && (
          <div
            id="reviewbranch-nav-panel"
            className="absolute right-4 top-full z-50 mt-1 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:right-6"
          >
            <nav aria-label="Menu navigation" className="flex flex-col gap-1">
              {SITE_LINKS.map((link, index) => (
                <Link
                  ref={index === 0 ? firstMenuLinkRef : undefined}
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 ${focusRing}`}
                >
                  {link.label}
                </Link>
              ))}

              {signedIn && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 ${focusRing}`}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
                  >
                    {isSigningOut ? "Logging out…" : "Log out"}
                  </button>
                </>
              )}
            </nav>
            {signOutError && <p role="alert" className="mt-2 px-4 pb-2 text-sm text-red-700">{signOutError}</p>}
          </div>
        )}
      </div>
    </header>
  );
}
