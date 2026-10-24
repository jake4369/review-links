import { expect, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

async function waitForEmailLink(
  email: string,
  path: "/confirm-email" | "/recover-password",
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

      const matchingLink = links
        .map((link) => link.replace(/[).,]+$/, ""))
        .find((link) => link.includes(`${path}?`));

      if (matchingLink) {
        return matchingLink;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Email link ${path} was not found in Mailpit for ${email}.`,
  );
}

test("password recovery safely replaces the old password", async ({
  page,
}) => {
  const email =
    `playwright-recovery-${Date.now()}@reviewbranch.test`;

  const oldPassword = "PlaywrightOld123!";
  const newPassword = "PlaywrightNew456!";

  // Create and confirm a real local account first.
  await page.goto("/login");

  await page.getByRole("button", {
    name: "Create an Account",
  }).click();

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(oldPassword);

  const createAccountButton = page.getByRole("button", {
    name: "Create Account",
  });

  // Wait for Turnstile verification to finish before creating the account.
  await expect(createAccountButton).toBeEnabled({ timeout: 15_000 });
  await createAccountButton.click();

  // Detect a failed signup here instead of timing out on the Mailpit lookup.
  await expect(
    page.locator('div[role="status"]').filter({
      hasText: "Account created!",
    }),
  ).toContainText("Account created! Please check your email");

  await expect(page).toHaveURL(/\/login$/);

  const confirmationLink = await waitForEmailLink(
    email,
    "/confirm-email",
  );

  await page.goto(confirmationLink);

  await page.getByRole("button", {
    name: "Confirm email address",
  }).click();

  await expect(page).toHaveURL(
    /\/dashboard(?:\/create)?$/,
  );

  // Begin recovery as a signed-out visitor.
  await page.context().clearCookies();
  await page.goto("/forgot-password");

  await expect(
    page.getByRole("heading", {
      name: "Reset your password",
    }),
  ).toBeVisible();

  await page.getByLabel("Email address").fill(email);

  await page.getByRole("button", {
    name: "Send reset link",
  }).click();

  await expect(
    page.getByRole("heading", {
      name: "Check your email",
    }),
  ).toBeVisible();

  await expect(page.getByRole("status")).toContainText(
    "we've sent password reset instructions",
  );

  const recoveryLink = await waitForEmailLink(
    email,
    "/recover-password",
  );

  const recoveryUrl = new URL(recoveryLink);

  expect(recoveryUrl.hostname).toBe("localhost");
  expect(recoveryUrl.port).toBe("3100");
  expect(recoveryUrl.pathname).toBe("/recover-password");
  expect(recoveryUrl.searchParams.get("type")).toBe("recovery");
  expect(
    recoveryUrl.searchParams.get("token_hash"),
  ).toBeTruthy();

  // Opening the emailed GET link must not create a recovery session.
  await page.goto(recoveryLink);

  await expect(
    page.getByRole("heading", {
      name: "Reset your password",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Continue to reset password",
    }),
  ).toBeVisible();

  const beforeVerification = await page.context().newPage();

  await beforeVerification.goto("/reset-password");

  await expect(beforeVerification).toHaveURL(
    /\/forgot-password\?recovery=failed$/,
  );

  await beforeVerification.close();

  // Only the deliberate POST may verify the recovery token.
  await page.getByRole("button", {
    name: "Continue to reset password",
  }).click();

  await expect(page).toHaveURL(/\/reset-password$/);

  await expect(
    page.getByRole("heading", {
      name: "Choose a new password",
    }),
  ).toBeVisible();

  await page
    .getByLabel("New password", { exact: true })
    .fill(newPassword);

  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill(newPassword);

  await page.getByRole("button", {
    name: "Update password",
  }).click();

  // Successful reset ends the temporary recovery session.
  await expect(page).toHaveURL(
    /\/login\?password=reset$/,
  );

  // The previous password must no longer authenticate.
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(oldPassword);

  await page.getByRole("button", {
    name: "Sign In",
  }).click();

  await expect(page).toHaveURL(
    /\/login(?:\?password=reset)?$/,
  );

  await expect(page.getByRole("alert")).toBeVisible();

  // The replacement password must authenticate normally.
  await page.getByLabel("Password").fill(newPassword);

  await page.getByRole("button", {
    name: "Sign In",
  }).click();

  await expect(page).toHaveURL(
    /\/dashboard(?:\/create)?$/,
  );
});
