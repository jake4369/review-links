import { expect, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";
const APP_ORIGIN = "http://localhost:3100";

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

test("removing the final destination unpublishes only when saved", async ({
  page,
  browser,
}) => {
  const timestamp = Date.now();

  const email =
    `playwright-unpublish-${timestamp}@reviewbranch.test`;

  const password = "PlaywrightTest123!";
  const businessName = `Unpublish Business ${timestamp}`;
  const slug = `playwright-unpublish-${timestamp}`;

  // Create and confirm a local account.
  await page.goto("/login");

  await page.getByRole("button", {
    name: "Create an Account",
  }).click();

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);

  const createAccountButton = page.getByRole("button", {
    name: "Create Account",
  });

  // Wait for Turnstile verification before submitting the signup form.
  await expect(createAccountButton).toBeEnabled({ timeout: 15_000 });
  await createAccountButton.click();

  // Fail at signup rather than waiting for an email that was never sent.
  await expect(
    page.locator('div[role="status"]').filter({
      hasText: "Account created!",
    }),
  ).toContainText("Account created! Please check your email");

  await expect(page).toHaveURL(/\/login$/);

  const confirmationLink =
    await waitForConfirmationLink(email);

  await page.goto(confirmationLink);

  await page.getByRole("button", {
    name: "Confirm email address",
  }).click();

  await expect(page).toHaveURL(
    /\/dashboard(?:\/create)?$/,
  );

  // Create the business.
  await page.goto("/dashboard/create");

  await page
    .getByLabel("Business name")
    .fill(businessName);

  await page
    .getByLabel("Your review page link")
    .fill(slug);

  await page.getByRole("button", {
    name: "Create Business",
  }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  // Add exactly one review destination.
  await page.getByRole("link", {
    name: /Edit Business Profile/,
  }).click();

  await page.getByRole("button", {
    name: "+ Add Review Destination",
  }).click();

  const platformInput = page.getByRole("combobox", {
    name: "Platform name",
    exact: true,
  });

  const reviewUrlInput = page.getByRole("textbox", {
    name: "Review URL",
    exact: true,
  });

  await platformInput.fill("Yell");

  await reviewUrlInput.click();

  await reviewUrlInput.pressSequentially(
    "https://www.yell.com/",
    { delay: 5 },
  );

  await expect(platformInput).toHaveValue("Yell");

  await expect(reviewUrlInput).toHaveValue(
    "https://www.yell.com/",
  );

  await page.getByRole("button", {
    name: "Save Changes",
  }).click();

  await expect(
    page.getByText("Saved to your profile", {
      exact: false,
    }),
  ).toBeVisible();

  await page.getByRole("link", {
    name: "← Back to dashboard",
  }).first().click();

  await expect(page).toHaveURL(/\/dashboard$/);

  // Publish the profile.
  await page.getByRole("button", {
    name: "Publish Profile",
  }).click();

  await expect(
    page.getByText("Published", { exact: true }),
  ).toBeVisible();

  // Prove the public page is currently live.
  const anonymousContext =
    await browser.newContext();

  const publicPage =
    await anonymousContext.newPage();

  const publishedResponse = await publicPage.goto(
    `${APP_ORIGIN}/r/${slug}`,
  );

  expect(publishedResponse?.status()).toBe(200);

  await expect(
    publicPage.getByRole("heading", {
      name: businessName,
    }),
  ).toBeVisible();

  await expect(
    publicPage.getByRole("link", {
      name: "Review us on Yell",
    }),
  ).toBeVisible();

  // Begin removing the final destination.
  await page.getByRole("link", {
    name: /Edit Business Profile/,
  }).click();

  await expect(page).toHaveURL(/\/dashboard\/edit$/);

  await page.getByRole("button", {
    name: "Remove destination 1: Yell",
  }).click();

  const removalConfirmation = page.getByRole("group", {
    name: "Confirm removal of Yell",
  });

  await expect(removalConfirmation).toBeVisible();

  await expect(removalConfirmation).toContainText(
    "This is your final review destination.",
  );

  await expect(removalConfirmation).toContainText(
    "unpublished",
  );

  await removalConfirmation.getByRole("button", {
    name: "Remove & unpublish on save",
  }).click();

  await expect(
    page.getByText(
      "No review destinations yet. Add one to get started.",
    ),
  ).toBeVisible();

  await expect(
    page.getByRole("status").filter({
      hasText:
        "Saving with no review destinations will also UNPUBLISH your review page.",
    }),
  ).toBeVisible();

  // Removal is still only editor state. Nothing has changed publicly yet.
  const beforeSaveResponse = await publicPage.goto(
    `${APP_ORIGIN}/r/${slug}`,
  );

  expect(beforeSaveResponse?.status()).toBe(200);

  await expect(
    publicPage.getByRole("link", {
      name: "Review us on Yell",
    }),
  ).toBeVisible();

  // Persist the destructive change.
  await page.getByRole("button", {
    name: "Save Changes",
  }).click();

  await expect(
    page.getByRole("status").filter({
      hasText:
        "Profile saved. 1 review destination removed. Your review page is now unpublished.",
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Saved to your profile", {
      exact: false,
    }),
  ).toBeVisible();

  await page.getByRole("link", {
    name: "← Back to dashboard",
  }).first().click();

  await expect(page).toHaveURL(/\/dashboard$/);

  // The business remains, but the public profile is now a draft.
  await expect(
    page.getByText("Draft", { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Publish Profile",
    }),
  ).toBeDisabled();

  await expect(
    page.getByText(
      "Add at least one review destination in your profile editor before publishing.",
    ),
  ).toBeVisible();

  // A fresh public request must now receive 404.
  const unpublishedResponse = await publicPage.goto(
    `${APP_ORIGIN}/r/${slug}`,
  );

  expect(unpublishedResponse?.status()).toBe(404);

  await anonymousContext.close();
});
