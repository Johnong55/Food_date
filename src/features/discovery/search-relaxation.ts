import type {
  RelaxationSuggestion,
} from "@/features/discovery/search-contract";
import type { FoodSearchDraft } from "@/features/discovery/types";

export function applySearchRelaxation(
  draft: FoodSearchDraft,
  suggestion: RelaxationSuggestion,
): FoodSearchDraft {
  switch (suggestion.filter) {
    case "radiusMeters":
      return { ...draft, radiusMeters: suggestion.to };
    case "minRating":
      return {
        ...draft,
        minRating: suggestion.to as FoodSearchDraft["minRating"],
      };
    case "minReviewCount":
      return {
        ...draft,
        minReviewCount: suggestion.to as FoodSearchDraft["minReviewCount"],
      };
  }
}
