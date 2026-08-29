import { describe, expect, it, vi } from "vitest";

import type { MenuProvider } from "@/services/menu-resolver/menu-provider";
import { MenuResolver } from "@/services/menu-resolver/menu-resolver";

describe("MenuResolver", () => {
  it("uses providers in priority order and stops on the first resolved menu", async () => {
    const database: MenuProvider = {
      id: "database",
      resolve: vi.fn().mockResolvedValue({ status: "miss", reason: "not_found" }),
    };
    const official: MenuProvider = {
      id: "official_website",
      resolve: vi.fn().mockResolvedValue({
        status: "resolved",
        menu: {
          restaurantId: "ChIJ-test",
          sourceType: "official_website",
          verified: false,
          lastUpdated: "2026-08-29T00:00:00.000Z",
          confidence: "medium",
          sections: [],
        },
      }),
    };
    const later: MenuProvider = {
      id: "later",
      resolve: vi.fn(),
    };

    const result = await new MenuResolver([database, official, later]).resolve({
      restaurantId: "ChIJ-test",
      officialWebsiteUri: "https://restaurant.example/menu",
    });

    expect(result.status).toBe("resolved");
    expect(result.attempts.map((attempt) => attempt.provider)).toEqual([
      "database",
      "official_website",
    ]);
    expect(later.resolve).not.toHaveBeenCalled();
  });

  it("contains provider failures and returns an explicit unavailable result", async () => {
    const failing: MenuProvider = {
      id: "failing",
      resolve: vi.fn().mockRejectedValue(new Error("secret database error")),
    };

    const result = await new MenuResolver([failing]).resolve({
      restaurantId: "ChIJ-test",
    });

    expect(result).toEqual({
      status: "unavailable",
      attempts: [
        {
          provider: "failing",
          status: "failed",
          reason: "unexpected_provider_error",
        },
      ],
    });
  });
});
