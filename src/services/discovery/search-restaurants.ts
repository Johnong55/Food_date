import type {
  RelaxationSuggestion,
  SearchApiData,
  SearchApiRequest,
} from "@/features/discovery/search-contract";
import { buildPlaceSearchRequest } from "@/services/discovery/cuisine-mapping";
import type { PlaceProvider } from "@/services/places/place-provider";

const RADIUS_STEPS = [1_000, 3_000, 5_000, 10_000, 50_000] as const;
const RATING_STEPS = [3.5, 4, 4.3, 4.5] as const;
const REVIEW_STEPS = [20, 50, 100, 500, 1000] as const;

function nextLargerRadius(radius: number) {
  return RADIUS_STEPS.find((step) => step > radius);
}

function nextLowerValue(values: readonly number[], current: number) {
  return [...values].reverse().find((value) => value < current);
}

export function buildRelaxationSuggestions(
  input: SearchApiRequest,
): RelaxationSuggestion[] {
  const suggestions: RelaxationSuggestion[] = [];

  if (input.radiusMeters !== null) {
    const nextRadius = nextLargerRadius(input.radiusMeters);
    if (nextRadius) {
      suggestions.push({
        filter: "radiusMeters",
        from: input.radiusMeters,
        to: nextRadius,
        label: `Nới khoảng cách lên ${nextRadius / 1000} km`,
      });
    }
  }

  const lowerRating = nextLowerValue(RATING_STEPS, input.minRating);
  if (lowerRating) {
    suggestions.push({
      filter: "minRating",
      from: input.minRating,
      to: lowerRating,
      label: `Giảm Google rating từ ${input.minRating} xuống ${lowerRating}`,
    });
  }

  const lowerReviewCount = nextLowerValue(
    REVIEW_STEPS,
    input.minReviewCount,
  );
  if (lowerReviewCount) {
    suggestions.push({
      filter: "minReviewCount",
      from: input.minReviewCount,
      to: lowerReviewCount,
      label: `Giảm số review tối thiểu xuống ${lowerReviewCount}`,
    });
  }

  return suggestions.slice(0, 3);
}

function getDeferredFilters(input: SearchApiRequest) {
  return [
    "budget",
    ...input.moods.map((mood) => `mood:${mood}`),
    ...input.options
      .filter((option) => option !== "open_now")
      .map((option) => `option:${option}`),
  ];
}

export async function searchRestaurants(
  input: SearchApiRequest,
  provider: PlaceProvider,
): Promise<SearchApiData> {
  const providerRequest = buildPlaceSearchRequest(input);
  const result = await provider.searchPlaces(providerRequest);

  return {
    places: result.places,
    suggestions:
      result.places.length === 0 ? buildRelaxationSuggestions(input) : [],
    meta: {
      provider: "google_places",
      order: "google",
      effectiveRadiusMeters: providerRequest.radiusMeters,
      appliedFilters: [
        "radiusMeters",
        "cuisines",
        "minRating",
        "minReviewCount",
        ...(input.options.includes("open_now") ? ["openNow"] : []),
      ],
      deferredFilters: getDeferredFilters(input),
      budgetVerification: "unavailable",
      googleAttributionRequired: true,
    },
  };
}
