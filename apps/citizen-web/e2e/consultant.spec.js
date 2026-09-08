import { expect, test } from "@playwright/test";

test("opens the AI Consultant in a new tab", async ({ page, context }) => {
  await page.goto("/");
  const consultantLink = page.getByRole("link", { name: "AI Consultant" });

  await expect(consultantLink).toHaveAttribute("target", "_blank");
  await expect(consultantLink).toHaveAttribute("rel", /noopener/);

  const consultantTabPromise = context.waitForEvent("page");
  await consultantLink.click();
  const consultantTab = await consultantTabPromise;
  await consultantTab.waitForLoadState("domcontentloaded");

  await expect(
    consultantTab.getByRole("heading", { name: "Think it through before you file." }),
  ).toBeVisible();
  await expect(consultantTab.getByRole("button", { name: "Start conversation" })).toBeVisible();
  await expect(consultantTab.getByRole("textbox", { name: "Your message" })).toHaveCount(0);
  await consultantTab.close();
});

test("continues a consultant handoff through login into Speak intake", async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.sessionStorage.setItem("gd-consultant-handoff", JSON.stringify({
      version: 1,
      createdAt: "2026-09-08T00:00:00.000Z",
      expiresAt: "2030-09-08T00:00:00.000Z",
      context: {
        complaint: { description: "The refund has not arrived after cancellation." },
        business: { company_name: "Example Seller" },
        transaction: { amount_disputed: "1499.00" },
      },
    }));
  });
  await page.route("**/api/backend/api/v1/demo/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: "citizen", display_name: "Demo Citizen", contact: "demo.citizen@example.test" }),
    });
  });

  await page.goto("/login?returnTo=%2Freport%3FintakeMode%3Dvoice");
  await page.getByRole("button", { name: "Log in and continue to Speak" }).click();

  await expect(page).toHaveURL(/\/report\?intakeMode=voice$/);
  await expect(page.getByRole("tab", { name: "Speak" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Your consultant notes are ready.")).toBeVisible();
  await expect(page.getByText("The refund has not arrived after cancellation.")).toBeVisible();

  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByText("Your consultant notes are ready.")).toHaveCount(0);
});