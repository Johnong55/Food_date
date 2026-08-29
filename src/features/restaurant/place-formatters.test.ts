import { describe, expect, it } from "vitest";

import {
  buildGoogleMapsUrl,
  formatDistance,
  formatPlaceType,
  formatReviewCount,
  safeExternalUrl,
} from "@/features/restaurant/place-formatters";
import type { PlaceSummary } from "@/types/place";

describe("restaurant place formatters", () => {
  it("formats compact review counts and distances for mobile cards", () => {
    expect(formatReviewCount(1_200)).toBe("1,2K đánh giá");
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(1_340)).toBe("1,3 km");
    expect(formatPlaceType("japanese_restaurant")).toBe("Món Nhật");
  });

  it("builds a Google Maps deep link using the immutable place ID", () => {
    const place = {
      id: "ChIJ-test",
      formattedAddress: "Quận 1, TP.HCM",
      location: { latitude: 10.77, longitude: 106.7 },
    } as PlaceSummary;
    const url = new URL(buildGoogleMapsUrl(place));

    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("query_place_id")).toBe("ChIJ-test");
  });

  it("blocks non-http external attribution links", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("https://maps.google.com/example")).toBe(
      "https://maps.google.com/example",
    );
  });
});
