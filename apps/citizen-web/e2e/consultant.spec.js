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