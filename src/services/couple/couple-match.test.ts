import { describe, expect, it } from "vitest";

import { buildPrivateSwipeState } from "@/services/couple/couple-match";

describe("buildPrivateSwipeState", () => {
  it("never returns the partner's private decisions and reveals only mutual likes", () => {
    const state = buildPrivateSwipeState(
      ["place-a", "place-b", "place-c"],
      [
        { memberId: "me", googlePlaceId: "place-a", decision: "right" },
        { memberId: "partner", googlePlaceId: "place-a", decision: "super_like" },
        { memberId: "partner", googlePlaceId: "place-b", decision: "right" },
        { memberId: "me", googlePlaceId: "place-c", decision: "left" },
      ],
      "me",
    );

    expect(state.ownDecisions).toEqual({
      "place-a": "right",
      "place-c": "left",
    });
    expect(state.ownDecisions).not.toHaveProperty("place-b");
    expect(state.matchedPlaceIds).toEqual(["place-a"]);
  });
});
