import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

const TEST_BASE_URL = "http://localhost:3100";
const LOCAL_SUPABASE_PORT = "54321";

function readLocalSupabaseEnvironment() {
  let output: string;

  try {
    output = execFileSync(
      "npx",
      ["supabase", "status", "-o", "env"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    throw new Error(
      "Unable to read the local Supabase environment. " +
        "Run `npx supabase start` before Playwright tests.",
    );
  }

  const values = new Map<string, string>();

  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf("=");

    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  const apiUrl = values.get("API_URL");
  const publishableKey = values.get("PUBLISHABLE_KEY");

  if (!apiUrl || !publishableKey) {
    throw new Error(
      "Local Supabase did not report API_URL and PUBLISHABLE_KEY.",
    );
  }

  const parsedUrl = new URL(apiUrl);

  const isLocalHost =
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "localhost";

  if (!isLocalHost || parsedUrl.port !== LOCAL_SUPABASE_PORT) {
    throw new Error(
      `Refusing to run Playwright against non-local Supabase URL: ${apiUrl}`,
    );
  }

  return {
    apiUrl,
    publishableKey,
  };
}

const localSupabase = readLocalSupabaseEnvironment();

const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string",
  ),
);

export default defineConfig({
  testDir: "./tests/e2e",

  // Start conservatively because future browser tests will share one
  // disposable local Supabase database.
  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,

  reporter: "list",

  use: {
    baseURL: TEST_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "npm run dev -- -H localhost -p 3100",
    url: TEST_BASE_URL,

    // Never silently attach Playwright to somebody's manually-running
    // development server, which may have production environment variables.
    reuseExistingServer: false,

    timeout: 120_000,

    env: {
      ...inheritedEnvironment,

      // Explicitly override the production values from .env.local.
      NEXT_PUBLIC_SUPABASE_URL: localSupabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        localSupabase.publishableKey,

      // Browser tests must never inherit the production Resend credential.
      SUPABASE_RESEND_API_KEY: "",
    },
  },
});
