import { expect, test } from "@playwright/test";

test("completes citizen report, evidence, and government intelligence journey", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const citizenLogin = page.waitForResponse(
    (response) => response.url().includes("/api/backend/api/v1/demo/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Citizen demo" }).click();
  await expect((await citizenLogin).status()).toBe(200);
  await expect(page.locator(".demo-session")).toContainText("Demo Citizen");

  await page.getByLabel("What happened?").fill(
    "I cancelled my QuickKart order 12 days ago. The refund of INR 3499 was confirmed but I still have not received it.",
  );
  await page.getByLabel("Company or seller").fill("QuickKart");
  await page.getByLabel("Amount involved").fill("3499");
  await page.getByRole("button", { name: "Create my docket" }).click();
  await expect(page.getByRole("heading", { name: "Your voice now has a docket." })).toBeVisible();

  const similarReports = page.getByRole("link", { name: /See .* similar reports/ });
  await expect(similarReports).toBeVisible({ timeout: 30_000 });
  await similarReports.click();
  await expect(page).toHaveURL(/\/issues\/REFUND-DELAY-QUICKKART$/);

  const corroborateButton = page.getByRole("button", { name: "I experienced this too" });
  await corroborateButton.scrollIntoViewIfNeeded();
  await corroborateButton.click();
  await expect(page.getByLabel("What proof do you have?")).toBeVisible();
  await page.locator("#evidenceUpload").setInputFiles({
    name: "synthetic-demo-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from("synthetic demo proof"),
  });
  await page.getByRole("button", { name: "Submit demo evidence" }).click();
  await expect(page.getByText("Demo evidence submitted")).toBeVisible();

  const adminPage = await page.context().newPage();
  await adminPage.goto(process.env.ADMIN_BASE_URL || "http://127.0.0.1:3001");
  await adminPage.getByRole("button", { name: "Official demo" }).click();
  await expect(adminPage.getByText("Demo Government Official")).toBeVisible();
  const refundRow = adminPage.getByRole("row", { name: /01 Refund delays on QuickKart/ });
  await expect(refundRow).toBeVisible();
  await refundRow.click();
  await expect(adminPage.getByText("Advisory routing")).toBeVisible();
  await expect(adminPage.getByText("Maharashtra")).toBeVisible();
});