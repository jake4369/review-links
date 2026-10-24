import { expect, test } from "@playwright/test";

test("public site and protected dashboard routes load locally", async ({
  page,
}) => {
  const homeResponse = await page.goto("/");

  expect(homeResponse?.ok()).toBe(true);
  await expect(page.locator("body")).toContainText("ReviewBranch");

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/forgot-password");

  await expect(
    page.getByRole("link", { name: "Resend confirmation email" }),
  ).toHaveAttribute("href", "/resend-confirmation");
});

test("browser authentication requests use local Supabase only", async ({
  page,
}) => {
  await page.goto("/login");

  const authRequestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());

    return (
      request.method() === "POST" &&
      url.pathname === "/auth/v1/token"
    );
  });

  await page.getByLabel("Email address").fill(
    "playwright-nonexistent@reviewbranch.test",
  );

  await page.getByLabel("Password").fill(
    "NotARealPassword123!",
  );

  // Turnstile verification completes asynchronously. Confirm the form is
  // ready before attempting sign-in, as in the signup regression tests.
  const signInButton = page.getByRole("button", { name: "Sign In" });
  await expect(signInButton).toBeEnabled({ timeout: 15_000 });
  await signInButton.click();

  const authRequest = await authRequestPromise;
  const authUrl = new URL(authRequest.url());

  expect(authUrl.hostname).toBe("127.0.0.1");
  expect(authUrl.port).toBe("54321");

  await expect(page).toHaveURL(/\/login$/);
});
