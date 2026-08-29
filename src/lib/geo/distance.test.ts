import { describe, expect, it } from "vitest";

import { haversineDistanceMeters } from "@/lib/geo/distance";

describe("haversineDistanceMeters", () => {
  it("calculates a stable distance without a maps API call", () => {
    const distance = haversineDistanceMeters(
      { latitude: 10.7756, longitude: 106.7004 },
      { latitude: 10.7844, longitude: 106.6844 },
    );

    expect(distance).toBeGreaterThan(1_500);
    expect(distance).toBeLessThan(2_500);
  });
});
