import { EmptySearchResults } from "@/features/discovery/components/empty-search-results";
import type {
  RelaxationSuggestion,
  SearchApiData,
} from "@/features/discovery/search-contract";
import type { FoodSearchDraft } from "@/features/discovery/types";
import { RestaurantResults } from "@/features/restaurant/components/restaurant-results";

type DiscoveryReadyProps = {
  draft: FoodSearchDraft;
  result: SearchApiData;
  isSearching: boolean;
  error: string | null;
  onEdit: () => void;
  onRelax: (suggestion: RelaxationSuggestion) => void;
  onRetry: () => void;
};

export function DiscoveryReady({
  draft,
  result,
  isSearching,
  error,
  onEdit,
  onRelax,
  onRetry,
}: DiscoveryReadyProps) {
  if (result.places.length > 0) {
    return <RestaurantResults draft={draft} result={result} onEdit={onEdit} />;
  }

  return (
    <EmptySearchResults
      draft={draft}
      suggestions={result.suggestions}
      isSearching={isSearching}
      error={error}
      onEdit={onEdit}
      onRelax={onRelax}
      onRetry={onRetry}
    />
  );
}
