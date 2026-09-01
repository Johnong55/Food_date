import { describe, expect, it } from "vitest";

import {
  canContinueFromStep,
  createInitialPreferences,
  preferenceReducer,
} from "@/features/discovery/preference-reducer";

describe("preferenceReducer", () => {
  it("keeps Random mutually exclusive with named cuisines", () => {
    const random = preferenceReducer(createInitialPreferences(), {
      type: "toggle_cuisine",
      value: "random",
    });
    const japanese = preferenceReducer(random, {
      type: "toggle_cuisine",
      value: "japanese",
    });

    expect(random.cuisines).toEqual(["random"]);
    expect(japanese.cuisines).toEqual(["japanese"]);
  });

  it("limits cuisine selection to three values", () => {
    const values = ["vietnamese", "japanese", "korean", "thai"] as const;
    const result = values.reduce(
      (state, value) =>
        preferenceReducer(state, { type: "toggle_cuisine", value }),
      createInitialPreferences(),
    );

    expect(result.cuisines).toEqual(["vietnamese", "japanese", "korean"]);
  });

  it("requires the essential selection for each wizard step", () => {
    const initial = createInitialPreferences();
    expect(initial.distanceId).toBe("5km");
    expect(canContinueFromStep(0, initial)).toBe(false);

    const withCuisine = preferenceReducer(initial, {
      type: "toggle_cuisine",
      value: "vietnamese",
    });
    expect(canContinueFromStep(0, withCuisine)).toBe(true);
    expect(canContinueFromStep(1, withCuisine)).toBe(false);
  });
});
