import { describe, expect, it } from "vitest";

import {
  estimateMenuForTwo,
  formatMenuFallbackPrice,
  formatMenuItemPrice,
  formatMenuSource,
} from "@/features/menu/menu-formatters";
import type { ResolvedMenu } from "@/types/menu";

function createMenu(overrides: Partial<ResolvedMenu> = {}): ResolvedMenu {
  return {
    restaurantId: "place-1",
    sourceType: "merchant",
    verified: true,
    lastUpdated: "2026-08-29T00:00:00.000Z",
    confidence: "high",
    sections: [
      {
        id: "main",
        name: "Món chính",
        sortOrder: 0,
        items: Array.from({ length: 10 }, (_, index) => ({
          id: `item-${index}`,
          name: `Món ${index}`,
          price: 50_000 + index * 10_000,
          currency: "VND",
          sortOrder: index,
        })),
      },
    ],
    ...overrides,
  };
}

describe("menu formatters", () => {
  it("labels provenance without calling it Google menu", () => {
    expect(formatMenuSource(createMenu())).toBe("Nhà hàng xác minh");
    expect(formatMenuSource(createMenu({ sourceType: "official_website" }))).toBe(
      "Website chính thức",
    );
  });

  it("formats VND menu prices", () => {
    expect(formatMenuItemPrice(129_000)).toContain("129.000");
    expect(formatMenuItemPrice()).toBe("Liên hệ quán");
  });

  it("uses Google price range only as fallback context", () => {
    expect(
      formatMenuFallbackPrice({
        displayName: "Quán A",
        priceRange: {
          startPrice: { currencyCode: "VND", units: "100000" },
          endPrice: { currencyCode: "VND", units: "250000" },
        },
      }),
    ).toContain("100.000");
  });

  it("estimates for two only from a sufficiently complete verified menu", () => {
    expect(estimateMenuForTwo(createMenu())).toEqual({
      minimum: 140_000,
      maximum: 240_000,
      currency: "VND",
    });
    expect(estimateMenuForTwo(createMenu({ verified: false }))).toBeUndefined();
  });
});
