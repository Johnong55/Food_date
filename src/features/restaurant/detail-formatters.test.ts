import { describe, expect, it } from "vitest";

import {
  buildGoogleMapsDirectionsUrl,
  formatMoney,
  formatVerifiedPriceRange,
  getAvailableFeatureLabels,
} from "@/features/restaurant/detail-formatters";
import type { PlaceDetails } from "@/types/place";

const details = {
  id: "ChIJ-test",
  location: { latitude: 10.77, longitude: 106.7 },
  priceRange: {
    startPrice: { currencyCode: "VND", units: "200000" },
    endPrice: { currencyCode: "VND", units: "400000" },
  },
} as PlaceDetails;

describe("restaurant detail formatters", () => {
  it("formats only provider-returned money and price ranges", () => {
    expect(formatMoney({ currencyCode: "VND", units: "129000" })).toContain("129.000");
    expect(formatVerifiedPriceRange(details)).toContain("200.000");
    expect(formatVerifiedPriceRange({ ...details, priceRange: undefined })).toBeUndefined();
  });

  it("returns only explicitly true place features", () => {
    const labels = getAvailableFeatureLabels({
      dineIn: true,
      delivery: false,
      servesVegetarianFood: true,
      parkingOptions: { paidParkingLot: true },
    });
    expect(labels.map((item) => item.label)).toEqual([
      "Có chỗ ngồi",
      "Có món chay",
      "Có parking",
    ]);
  });

  it("builds a directions URL with a place ID", () => {
    const url = new URL(buildGoogleMapsDirectionsUrl(details));
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("destination_place_id")).toBe("ChIJ-test");
  });
});
