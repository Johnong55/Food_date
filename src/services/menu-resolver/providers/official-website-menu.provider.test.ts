import { describe, expect, it, vi } from "vitest";

import { OfficialWebsiteMenuProvider } from "@/services/menu-resolver/providers/official-website-menu.provider";

describe("OfficialWebsiteMenuProvider", () => {
  it("checks robots first and resolves structured menu from the official origin", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        url: new URL("https://restaurant.example/robots.txt"),
        status: 200,
        contentType: "text/plain",
        body: "User-agent: *\nAllow: /",
      })
      .mockResolvedValueOnce({
        url: new URL("https://restaurant.example/"),
        status: 200,
        contentType: "text/html",
        body: `<script type="application/ld+json">{
          "@context":"https://schema.org","@type":"Menu",
          "hasMenuItem":[
            {"@type":"MenuItem","name":"Phở bò","offers":{"price":"65000","priceCurrency":"VND"}},
            {"@type":"MenuItem","name":"Phở gà","offers":{"price":"60000","priceCurrency":"VND"}}
          ]
        }</script>`,
      });
    const provider = new OfficialWebsiteMenuProvider(
      { fetch },
      () => new Date("2026-08-29T00:00:00.000Z"),
      async () => undefined,
    );

    const result = await provider.resolve({
      restaurantId: "ChIJ-test",
      officialWebsiteUri: "https://restaurant.example/",
    });

    expect(fetch.mock.calls[0]?.[0].toString()).toContain("robots.txt");
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.menu.sourceType).toBe("official_website");
      expect(result.menu.sections[0]?.items).toHaveLength(2);
    }
  });

  it("does not fetch a menu page disallowed by robots", async () => {
    const fetch = vi.fn().mockResolvedValue({
      url: new URL("https://restaurant.example/robots.txt"),
      status: 200,
      contentType: "text/plain",
      body: "User-agent: *\nDisallow: /",
    });
    const provider = new OfficialWebsiteMenuProvider(
      { fetch },
      () => new Date(),
      async () => undefined,
    );

    const result = await provider.resolve({
      restaurantId: "ChIJ-test",
      officialWebsiteUri: "https://restaurant.example/",
    });

    expect(result).toMatchObject({ status: "miss", reason: "robots_disallowed" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
