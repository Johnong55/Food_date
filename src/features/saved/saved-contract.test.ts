import { describe, expect, it } from "vitest";

import {
  createCollectionSchema,
  createHistoryRecordSchema,
  createSavedPlaceSchema,
} from "@/features/saved/saved-contract";

describe("saved and history contracts", () => {
  it("accepts opaque Place IDs without mirroring Google content", () => {
    const parsed = createSavedPlaceSchema.parse({
      googlePlaceId: "ChIJ-opaque-place",
      collectionId: null,
    });
    expect(parsed).toEqual({
      googlePlaceId: "ChIJ-opaque-place",
      collectionId: null,
    });
  });

  it("normalizes collection names and rejects unbounded history notes", () => {
    expect(createCollectionSchema.parse({ name: "  Date night  " }).name).toBe(
      "Date night",
    );
    expect(
      createHistoryRecordSchema.safeParse({
        googlePlaceId: "ChIJ-test",
        personalRating: 4.5,
        note: "x".repeat(2_001),
        visitedAt: "2026-08-30T12:00:00.000Z",
        approximateCost: 500_000,
        currency: "VND",
      }).success,
    ).toBe(false);
  });
});
