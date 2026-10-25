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

test("published profile edits persist and public destination order updates", async ({
  page,
  browser,
}) => {
  const timestamp = Date.now();

  const email =
    `playwright-edit-${timestamp}@reviewbranch.test`;

  const password = "PlaywrightTest123!";
  const originalName = `Original Business ${timestamp}`;
  const updatedName = `Updated Business ${timestamp}`;
  const slug = `playwright-edit-${timestamp}`;

  const updatedInvitation =
    "Thanks for choosing us. We'd really value your honest feedback.";

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

  // Report failed signup here instead of timing out on the email lookup.
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
    .fill(originalName);

  await page
    .getByLabel("Your review page link")
    .fill(slug);

  await page.getByRole("button", {
    name: "Create Business",
  }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  // Add the first destination.
  await page.getByRole("link", {
    name: /Edit Business Profile/,
  }).click();

  await page.getByRole("button", {
    name: "+ Add Review Destination",
  }).click();

  const firstPlatform = page.getByRole("combobox", {
    name: "Platform name",
    exact: true,
  });

  const firstUrl = page.getByRole("textbox", {
    name: "Review URL",
    exact: true,
  });

  await firstPlatform.fill("Yell");

  await firstUrl.click();
  await firstUrl.pressSequentially(
    "https://www.yell.com/",
    { delay: 5 },
  );

  await expect(firstPlatform).toHaveValue("Yell");

  await expect(firstUrl).toHaveValue(
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

  await page.getByRole("button", {
    name: "Publish Profile",
  }).click();

  await expect(
    page.getByText("Published", { exact: true }),
  ).toBeVisible();

  // Return to the editor and make several persisted changes.
  await page.getByRole("link", {
    name: /Edit Business Profile/,
  }).click();

  await expect(page).toHaveURL(/\/dashboard\/edit$/);

  const businessNameInput =
    page.getByLabel("Business name");

  await businessNameInput.fill(updatedName);

  await expect(businessNameInput).toHaveValue(
    updatedName,
  );

  const invitationInput = page.getByLabel(
    "Your invitation message",
  );

  await invitationInput.click();
  await invitationInput.press("ControlOrMeta+A");

  await invitationInput.pressSequentially(
    updatedInvitation,
    { delay: 2 },
  );

  await expect(invitationInput).toHaveValue(
    updatedInvitation,
  );

  // Add a second destination.
  await page.getByRole("button", {
    name: "+ Add Review Destination",
  }).click();

  const platformInputs = page.getByRole("combobox", {
    name: "Platform name",
    exact: true,
  });

  const urlInputs = page.getByRole("textbox", {
    name: "Review URL",
    exact: true,
  });

  await expect(platformInputs).toHaveCount(2);
  await expect(urlInputs).toHaveCount(2);

  const secondPlatform = platformInputs.nth(1);
  const secondUrl = urlInputs.nth(1);

  await secondPlatform.fill("Checkatrade");

  await secondUrl.click();
  await secondUrl.pressSequentially(
    "https://www.checkatrade.com/",
    { delay: 5 },
  );

  await expect(secondPlatform).toHaveValue(
    "Checkatrade",
  );

  await expect(secondUrl).toHaveValue(
    "https://www.checkatrade.com/",
  );

  // Move Checkatrade above Yell.
  await page.getByRole("button", {
    name: "Move Checkatrade up",
  }).click();

  await expect(platformInputs.nth(0)).toHaveValue(
    "Checkatrade",
  );

  await expect(platformInputs.nth(1)).toHaveValue(
    "Yell",
  );

  await page.getByRole("button", {
    name: "Save Changes",
  }).click();

  await expect(
    page.getByText("Saved to your profile", {
      exact: false,
    }),
  ).toBeVisible();

  // Reload from the database rather than trusting client state.
  await page.reload();

  await expect(page).toHaveURL(/\/dashboard\/edit$/);

  await expect(
    page.getByLabel("Business name"),
  ).toHaveValue(updatedName);

  await expect(
    page.getByLabel("Your invitation message"),
  ).toHaveValue(updatedInvitation);

  const persistedPlatforms =
    page.getByRole("combobox", {
      name: "Platform name",
      exact: true,
    });

  const persistedUrls =
    page.getByRole("textbox", {
      name: "Review URL",
      exact: true,
    });

  await expect(persistedPlatforms).toHaveCount(2);
  await expect(persistedUrls).toHaveCount(2);

  await expect(
    persistedPlatforms.nth(0),
  ).toHaveValue("Checkatrade");

  await expect(
    persistedUrls.nth(0),
  ).toHaveValue(
    "https://www.checkatrade.com/",
  );

  await expect(
    persistedPlatforms.nth(1),
  ).toHaveValue("Yell");

  await expect(
    persistedUrls.nth(1),
  ).toHaveValue("https://www.yell.com/");

  // The published public page must reflect the saved name and order.
  const anonymousContext =
    await browser.newContext();

  const publicPage =
    await anonymousContext.newPage();

  const publicResponse = await publicPage.goto(
    `http://localhost:3100/r/${slug}`,
  );

  expect(publicResponse?.status()).toBe(200);

  await expect(
    publicPage.getByRole("heading", {
      name: updatedName,
    }),
  ).toBeVisible();

  const publicReviewLinks = publicPage.getByRole(
    "link",
    { name: /Review us on/ },
  );

  await expect(publicReviewLinks).toHaveCount(2);

  await expect(
    publicReviewLinks.nth(0),
  ).toContainText("Review us on Checkatrade");

  await expect(
    publicReviewLinks.nth(0),
  ).toHaveAttribute(
    "href",
    "https://www.checkatrade.com/",
  );

  await expect(
    publicReviewLinks.nth(1),
  ).toContainText("Review us on Yell");

  await expect(
    publicReviewLinks.nth(1),
  ).toHaveAttribute(
    "href",
    "https://www.yell.com/",
  );

  await anonymousContext.close();
});
