import { expect, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

async function waitForConfirmationLink(
  email: string,
  excludedLink?: string,
) {
  const params = new URLSearchParams({
    query: `to:"${email}"`,
  });

  const messageUrl =
    `${MAILPIT_URL}/view/latest.txt?${params.toString()}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(messageUrl);

    if (response.ok) {
      const body = await response.text();

      const links = body.match(
        /https?:\/\/[^\s<>\]]+/g,
      ) ?? [];

      const confirmationLink = links
        .map((link) => link.replace(/[).,]+$/, ""))
        .find(
          (link) =>
            link.includes("/confirm-email?") &&
            link !== excludedLink,
        );

      if (confirmationLink) {
        return confirmationLink;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `A new confirmation email was not found in Mailpit for ${email}.`,
  );
}

test("resending confirmation invalidates the older link", async ({
  page,
}) => {
  const email =
    `playwright-resend-${Date.now()}@reviewbranch.test`;

  const password = "PlaywrightTest123!";

  // Create an unconfirmed account and capture Email A.
  await page.goto("/login");

  await page.getByRole("button", {
    name: "Create an Account",
  }).click();

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);

  const createAccountButton = page.getByRole("button", {
    name: "Create Account",
  });

  // Wait for Turnstile readiness before creating the initial account.
  await expect(createAccountButton).toBeEnabled({ timeout: 15_000 });
  await createAccountButton.click();

  // Report signup failures here instead of timing out on Mailpit.
  await expect(
    page.locator('div[role="status"]').filter({
      hasText: "Account created!",
    }),
  ).toContainText(
    "Account created! Please check your email",
  );

  await expect(page).toHaveURL(/\/login$/);

  const firstLink =
    await waitForConfirmationLink(email);

  const firstUrl = new URL(firstLink);

  expect(firstUrl.hostname).toBe("localhost");
  expect(firstUrl.port).toBe("3100");
  expect(firstUrl.pathname).toBe("/confirm-email");
  expect(firstUrl.searchParams.get("type")).toBe("email");

  const firstToken =
    firstUrl.searchParams.get("token_hash");

  expect(firstToken).toBeTruthy();

  // Local Auth deliberately uses a 1-second resend interval.
  await page.waitForTimeout(1_100);

  // Request Email B through the real resend UI.
  await page.goto("/resend-confirmation");

  await expect(
    page.getByRole("heading", {
      name: "Resend confirmation email",
    }),
  ).toBeVisible();

  await page.getByLabel("Email address").fill(email);

  await page.getByRole("button", {
    name: "Resend confirmation email",
  }).click();

  await expect(
    page.getByRole("heading", {
      name: "Check your email",
    }),
  ).toBeVisible();

  await expect(page.getByRole("status")).toContainText(
    "we've sent a new confirmation email",
  );

  const secondLink =
    await waitForConfirmationLink(email, firstLink);

  const secondUrl = new URL(secondLink);

  expect(secondUrl.hostname).toBe("localhost");
  expect(secondUrl.port).toBe("3100");
  expect(secondUrl.pathname).toBe("/confirm-email");
  expect(secondUrl.searchParams.get("type")).toBe("email");

  const secondToken =
    secondUrl.searchParams.get("token_hash");

  expect(secondToken).toBeTruthy();
  expect(secondToken).not.toBe(firstToken);

  // Email A must no longer be usable after the resend.
  await page.goto(firstLink);

  await page.getByRole("button", {
    name: "Confirm email address",
  }).click();

  await expect(page).toHaveURL(
    /\/login\?confirmation=failed$/,
  );

  // Email B must remain valid.
  await page.goto(secondLink);

  await page.getByRole("button", {
    name: "Confirm email address",
  }).click();

  await expect(page).toHaveURL(
    /\/dashboard(?:\/create)?$/,
  );

  await expect(page).not.toHaveURL(/\/login/);
});
