import { describe, expect, it, vi } from "vitest";

import type { SearchApiRequest } from "@/features/discovery/search-contract";
import { buildPlaceSearchRequest } from "@/services/discovery/cuisine-mapping";
import { searchRestaurants } from "@/services/discovery/search-restaurants";
import type { PlaceProvider } from "@/services/places/place-provider";

const input: SearchApiRequest = {
  location: {
    id: "district-1",
    label: "Quận 1",
    source: "manual",
    coordinates: { latitude: 10.7756, longitude: 106.7004 },
  },
  radiusMeters: 3_000,
  cuisines: ["japanese"],
  randomCuisine: false,
  budget: { minPerPerson: 200_000, maxPerPerson: 400_000, currency: "VND" },
  minRating: 4.3,
  minReviewCount: 100,
  moods: ["quiet", "romantic"],
  options: ["open_now", "reservable"],
  pageSize: 10,
};

describe("restaurant search service", () => {
  it("maps a single cuisine to a supported Google type", () => {
    const request = buildPlaceSearchRequest(input);

    expect(request.textQuery).toBe("nhà hàng món Nhật");
    expect(request.includedTypes).toEqual(["japanese_restaurant"]);
    expect(request.filters?.openNow).toBe(true);
    expect(request.filters?.priceLevels).toBeUndefined();
  });

  it("does not map absolute VND budget to Google price level", async () => {
    const searchPlaces = vi.fn<PlaceProvider["searchPlaces"]>().mockResolvedValue({
      places: [],
    });
    const provider: PlaceProvider = {
      id: "google_places",
      searchPlaces,
      getPlaceDetails: vi.fn<PlaceProvider["getPlaceDetails"]>(),
      getPlacePhotoReferences:
        vi.fn<PlaceProvider["getPlacePhotoReferences"]>(),
      getPlacePhotos: vi.fn<PlaceProvider["getPlacePhotos"]>(),
    };

    const result = await searchRestaurants(input, provider);
    const request = searchPlaces.mock.calls[0]?.[0];

    expect(request?.filters?.priceLevels).toBeUndefined();
    expect(result.meta.deferredFilters).toContain("budget");
    expect(result.meta.order).toBe("google");
    expect(result.suggestions.map((item) => item.filter)).not.toContain("budget");
  });

  it("uses Nearby Search for Random mode within the maximum boundary", () => {
    const request = buildPlaceSearchRequest({
      ...input,
      radiusMeters: null,
      cuisines: [],
      randomCuisine: true,
    });

    expect(request.textQuery).toBeUndefined();
    expect(request.includedTypes).toEqual(["restaurant"]);
    expect(request.radiusMeters).toBe(50_000);
  });
});
