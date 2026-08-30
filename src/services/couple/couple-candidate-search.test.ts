import { describe, expect, it } from "vitest";

import { buildCoupleCandidateSearch } from "@/services/couple/couple-candidate-search";
import type { CoupleIntersection } from "@/types/couple";

const intersection: CoupleIntersection = {
  cuisines: ["japanese"],
  hasCuisineMatch: true,
  budgetMaxPerPerson: 300_000,
  radiusMeters: 3_000,
  minRating: 4.3,
  minReviewCount: 100,
  moods: ["quiet"],
  requiredOptions: ["open_now", "vegetarian_friendly"],
  sharedOptions: ["outdoor_seating"],
  location: {
    id: "district-1",
    label: "Quận 1",
    source: "manual",
    strategy: "same_area",
    coordinates: { latitude: 10.7756, longitude: 106.7004 },
  },
};

describe("buildCoupleCandidateSearch", () => {
  it("keeps shared Google order inputs and all hard constraints", () => {
    expect(buildCoupleCandidateSearch(intersection)).toMatchObject({
      cuisines: ["japanese"],
      randomCuisine: false,
      radiusMeters: 3_000,
      budget: { maxPerPerson: 300_000, currency: "VND" },
      minRating: 4.3,
      minReviewCount: 100,
      options: ["open_now", "vegetarian_friendly", "outdoor_seating"],
      pageSize: 10,
    });
  });
});
