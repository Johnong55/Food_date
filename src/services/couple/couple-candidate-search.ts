import type { SearchApiRequest } from "@/features/discovery/search-contract";
import type { CoupleIntersection } from "@/types/couple";

export function buildCoupleCandidateSearch(
  intersection: CoupleIntersection,
): SearchApiRequest {
  return {
    location: intersection.location,
    radiusMeters: intersection.radiusMeters,
    cuisines: intersection.cuisines,
    randomCuisine: false,
    budget: {
      minPerPerson: 0,
      maxPerPerson: intersection.budgetMaxPerPerson,
      currency: "VND",
    },
    minRating: intersection.minRating,
    minReviewCount: intersection.minReviewCount,
    moods: intersection.moods,
    options: [
      ...new Set([
        ...intersection.requiredOptions,
        ...intersection.sharedOptions,
      ]),
    ],
    pageSize: 10,
  };
}
