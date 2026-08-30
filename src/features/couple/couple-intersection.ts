import type {
  CoupleIntersection,
  CouplePreference,
} from "@/types/couple";
import type { PreferenceOptionId } from "@/features/discovery/types";

const HARD_OPTIONS = new Set<PreferenceOptionId>([
  "open_now",
  "vegetarian_friendly",
]);

function intersection<T>(left: T[], right: T[]) {
  const rightValues = new Set(right);
  return left.filter((value) => rightValues.has(value));
}

function stricterNullableMaximum<T extends number>(left: T | null, right: T | null) {
  if (left === null) return right;
  if (right === null) return left;
  return Math.min(left, right) as T;
}

export function intersectCouplePreferences(
  left: CouplePreference,
  right: CouplePreference,
): CoupleIntersection {
  const cuisines = intersection(left.cuisines, right.cuisines);
  const hardOptions = [...new Set([...left.options, ...right.options])].filter(
    (option) => HARD_OPTIONS.has(option),
  );
  const sharedOptions = intersection(left.options, right.options).filter(
    (option) => !HARD_OPTIONS.has(option),
  );
  const sameArea = left.location.id === right.location.id;

  return {
    cuisines,
    hasCuisineMatch: cuisines.length > 0,
    budgetMaxPerPerson: stricterNullableMaximum(
      left.budgetMaxPerPerson,
      right.budgetMaxPerPerson,
    ),
    radiusMeters: stricterNullableMaximum(left.radiusMeters, right.radiusMeters),
    minRating: Math.max(left.minRating, right.minRating) as CoupleIntersection["minRating"],
    minReviewCount: Math.max(
      left.minReviewCount,
      right.minReviewCount,
    ) as CoupleIntersection["minReviewCount"],
    moods: intersection(left.moods, right.moods),
    requiredOptions: hardOptions,
    sharedOptions,
    location: {
      id: sameArea
        ? left.location.id
        : `midpoint:${left.location.id}:${right.location.id}`.slice(0, 100),
      label: sameArea
        ? left.location.label
        : `Điểm giữa ${left.location.label} và ${right.location.label}`.slice(0, 120),
      source: "manual",
      coordinates: sameArea
        ? left.location.coordinates
        : {
            latitude:
              (left.location.coordinates.latitude +
                right.location.coordinates.latitude) /
              2,
            longitude:
              (left.location.coordinates.longitude +
                right.location.coordinates.longitude) /
              2,
          },
      strategy: sameArea ? "same_area" : "midpoint",
    },
  };
}
