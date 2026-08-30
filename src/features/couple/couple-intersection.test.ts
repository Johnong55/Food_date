import { describe, expect, it } from "vitest";

import { intersectCouplePreferences } from "@/features/couple/couple-intersection";
import type { CouplePreference } from "@/types/couple";

const base: CouplePreference = {
  cuisines: ["japanese", "bbq"],
  budgetMaxPerPerson: 400_000,
  radiusMeters: 5_000,
  minRating: 4,
  minReviewCount: 50,
  moods: ["quiet", "romantic"],
  options: ["open_now", "outdoor_seating"],
  location: {
    id: "district-1",
    label: "Quận 1",
    source: "manual",
    coordinates: { latitude: 10.77, longitude: 106.7 },
  },
};

describe("intersectCouplePreferences", () => {
  it("uses shared soft preferences and the stricter hard limits", () => {
    const result = intersectCouplePreferences(base, {
      ...base,
      cuisines: ["korean", "japanese"],
      budgetMaxPerPerson: 300_000,
      radiusMeters: 3_000,
      minRating: 4.3,
      minReviewCount: 100,
      moods: ["quiet", "lively"],
      options: ["vegetarian_friendly", "outdoor_seating"],
    });

    expect(result).toMatchObject({
      cuisines: ["japanese"],
      hasCuisineMatch: true,
      budgetMaxPerPerson: 300_000,
      radiusMeters: 3_000,
      minRating: 4.3,
      minReviewCount: 100,
      moods: ["quiet"],
      requiredOptions: ["open_now", "vegetarian_friendly"],
      sharedOptions: ["outdoor_seating"],
      location: { strategy: "same_area" },
    });
  });

  it("does not invent a cuisine match and uses a midpoint for different areas", () => {
    const result = intersectCouplePreferences(base, {
      ...base,
      cuisines: ["korean"],
      location: {
        id: "district-3",
        label: "Quận 3",
        source: "manual",
        coordinates: { latitude: 10.79, longitude: 106.68 },
      },
    });

    expect(result.hasCuisineMatch).toBe(false);
    expect(result.cuisines).toEqual([]);
    expect(result.location).toMatchObject({
      strategy: "midpoint",
      coordinates: { latitude: 10.78, longitude: 106.69 },
    });
  });
});
