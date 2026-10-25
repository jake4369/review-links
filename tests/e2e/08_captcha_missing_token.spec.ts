import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

const LOCAL_SUPABASE_ORIGIN = "http://127.0.0.1:54321";

// Read only the local CLI's published API settings. Never fall back to
// .env.local, which may point at the hosted ReviewBranch project.
function getLocalSupabasePublicKey(): string {
  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 30_000,
  });

  const values = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const name = line.slice(0, separator);
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    values.set(name, value);
  }

  const apiUrl = values.get("API_URL");
  const publicKey = values.get("PUBLISHABLE_KEY");
  if (!apiUrl || !publicKey) {
    throw new Error("Local Supabase URL or publishable key is unavailable.");
  }

  const parsed = new URL(apiUrl);
  if (
    parsed.origin !== LOCAL_SUPABASE_ORIGIN ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Refusing to test against a non-local Supabase API.");
  }

  return publicKey;
}

const missingTokenCases: Array<{
  name: string;
  path: string;
  payload: (email: string, password: string) => Record<string, string>;
}> = [
  {
    name: "signup",
    path: "/auth/v1/signup",
    payload: (email: string, password: string) => ({ email, password }),
  },
  {
    name: "password sign-in",
    path: "/auth/v1/token?grant_type=password",
    payload: (email: string, password: string) => ({ email, password }),
  },
  {
    name: "password recovery",
    path: "/auth/v1/recover",
    payload: (email: string) => ({ email }),
  },
  {
    name: "confirmation resend",
    path: "/auth/v1/resend",
    payload: (email: string) => ({ type: "signup", email }),
  },
];

for (const scenario of missingTokenCases) {
  test(`${scenario.name} rejects a missing CAPTCHA token`, async ({
    request,
  }) => {
    const publicKey = getLocalSupabasePublicKey();
    const unique = `${Date.now()}-${randomBytes(5).toString("hex")}`;
    const email = `captcha-negative-${unique}@reviewbranch.test`;
    const password = `Test${randomBytes(16).toString("hex")}Aa9!`;

    // Intentionally omit gotrue_meta_security.captcha_token.
    // Only localhost:54321 is contacted; production keys are never used.
    const response = await request.post(
      `${LOCAL_SUPABASE_ORIGIN}${scenario.path}`,
      {
        headers: {
          apikey: publicKey,
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        data: scenario.payload(email, password),
        timeout: 15_000,
      },
    );

    const result: { error_code?: string } = await response
      .json()
      .catch(() => ({}));

    expect(response.status(), `${scenario.name} HTTP status`).toBe(400);
    expect(result.error_code, `${scenario.name} Auth error code`).toBe(
      "captcha_failed",
    );
  });
}
