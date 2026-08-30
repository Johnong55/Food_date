import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home renders the one-hand mobile navigation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Hôm nay mình làm gì?" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ăn gì?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Couple Mode" })).toBeVisible();
});

test("food discovery opens without asking for geolocation", async ({ page, context }) => {
  let permissionRequested = false;
  await context.addInitScript(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(
      navigator.geolocation,
    );
    Object.defineProperty(window, "__geolocationCalled", {
      configurable: true,
      get: () => false,
      set: () => undefined,
    });
    navigator.geolocation.getCurrentPosition = (...args) => {
      Object.defineProperty(window, "__geolocationCalled", {
        configurable: true,
        value: true,
      });
      return original(...args);
    };
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Ăn gì?" }).click();

  await expect(page).toHaveURL(/\/explore\?intent=food$/);
  await expect(page.getByRole("heading", { name: "Tụi mình thèm gì?" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Tiến độ chọn tiêu chí" })).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  permissionRequested = await page.evaluate(
    () => Boolean((window as Window & { __geolocationCalled?: boolean }).__geolocationCalled),
  );
  expect(permissionRequested).toBe(false);
});

for (const route of ["/", "/explore"] as const) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const seriousViolations = results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );

    expect(seriousViolations).toEqual([]);
  });
}
