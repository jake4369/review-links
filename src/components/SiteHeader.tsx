"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthState = "checking" | "signed-in" | "signed-out";
type SiteLink = { label: string; href: string };

// Add public navigation links here when their pages actually exist.
const SITE_LINKS: SiteLink[] = [
  { label: "How it works", href: "/#how-it-works" },
];

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
const linkStyle =
  `rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-700 ${focus}`;
const primaryStyle =
  `inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${focus}`;
const secondaryStyle =
  `inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${focus}`;

export default function SiteHeader() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);
  const desktopLoginRef = useRef<HTMLAnchorElement>(null);
  const returnFocusAfterSignOut = useRef(false);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;
        authEventReceived = true;
        if (active) {
          setAuthState(session?.user ? "signed-in" : "signed-out");
          setSignOutError("");
        }
      },
    );

    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (active && !authEventReceived) {
          setAuthState(!error && data.user ? "signed-in" : "signed-out");
        }
      })
      .catch(() => {
        if (active && !authEventReceived) setAuthState("signed-out");
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!menuOpen) return;
    firstMenuItemRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (mq.matches) setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    mq.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      mq.removeEventListener("change", onDesktop);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (authState !== "signed-out" || !returnFocusAfterSignOut.current) return;
    returnFocusAfterSignOut.current = false;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      desktopLoginRef.current?.focus();
    } else {
      toggleRef.current?.focus();
    }
  }, [authState]);

  async function signOut() {
    if (isSigningOut) return;
    setSignOutError("");
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError("Unable to log out. Please try again.");
        return;
      }
      returnFocusAfterSignOut.current = true;
      setAuthState("signed-out");
      setMenuOpen(false);
      // Leave a protected dashboard route before refreshing the auth-dependent UI.
      if (pathname.startsWith("/dashboard")) {
        router.replace("/");
      } else {
        router.refresh();
      }
    } catch {
      setSignOutError("Unable to log out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  const signedIn = authState === "signed-in";
  const signedOut = authState === "signed-out";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5">
        <Link
          href="/"
          aria-label="ReviewBranch homepage"
          className={`min-w-0 whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 sm:text-xl ${focus}`}
          onClick={() => setMenuOpen(false)}
        >
          Review<span className="text-blue-600">Branch</span>
        </Link>

        {/* Desktop: all navigation and account actions shown directly, no hamburger. */}
        <nav aria-label="Main navigation" className="hidden items-center justify-center gap-4 lg:flex">
          {SITE_LINKS.map(({ label, href }) => (
            <Link key={href} href={href} className={linkStyle}>
              {label}
            </Link>
          ))}
          {signedOut && (
            <Link ref={desktopLoginRef} href="/login" className={primaryStyle}>
              Log in
            </Link>
          )}
          {signedIn && (
            <>
              <Link href="/dashboard" className={primaryStyle}>Dashboard</Link>
              <button
                type="button"
                onClick={signOut}
                disabled={isSigningOut}
                className={`${secondaryStyle} disabled:cursor-wait disabled:opacity-60`}
              >
                {isSigningOut ? "Logging out…" : "Log out"}
              </button>
            </>
          )}
          {authState === "checking" && (
            <span role="status" aria-label="Checking sign-in status" className="h-11 w-20 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
          )}
        </nav>
        <div className="hidden lg:block" aria-hidden="true" />

        {/* Mobile/tablet: only the logo and menu trigger remain visible. */}
        <div className="relative lg:hidden" ref={menuRef}>
          <button
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="reviewbranch-mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 ${focus}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              {menuOpen ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {menuOpen && (
            <nav
              id="reviewbranch-mobile-navigation"
              aria-label="Mobile navigation"
              className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <div className="flex flex-col gap-1">
                {SITE_LINKS.map(({ label, href }, index) => (
                  <Link
                    key={href}
                    href={href}
                    ref={index === 0 ? firstMenuItemRef : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 ${focus}`}
                  >
                    {label}
                  </Link>
                ))}
                {authState !== "checking" && <div className="my-1 border-t border-slate-100" />}
                {signedOut && (
                  <Link href="/login" onClick={() => setMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 ${focus}`}>
                    Log in
                  </Link>
                )}
                {signedIn && (
                  <>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 ${focus}`}>
                      Dashboard
                    </Link>
                    <button type="button" onClick={signOut} disabled={isSigningOut} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60 ${focus}`}>
                      {isSigningOut ? "Logging out…" : "Log out"}
                    </button>
                  </>
                )}
                {authState === "checking" && <p role="status" className="px-4 py-3 text-sm text-slate-600">Checking your account…</p>}
              </div>
            </nav>
          )}
        </div>
      </div>
      {signOutError && (
        <div role="alert" className="mx-auto max-w-6xl px-4 pb-3 text-sm text-red-700 sm:px-6">
          {signOutError}
        </div>
      )}
    </header>
  );
}
