import { expect, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

async function waitForConfirmationLink(email: string) {
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
        .find((link) => link.includes("/confirm-email?"));

      if (confirmationLink) {
        return confirmationLink;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Confirmation email was not found in Mailpit for ${email}.`,
  );
}

test("signup confirmation uses the safe email flow", async ({
  page,
}) => {
  const email =
    `playwright-signup-${Date.now()}@reviewbranch.test`;

  const password = "PlaywrightTest123!";

  await page.goto("/login");

  await page.getByRole("button", {
    name: "Create an Account",
  }).click();

  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", {
    name: "Create Account",
  }).click();

  await expect(page).toHaveURL(/\/login$/);

  await expect(
    page.locator('div[role="status"]').filter({
      hasText: "Account created!",
    }),
  ).toContainText(
    "Account created! Please check your email",
  );

  const confirmationLink =
    await waitForConfirmationLink(email);

  const confirmationUrl = new URL(confirmationLink);

  expect(confirmationUrl.hostname).toBe("localhost");
  expect(confirmationUrl.port).toBe("3100");
  expect(confirmationUrl.pathname).toBe("/confirm-email");
  expect(confirmationUrl.searchParams.get("type")).toBe("email");
  expect(
    confirmationUrl.searchParams.get("token_hash"),
  ).toBeTruthy();

  // Opening the email link must not consume the one-time token.
  await page.goto(confirmationLink);

  await expect(
    page.getByRole("heading", {
      name: "Confirm your email address",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Confirm email address",
    }),
  ).toBeVisible();

  // Prove the GET landing page did not confirm the account.
  const beforeConfirmation = await page.context().newPage();

  await beforeConfirmation.goto("/login");

  await beforeConfirmation
    .getByLabel("Email address")
    .fill(email);

  await beforeConfirmation
    .getByLabel("Password")
    .fill(password);

  await beforeConfirmation
    .getByRole("button", { name: "Sign In" })
    .click();

  await expect(beforeConfirmation).toHaveURL(/\/login$/);

  await expect(
    beforeConfirmation.getByRole("alert"),
  ).toBeVisible();

  await beforeConfirmation.close();

  // Only the deliberate POST should consume the token.
  await page.getByRole("button", {
    name: "Confirm email address",
  }).click();

  await expect(page).toHaveURL(
    /\/dashboard(?:\/create)?$/,
  );

  await expect(page).not.toHaveURL(/\/login/);
});
