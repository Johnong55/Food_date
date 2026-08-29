import { describe, expect, it } from "vitest";

import { applySearchRelaxation } from "@/features/discovery/search-relaxation";
import type { FoodSearchDraft } from "@/features/discovery/types";

const draft: FoodSearchDraft = {
  location: {
    id: "district-1",
    label: "Quận 1",
    source: "manual",
    coordinates: { latitude: 10.77, longitude: 106.7 },
  },
  radiusMeters: 3_000,
  cuisines: ["japanese"],
  randomCuisine: false,
  budget: { minPerPerson: 200_000, maxPerPerson: 400_000, currency: "VND" },
  minRating: 4.5,
  minReviewCount: 500,
  moods: ["quiet"],
  options: ["open_now", "vegetarian_friendly"],
};

describe("applySearchRelaxation", () => {
  it("changes only the explicitly accepted filter", () => {
    const relaxed = applySearchRelaxation(draft, {
      filter: "radiusMeters",
      from: 3_000,
      to: 5_000,
      label: "Nới khoảng cách lên 5 km",
    });

    expect(relaxed.radiusMeters).toBe(5_000);
    expect(relaxed.budget).toEqual(draft.budget);
    expect(relaxed.cuisines).toEqual(draft.cuisines);
    expect(relaxed.options).toEqual(draft.options);
    expect(draft.radiusMeters).toBe(3_000);
  });
});
