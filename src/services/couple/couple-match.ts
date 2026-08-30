import type { CoupleSwipeState, SwipeDecision } from "@/types/couple";

export type StoredSwipe = {
  memberId: string;
  googlePlaceId: string;
  decision: SwipeDecision;
};

export function buildPrivateSwipeState(
  candidateIds: string[],
  swipes: StoredSwipe[],
  ownMemberId: string,
): CoupleSwipeState {
  const ownDecisions: Record<string, SwipeDecision> = {};
  const positiveMembers = new Map<string, Set<string>>();

  for (const swipe of swipes) {
    if (swipe.memberId === ownMemberId) {
      ownDecisions[swipe.googlePlaceId] = swipe.decision;
    }
    if (swipe.decision === "right" || swipe.decision === "super_like") {
      const members = positiveMembers.get(swipe.googlePlaceId) ?? new Set<string>();
      members.add(swipe.memberId);
      positiveMembers.set(swipe.googlePlaceId, members);
    }
  }

  return {
    candidateIds,
    candidateCount: candidateIds.length,
    ownSwipeCount: Object.keys(ownDecisions).length,
    ownDecisions,
    matchedPlaceIds: candidateIds.filter(
      (placeId) => (positiveMembers.get(placeId)?.size ?? 0) >= 2,
    ),
  };
}
