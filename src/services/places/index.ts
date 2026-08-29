import "server-only";

import { getGooglePlacesEnv } from "@/lib/env/server";
import { GooglePlacesProvider } from "@/services/places/google/google-places.provider";
import type { PlaceProvider } from "@/services/places/place-provider";

let provider: PlaceProvider | undefined;

export function getPlaceProvider(): PlaceProvider {
  if (!provider) {
    const { apiKey } = getGooglePlacesEnv();
    provider = new GooglePlacesProvider(apiKey);
  }
  return provider;
}

export type {
  PlaceDetailsOptions,
  PlaceProvider,
  PlaceSearchRequest,
  PlaceSearchResult,
  SearchFilters,
} from "@/services/places/place-provider";
