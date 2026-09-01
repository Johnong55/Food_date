import { describe, expect, it } from "vitest";

import { placePhotoRequestSchema } from "@/features/restaurant/photo-contract";

describe("place photo request contract", () => {
  it("accepts a bounded Google photo resource request", () => {
    expect(
      placePhotoRequestSchema.safeParse({
        resourceName: "places/ChIJ-test/photos/photo-1",
        maxWidthPx: 800,
      }).success,
    ).toBe(true);
  });

  it("accepts a Place ID so the server can lazily resolve a photo", () => {
    expect(
      placePhotoRequestSchema.safeParse({
        placeId: "ChIJ-test",
        maxWidthPx: 800,
      }).success,
    ).toBe(true);
  });

  it("rejects arbitrary paths and unbounded dimensions", () => {
    expect(
      placePhotoRequestSchema.safeParse({
        resourceName: "https://example.com/image.jpg",
        maxWidthPx: 800,
      }).success,
    ).toBe(false);
    expect(
      placePhotoRequestSchema.safeParse({
        resourceName: "places/ChIJ-test/photos/photo-1",
        maxWidthPx: 4800,
      }).success,
    ).toBe(false);
  });
});
