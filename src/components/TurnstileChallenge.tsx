"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Ref } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

type TurnstileChallengeProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  widgetRef?: Ref<TurnstileInstance>;
};

// Cloudflare's normal widget is 300px wide and can overflow 320px form cards.
// Use its supported compact presentation only on narrow viewports.
const NARROW_SCREEN = "(max-width: 359px)";

function subscribeToScreenSize(onChange: () => void) {
  const media = window.matchMedia(NARROW_SCREEN);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isNarrowScreen() {
  return window.matchMedia(NARROW_SCREEN).matches;
}

function isServerNarrowScreen() {
  return false;
}

// Shared verification UI for authentication forms. The form remains
// responsible for passing the token to Supabase and resetting it after use.
export default function TurnstileChallenge({
  siteKey,
  onTokenChange,
  widgetRef,
}: TurnstileChallengeProps) {
  const [error, setError] = useState<string | null>(null);

  const compact = useSyncExternalStore(
    subscribeToScreenSize,
    isNarrowScreen,
    isServerNarrowScreen,
  );
  const size = compact ? "compact" : "normal";

  // When viewport changes recreate the challenge and discard the old token.
  // Keep the callback current without re-subscribing on every form render.
  const onTokenChangeRef = useRef(onTokenChange);
  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);
  useEffect(() => {
    onTokenChangeRef.current(null);
  }, [size]);

  function invalidateToken(message: string | null) {
    onTokenChange(null);
    setError(message);
  }

  return (
    <div role="group" aria-label="Security verification" className="space-y-2">
      <Turnstile
        key={size}
        ref={widgetRef}
        siteKey={siteKey}
        options={{ theme: "auto", responseField: false, size }}
        onSuccess={(token) => {
          onTokenChange(token);
          setError(null);
        }}
        onExpire={() => invalidateToken(null)}
        onError={() =>
          invalidateToken(
            "The security check couldn't complete. Please try again.",
          )
        }
        onTimeout={() =>
          invalidateToken("The security check timed out. Please try again.")
        }
        onUnsupported={() =>
          invalidateToken(
            "This browser can't complete the security check. Try another browser.",
          )
        }
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
