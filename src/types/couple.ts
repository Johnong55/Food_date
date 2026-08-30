import type {
  CuisineId,
  MoodId,
  PreferenceOptionId,
  RatingThreshold,
  ReviewThreshold,
  UserLocation,
} from "@/features/discovery/types";
import type { PlaceSummary } from "@/types/place";

export type CoupleSessionStatus =
  | "collecting_preferences"
  | "swiping"
  | "matched"
  | "completed"
  | "expired";

export type CouplePreference = {
  cuisines: Exclude<CuisineId, "random">[];
  budgetMaxPerPerson: number | null;
  radiusMeters: 1_000 | 3_000 | 5_000 | 10_000 | null;
  minRating: RatingThreshold;
  minReviewCount: ReviewThreshold;
  moods: MoodId[];
  options: PreferenceOptionId[];
  location: UserLocation & { source: "manual" };
};

export type StoredCouplePreference = CouplePreference & {
  version: 1;
  submittedAt: string;
};

export type CoupleIntersection = {
  cuisines: Exclude<CuisineId, "random">[];
  hasCuisineMatch: boolean;
  budgetMaxPerPerson: number | null;
  radiusMeters: number | null;
  minRating: RatingThreshold;
  minReviewCount: ReviewThreshold;
  moods: MoodId[];
  requiredOptions: PreferenceOptionId[];
  sharedOptions: PreferenceOptionId[];
  location: UserLocation & {
    source: "manual";
    strategy: "same_area" | "midpoint";
  };
};

export type CoupleMemberSummary = {
  displayName: string;
  preferenceSubmitted: boolean;
};

export type CoupleSessionSnapshot = {
  code: string;
  status: CoupleSessionStatus;
  expiresAt: string;
  shareUrl: string;
  memberCount: number;
  own: CoupleMemberSummary & {
    preferences?: CouplePreference;
  };
  partner?: CoupleMemberSummary;
  intersection?: CoupleIntersection;
};

export type SwipeDecision = "left" | "right" | "super_like";

export type CoupleSwipeState = {
  candidateIds: string[];
  candidateCount: number;
  ownSwipeCount: number;
  ownDecisions: Record<string, SwipeDecision>;
  matchedPlaceIds: string[];
};

export type CoupleSwipeDeck = CoupleSwipeState & {
  places: PlaceSummary[];
  budgetVerification: "unavailable";
  googleOrderPreserved: true;
};

export type CoupleSwipeResult = CoupleSwipeState & {
  decision: SwipeDecision;
  matched: boolean;
  matchedPlaceId?: string;
  status: CoupleSessionStatus;
};

export type CoupleMatchesSnapshot = Pick<
  CoupleSwipeState,
  "candidateCount" | "ownSwipeCount" | "matchedPlaceIds"
> & {
  status: CoupleSessionStatus;
};
