"use client";

import { useState } from "react";
import type { Ref } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

type TurnstileChallengeProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  widgetRef?: Ref<TurnstileInstance>;
};

// Shared verification UI for authentication forms. The form remains
// responsible for passing the token to Supabase and resetting it after use.
export default function TurnstileChallenge({
  siteKey,
  onTokenChange,
  widgetRef,
}: TurnstileChallengeProps) {
  const [error, setError] = useState<string | null>(null);

  function invalidateToken(message: string | null) {
    onTokenChange(null);
    setError(message);
  }

  return (
    <div role="group" aria-label="Security verification" className="space-y-2">
      <Turnstile
        ref={widgetRef}
        siteKey={siteKey}
        options={{ theme: "auto", responseField: false }}
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
