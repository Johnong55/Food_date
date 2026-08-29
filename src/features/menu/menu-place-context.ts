import type { MenuPlaceContext } from "@/types/menu";
import type { PlaceDetails } from "@/types/place";

export function toMenuPlaceContext(place: PlaceDetails): MenuPlaceContext {
  return {
    displayName: place.displayName.text,
    websiteUri: place.websiteUri,
    googleMapsUri: place.googleMapsUri,
    priceLevel: place.priceLevel,
    priceRange: place.priceRange,
  };
}
