import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RestaurantCard } from "@/features/restaurant/components/restaurant-card";
import type { PlaceSummary } from "@/types/place";

const place: PlaceSummary = {
  provider: "google_places",
  id: "ChIJ-test",
  displayName: { text: "Sushi Test", languageCode: "vi" },
  formattedAddress: "Quận 1, TP.HCM",
  location: { latitude: 10.77, longitude: 106.7 },
  primaryType: "japanese_restaurant",
  types: ["japanese_restaurant", "restaurant"],
  rating: 4.6,
  userRatingCount: 1_200,
  priceLevel: "PRICE_LEVEL_MODERATE",
  photos: [],
  currentOpeningHours: { openNow: true, weekdayDescriptions: [] },
  distanceMeters: 1_300,
  googleResultPosition: 0,
};

describe("RestaurantCard", () => {
  it("labels Google content and exposes real decision/map actions", () => {
    const markup = renderToStaticMarkup(
      <RestaurantCard place={place} selected={false} onSelect={() => undefined} />,
    );

    expect(markup).toContain("Sushi Test");
    expect(markup).toContain("Google rating");
    expect(markup).toContain("Google Maps");
    expect(markup).toContain("Xem chi tiết");
    expect(markup).toContain("Xem bản đồ");
    expect(markup).toContain("Chọn quán");
    expect(markup).not.toContain("Độ phù hợp");
  });
});
