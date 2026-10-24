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

test("business can be created, configured, published and viewed publicly", async ({
  page,
  browser,
}) => {
  const timestamp = Date.now();

  const email =
    `playwright-business-${timestamp}@reviewbranch.test`;

  const password = "PlaywrightTest123!";
  const businessName = `Playwright Business ${timestamp}`;
  const slug = `playwright-business-${timestamp}`;

  // Create and confirm a new local account.
  await page.goto("/login");

  await page.getByRole("button", {
    name: "Create an Account",
  }).click();

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", {
    name: "Create Account",
  }).click();

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

  // Create the business through the real onboarding UI.
  await page.goto("/dashboard/create");

  await expect(
    page.getByRole("heading", {
      name: "Set up your business",
    }),
  ).toBeVisible();

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

  await expect(
    page.getByRole("heading", {
      name: "Your Review Dashboard",
    }),
  ).toBeVisible();

  await expect(
    page.getByText(businessName, { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText("Draft", { exact: true }),
  ).toBeVisible();

  const publishButton = page.getByRole("button", {
    name: "Publish Profile",
  });

  // A business without a destination must not be publishable.
  await expect(publishButton).toBeDisabled();

  // The unpublished public URL must not be visible anonymously.
  const anonymousBeforePublish =
    await browser.newContext();

  const privatePage =
    await anonymousBeforePublish.newPage();

  const privateResponse = await privatePage.goto(
    `${APP_ORIGIN}/r/${slug}`,
  );

  expect(privateResponse?.status()).toBe(404);

  await anonymousBeforePublish.close();

  // Add a valid review destination.
  await page.getByRole("link", {
    name: /Edit Business Profile/,
  }).click();

  await expect(page).toHaveURL(/\/dashboard\/edit$/);

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
  await expect(platformInput).toHaveValue("Yell");

  await reviewUrlInput.click();

  await expect(reviewUrlInput).toBeFocused();

  await reviewUrlInput.pressSequentially(
    "https://www.yell.com/",
    { delay: 5 },
  );

  await expect(reviewUrlInput).toHaveValue(
    "https://www.yell.com/",
  );

  // Guard against either field accidentally receiving the other's value.
  await expect(platformInput).toHaveValue("Yell");

  await page.getByRole("button", {
    name: "Save Changes",
  }).click();

  await expect(
    page.locator('p[role="status"]').filter({
      hasText: "Saved to your profile",
    }),
  ).toBeVisible();

  await page.getByRole("link", {
    name: "← Back to dashboard",
  }).first().click();

  await expect(page).toHaveURL(/\/dashboard$/);

  // The persisted destination now makes publication available.
  await expect(
    page.getByRole("button", {
      name: "Publish Profile",
    }),
  ).toBeEnabled();

  await page.getByRole("button", {
    name: "Publish Profile",
  }).click();

  await expect(
    page.getByRole("status").filter({
      hasText: "Your review page is now published.",
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Published", { exact: true }),
  ).toBeVisible();

  const publicUrlInput =
    page.getByLabel("Public review URL");

  await expect(publicUrlInput).toHaveValue(
    new RegExp(`/r/${slug}$`),
  );

  const publicUrl = await publicUrlInput.inputValue();

  expect(new URL(publicUrl).pathname).toBe(`/r/${slug}`);

  // A fresh signed-out browser context must now see the page.
  const anonymousAfterPublish =
    await browser.newContext();

  const publicPage =
    await anonymousAfterPublish.newPage();

  const publicResponse =
    await publicPage.goto(publicUrl);

  expect(publicResponse?.status()).toBe(200);

  await expect(
    publicPage.getByRole("heading", {
      name: businessName,
    }),
  ).toBeVisible();

  const reviewLink = publicPage.getByRole("link", {
    name: "Review us on Yell",
  });

  await expect(reviewLink).toBeVisible();

  await expect(reviewLink).toHaveAttribute(
    "href",
    "https://www.yell.com/",
  );

  // A different signed-in user must also be able to view
  // another owner's published review profile.
  const signedInVisitorContext = await browser.newContext();
  const signedInVisitorPage = await signedInVisitorContext.newPage();

  const visitorEmail = `playwright-visitor-${timestamp}@reviewbranch.test`;

  await signedInVisitorPage.goto(`${APP_ORIGIN}/login`);

  await signedInVisitorPage
    .getByRole("button", {
      name: "Create an Account",
    })
    .click();

  await signedInVisitorPage.getByLabel("Email address").fill(visitorEmail);

  await signedInVisitorPage.getByLabel("Password").fill(password);

  await signedInVisitorPage
    .getByRole("button", {
      name: "Create Account",
    })
    .click();

  await expect(signedInVisitorPage).toHaveURL(/\/login$/);

  const visitorConfirmationLink = await waitForConfirmationLink(visitorEmail);

  await signedInVisitorPage.goto(visitorConfirmationLink);

  await signedInVisitorPage
    .getByRole("button", {
      name: "Confirm email address",
    })
    .click();

  await expect(signedInVisitorPage).toHaveURL(/\/dashboard(?:\/create)?$/);

  // The visitor is authenticated but does not own the business.
  const signedInPublicResponse = await signedInVisitorPage.goto(publicUrl);

  expect(signedInPublicResponse?.status()).toBe(200);

  await expect(
    signedInVisitorPage.getByRole("heading", {
      name: businessName,
    }),
  ).toBeVisible();

  await expect(
    signedInVisitorPage.getByRole("link", {
      name: "Review us on Yell",
    }),
  ).toHaveAttribute("href", "https://www.yell.com/");

  await signedInVisitorContext.close();

  await anonymousAfterPublish.close();
});
