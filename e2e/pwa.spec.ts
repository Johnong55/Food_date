import { expect, test } from "@playwright/test";

test("manifest and icons satisfy installability basics", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");

  const manifest = (await manifestResponse.json()) as {
    name: string;
    start_url: string;
    scope: string;
    display: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  expect(manifest).toMatchObject({
    name: "Đi Đâu Ăn Gì?",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
      expect.objectContaining({ purpose: "maskable" }),
    ]),
  );

  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test("service worker excludes APIs and Google Places content from cache", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBe(true);
  expect(response.headers()["service-worker-allowed"]).toBe("/");
  expect(response.headers()["cache-control"]).toContain("must-revalidate");

  const source = await response.text();
  expect(source).toContain('url.pathname.startsWith("/api/")');
  expect(source).toContain('url.hostname === "places.googleapis.com"');
  expect(source).toContain("isGooglePlacesContent(url)");
  expect(source).toContain('const OFFLINE_URL = "/offline"');
});

test("service worker registers for the production app", async ({ page }) => {
  await page.goto("/");

  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });

  expect(scope).toBe("http://127.0.0.1:3200/");
});

test("HTML responses include the production security baseline", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=(self)");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
});

test("offline fallback is available", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "Bạn đang offline." })).toBeVisible();
  await expect(page.getByText(/Google Places không được lưu/)).toBeVisible();
});
