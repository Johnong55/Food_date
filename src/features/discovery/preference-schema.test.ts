import { describe, expect, it } from "vitest";

import {
  foodPreferenceSchema,
  toFoodSearchDraft,
} from "@/features/discovery/preference-schema";
import type { FoodPreferenceState } from "@/features/discovery/types";

const validState: FoodPreferenceState = {
  cuisines: ["japanese", "vietnamese"],
  moods: ["quiet", "romantic"],
  budgetId: "200_400",
  distanceId: "3km",
  minRating: 4.3,
  minReviewCount: 100,
  options: ["open_now", "reservable"],
  location: {
    id: "district-1",
    label: "Quận 1",
    source: "manual",
    coordinates: { latitude: 10.7756, longitude: 106.7004 },
  },
};

describe("foodPreferenceSchema", () => {
  it("normalizes valid UI state to the future search contract", () => {
    const draft = toFoodSearchDraft(validState);

    expect(draft.radiusMeters).toBe(3000);
    expect(draft.budget).toEqual({
      minPerPerson: 200_000,
      maxPerPerson: 400_000,
      currency: "VND",
    });
    expect(draft.cuisines).toEqual(["japanese", "vietnamese"]);
    expect(draft.randomCuisine).toBe(false);
  });

  it("rejects Random mixed with a named cuisine", () => {
    const result = foodPreferenceSchema.safeParse({
      ...validState,
      cuisines: ["random", "japanese"],
    });

    expect(result.success).toBe(false);
  });

  it("requires an explicit location", () => {
    const result = foodPreferenceSchema.safeParse({
      ...validState,
      location: null,
    });

    expect(result.success).toBe(false);
  });
});
