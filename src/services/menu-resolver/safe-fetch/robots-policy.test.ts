import { describe, expect, it, vi } from "vitest";

import {
  loadRobotsPolicy,
  RobotsPolicyError,
} from "@/services/menu-resolver/safe-fetch/robots-policy";

describe("menu crawler robots policy", () => {
  it("honors disallow and allow rules for the crawler user agent", async () => {
    const fetcher = {
      fetch: vi.fn().mockResolvedValue({
        url: new URL("https://restaurant.example/robots.txt"),
        status: 200,
        contentType: "text/plain",
        body: [
          "User-agent: *",
          "Disallow: /private/",
          "Allow: /private/menu-public",
        ].join("\n"),
      }),
    };

    const policy = await loadRobotsPolicy(
      fetcher,
      new URL("https://restaurant.example/"),
    );
    expect(policy.isAllowed("https://restaurant.example/private/menu")).toBe(false);
    expect(policy.isAllowed("https://restaurant.example/private/menu-public")).toBe(true);
  });

  it("fails closed when robots cannot be obtained safely", async () => {
    const fetcher = { fetch: vi.fn().mockRejectedValue(new Error("network")) };
    await expect(
      loadRobotsPolicy(fetcher, new URL("https://restaurant.example/")),
    ).rejects.toBeInstanceOf(RobotsPolicyError);
  });
});
