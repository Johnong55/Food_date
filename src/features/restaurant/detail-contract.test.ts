import { describe, expect, it } from "vitest";

import { googlePlaceIdSchema } from "@/features/restaurant/detail-contract";

describe("Google place ID contract", () => {
  it("accepts an opaque Google place ID", () => {
    expect(googlePlaceIdSchema.safeParse("ChIJN1t_tDeuEmsRUsoyG83frY4").success).toBe(true);
  });

  it("rejects path separators and control characters", () => {
    expect(googlePlaceIdSchema.safeParse("../../secret").success).toBe(false);
    expect(googlePlaceIdSchema.safeParse("place\nheader").success).toBe(false);
  });
});
