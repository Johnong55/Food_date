import { describe, expect, it } from "vitest";

import {
  couplePreferenceSchema,
  coupleSessionCodeSchema,
  coupleSwipeRequestSchema,
  storedCouplePreferenceSchema,
} from "@/features/couple/couple-contract";

const validPreference = {
  cuisines: ["japanese"],
  budgetMaxPerPerson: 400_000,
  radiusMeters: 3_000,
  minRating: 4.3,
  minReviewCount: 100,
  moods: ["quiet"],
  options: ["open_now"],
  location: {
    id: "district-1",
    label: "Quận 1",
    source: "manual",
    coordinates: { latitude: 10.7756, longitude: 106.7004 },
  },
} as const;

describe("couple contracts", () => {
  it("normalizes a valid share code", () => {
    expect(coupleSessionCodeSchema.parse(" ab12cd ")).toBe("AB12CD");
  });

  it("accepts a bounded preference and its stored metadata", () => {
    expect(couplePreferenceSchema.safeParse(validPreference).success).toBe(true);
    expect(
      storedCouplePreferenceSchema.safeParse({
        ...validPreference,
        version: 1,
        submittedAt: "2026-08-29T12:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate selections and precise current location", () => {
    expect(
      couplePreferenceSchema.safeParse({
        ...validPreference,
        cuisines: ["japanese", "japanese"],
      }).success,
    ).toBe(false);
    expect(
      couplePreferenceSchema.safeParse({
        ...validPreference,
        location: { ...validPreference.location, source: "current" },
      }).success,
    ).toBe(false);
  });

  it("accepts only bounded candidate IDs and known swipe decisions", () => {
    expect(
      coupleSwipeRequestSchema.safeParse({
        googlePlaceId: "ChIJ-place-id",
        decision: "super_like",
      }).success,
    ).toBe(true);
    expect(
      coupleSwipeRequestSchema.safeParse({
        googlePlaceId: "ChIJ-place-id",
        decision: "maybe",
      }).success,
    ).toBe(false);
  });
});
