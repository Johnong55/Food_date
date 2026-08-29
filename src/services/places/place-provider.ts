import type {
  Coordinates,
  PlaceDetails,
  PlacePhotoAsset,
  PlacePhotoRequest,
  PlacePriceLevel,
  PlaceSummary,
} from "@/types/place";

export type SearchFilters = {
  openNow?: boolean;
  minRating?: number;
  minReviewCount?: number;
  priceLevels?: Exclude<PlacePriceLevel, "PRICE_LEVEL_FREE">[];
};

export type PlaceSearchRequest = {
  center: Coordinates;
  radiusMeters: number;
  textQuery?: string;
  includedTypes?: string[];
  excludedTypes?: string[];
  pageSize?: number;
  pageToken?: string;
  includeNextPageToken?: boolean;
  languageCode?: string;
  regionCode?: string;
  includePhotos?: boolean;
  includeOpenState?: boolean;
  filters?: SearchFilters;
};

export class PlaceProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PlaceProviderError";
  }
}

export type PlaceSearchResult = {
  places: PlaceSummary[];
  nextPageToken?: string;
};

export type PlaceDetailsOptions = {
  languageCode?: string;
  regionCode?: string;
  includeReviews?: boolean;
  includeAttributes?: boolean;
};

export interface PlaceProvider {
  readonly id: "google_places";
  searchPlaces(request: PlaceSearchRequest): Promise<PlaceSearchResult>;
  getPlaceDetails(
    placeId: string,
    options?: PlaceDetailsOptions,
  ): Promise<PlaceDetails>;
  getPlacePhotos(requests: PlacePhotoRequest[]): Promise<PlacePhotoAsset[]>;
}
