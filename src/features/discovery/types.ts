import type { Coordinates } from "@/types/place";

export type CuisineId =
  | "vietnamese"
  | "japanese"
  | "korean"
  | "chinese"
  | "thai"
  | "european"
  | "italian"
  | "fast_food"
  | "bbq"
  | "seafood"
  | "hotpot"
  | "grilled"
  | "rice"
  | "noodles"
  | "healthy"
  | "vegetarian"
  | "dessert"
  | "random";

export type MoodId =
  | "quick"
  | "chill"
  | "fancy"
  | "cheap"
  | "filling"
  | "healthy"
  | "romantic"
  | "nice_view"
  | "quiet"
  | "lively"
  | "air_conditioned"
  | "outdoor"
  | "date_night";

export type BudgetId =
  | "under_100"
  | "100_200"
  | "200_400"
  | "400_700"
  | "over_700";

export type DistanceId = "1km" | "3km" | "5km" | "10km" | "any";
export type RatingThreshold = 3.5 | 4 | 4.3 | 4.5;
export type ReviewThreshold = 20 | 50 | 100 | 500 | 1000;

export type PreferenceOptionId =
  | "open_now"
  | "has_seating"
  | "outdoor_seating"
  | "parking"
  | "vegetarian_friendly"
  | "serves_dessert"
  | "serves_coffee"
  | "serves_cocktails"
  | "good_for_groups"
  | "reservable";

export type UserLocation = {
  id: string;
  label: string;
  coordinates: Coordinates;
};

export type SelectedLocation = UserLocation & {
  source: "current" | "manual";
};

export type FoodPreferenceState = {
  cuisines: CuisineId[];
  moods: MoodId[];
  budgetId: BudgetId | null;
  distanceId: DistanceId;
  minRating: RatingThreshold;
  minReviewCount: ReviewThreshold;
  options: PreferenceOptionId[];
  location: SelectedLocation | null;
};

export type FoodSearchDraft = {
  location: SelectedLocation;
  radiusMeters: number | null;
  cuisines: Exclude<CuisineId, "random">[];
  randomCuisine: boolean;
  budget: {
    minPerPerson: number;
    maxPerPerson: number | null;
    currency: "VND";
  };
  minRating: RatingThreshold;
  minReviewCount: ReviewThreshold;
  moods: MoodId[];
  options: PreferenceOptionId[];
};

export type PreferenceAction =
  | { type: "toggle_cuisine"; value: CuisineId }
  | { type: "toggle_mood"; value: MoodId }
  | { type: "set_budget"; value: BudgetId }
  | { type: "set_distance"; value: DistanceId }
  | { type: "set_rating"; value: RatingThreshold }
  | { type: "set_review_count"; value: ReviewThreshold }
  | { type: "toggle_option"; value: PreferenceOptionId }
  | { type: "set_location"; value: SelectedLocation }
  | { type: "reset"; randomCuisine?: boolean };
