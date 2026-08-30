import { z } from "zod";

import {
  buildDetailFieldMask,
  buildSearchFieldMask,
} from "@/services/places/google/field-masks";
import {
  googlePhotoMediaResponseSchema,
  googlePlaceSchema,
  googleSearchResponseSchema,
} from "@/services/places/google/google-places.schemas";
import {
  mapGooglePlaceDetails,
  mapGooglePlaceSummary,
} from "@/services/places/google/google-places.mapper";
import {
  PlaceProviderError,
  type PlaceDetailsOptions,
  type PlaceProvider,
  type PlaceSearchRequest,
  type PlaceSearchResult,
} from "@/services/places/place-provider";
import { haversineDistanceMeters } from "@/lib/geo/distance";
import type {
  PlacePhotoAsset,
  PlacePhotoRequest,
  PlaceSummary,
} from "@/types/place";

const API_BASE_URL = "https://places.googleapis.com/v1";
const DEFAULT_TIMEOUT_MS = 8_000;

const searchRequestSchema = z.object({
  center: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  radiusMeters: z.number().positive().max(50_000),
  textQuery: z.string().trim().min(1).max(200).optional(),
  includedTypes: z.array(z.string().min(1).max(100)).max(50).optional(),
  excludedTypes: z.array(z.string().min(1).max(100)).max(50).optional(),
  pageSize: z.number().int().min(1).max(20).default(10),
  pageToken: z.string().min(1).max(2048).optional(),
  includeNextPageToken: z.boolean().default(false),
  languageCode: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default("vi"),
  regionCode: z.string().regex(/^[A-Z]{2}$/).default("VN"),
  includePhotos: z.boolean().default(false),
  includeOpenState: z.boolean().default(false),
  filters: z
    .object({
      openNow: z.boolean().optional(),
      minRating: z.number().min(0).max(5).optional(),
      minReviewCount: z.number().int().min(0).optional(),
      servesVegetarianFood: z.boolean().optional(),
      priceLevels: z
        .array(
          z.enum([
            "PRICE_LEVEL_INEXPENSIVE",
            "PRICE_LEVEL_MODERATE",
            "PRICE_LEVEL_EXPENSIVE",
            "PRICE_LEVEL_VERY_EXPENSIVE",
          ]),
        )
        .min(1)
        .optional(),
    })
    .optional(),
});

const detailsOptionsSchema = z.object({
  languageCode: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default("vi"),
  regionCode: z.string().regex(/^[A-Z]{2}$/).default("VN"),
  includeReviews: z.boolean().default(false),
  includeAttributes: z.boolean().default(false),
});

const placeIdSchema = z.string().min(1).max(512);
const photoRequestSchema = z
  .object({
    resourceName: z
      .string()
      .regex(/^places\/[^/]+\/photos\/[^/]+$/),
    maxWidthPx: z.number().int().min(1).max(4800).optional(),
    maxHeightPx: z.number().int().min(1).max(4800).optional(),
    authorAttributions: z
      .array(
        z.object({
          displayName: z.string(),
          uri: z.string().optional(),
          photoUri: z.string().optional(),
        }),
      )
      .optional(),
  })
  .refine((value) => value.maxWidthPx || value.maxHeightPx, {
    message: "A photo request needs maxWidthPx or maxHeightPx.",
  });

type GoogleErrorBody = {
  error?: {
    message?: string;
    status?: string;
  };
};

function googleCompatibleMinRating(minRating: number | undefined) {
  if (minRating === undefined) return undefined;
  // Google rounds up to the next 0.5. Flooring first avoids excluding a valid
  // 4.3 result, then the exact user threshold is applied locally in order.
  return Math.floor(minRating * 2) / 2;
}

function filterInGoogleOrder(
  places: PlaceSummary[],
  request: z.infer<typeof searchRequestSchema>,
) {
  return places.flatMap((place) => {
    const distanceMeters = haversineDistanceMeters(request.center, place.location);
    const passes =
      distanceMeters <= request.radiusMeters &&
      (request.filters?.minRating === undefined ||
        (place.rating ?? 0) >= request.filters.minRating) &&
      (request.filters?.minReviewCount === undefined ||
        (place.userRatingCount ?? 0) >= request.filters.minReviewCount) &&
      (request.filters?.priceLevels === undefined ||
        (place.priceLevel !== undefined &&
          place.priceLevel !== "PRICE_LEVEL_FREE" &&
          request.filters.priceLevels.includes(place.priceLevel))) &&
      (request.filters?.openNow !== true ||
        place.currentOpeningHours?.openNow === true) &&
      (request.filters?.servesVegetarianFood !== true ||
        place.servesVegetarianFood === true) &&
      (request.excludedTypes?.every((type) => !place.types.includes(type)) ?? true) &&
      (request.textQuery === undefined ||
        request.includedTypes === undefined ||
        request.includedTypes.length <= 1 ||
        request.includedTypes.some((type) => place.types.includes(type)));

    return passes ? [{ ...place, distanceMeters }] : [];
  });
}

export class GooglePlacesProvider implements PlaceProvider {
  readonly id = "google_places" as const;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    if (!apiKey.trim()) {
      throw new Error("Google Places API key is required.");
    }
  }

  async searchPlaces(input: PlaceSearchRequest): Promise<PlaceSearchResult> {
    const request = searchRequestSchema.parse(input);
    const needsOpenState =
      request.includeOpenState || request.filters?.openNow === true;
    const fieldMask = buildSearchFieldMask({
      includePhotos: request.includePhotos,
      includeOpenState: needsOpenState,
      includeVegetarianFood:
        request.filters?.servesVegetarianFood === true,
      // Nearby Search has no pagination field; requesting an unknown response
      // field would make its required Field Mask invalid.
      includeNextPageToken:
        Boolean(request.textQuery) && request.includeNextPageToken,
    });

    const response = request.textQuery
      ? await this.searchText(request, fieldMask)
      : await this.searchNearby(request, fieldMask);

    const places = (response.places ?? []).map((place, position) =>
      mapGooglePlaceSummary(place, position),
    );

    return {
      places: filterInGoogleOrder(places, request),
      nextPageToken: response.nextPageToken,
    };
  }

  async getPlaceDetails(placeId: string, input: PlaceDetailsOptions = {}) {
    const validPlaceId = placeIdSchema.parse(placeId);
    const options = detailsOptionsSchema.parse(input);
    const fieldMask = buildDetailFieldMask(options);
    const query = new URLSearchParams({
      languageCode: options.languageCode,
      regionCode: options.regionCode,
    });

    const json = await this.requestJson(
      `${API_BASE_URL}/places/${encodeURIComponent(validPlaceId)}?${query}`,
      { method: "GET" },
      fieldMask,
    );

    return mapGooglePlaceDetails(googlePlaceSchema.parse(json));
  }

  async getPlacePhotos(input: PlacePhotoRequest[]): Promise<PlacePhotoAsset[]> {
    const requests = z.array(photoRequestSchema).max(10).parse(input);
    const results: PlacePhotoAsset[] = [];

    // Small batches keep media calls bounded without introducing a queue service.
    for (let index = 0; index < requests.length; index += 3) {
      const batch = requests.slice(index, index + 3);
      const assets = await Promise.all(
        batch.map(async (request) => {
          const query = new URLSearchParams({ skipHttpRedirect: "true" });
          if (request.maxWidthPx) query.set("maxWidthPx", String(request.maxWidthPx));
          if (request.maxHeightPx) query.set("maxHeightPx", String(request.maxHeightPx));

          const json = await this.requestJson(
            `${API_BASE_URL}/${request.resourceName}/media?${query}`,
            { method: "GET" },
          );
          const media = googlePhotoMediaResponseSchema.parse(json);
          return {
            resourceName: media.name,
            photoUri: media.photoUri,
            authorAttributions: request.authorAttributions ?? [],
          };
        }),
      );
      results.push(...assets);
    }

    return results;
  }

  private searchText(
    request: z.infer<typeof searchRequestSchema>,
    fieldMask: string,
  ) {
    const body = {
      textQuery: request.textQuery,
      pageSize: request.pageSize,
      pageToken: request.pageToken,
      languageCode: request.languageCode,
      regionCode: request.regionCode,
      locationBias: {
        circle: {
          center: request.center,
          radius: request.radiusMeters,
        },
      },
      includedType:
        request.includedTypes?.length === 1
          ? request.includedTypes[0]
          : undefined,
      strictTypeFiltering: request.includedTypes?.length === 1 || undefined,
      openNow: request.filters?.openNow || undefined,
      minRating: googleCompatibleMinRating(request.filters?.minRating),
      priceLevels: request.filters?.priceLevels,
    };

    return this.requestJson(
      `${API_BASE_URL}/places:searchText`,
      { method: "POST", body: JSON.stringify(body) },
      fieldMask,
    ).then((json) => googleSearchResponseSchema.parse(json));
  }

  private searchNearby(
    request: z.infer<typeof searchRequestSchema>,
    fieldMask: string,
  ) {
    const body = {
      includedTypes: request.includedTypes,
      excludedTypes: request.excludedTypes,
      maxResultCount: request.pageSize,
      languageCode: request.languageCode,
      regionCode: request.regionCode,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: request.center,
          radius: request.radiusMeters,
        },
      },
    };

    return this.requestJson(
      `${API_BASE_URL}/places:searchNearby`,
      { method: "POST", body: JSON.stringify(body) },
      fieldMask,
    ).then((json) => googleSearchResponseSchema.parse(json));
  }

  private async requestJson(
    url: string,
    init: RequestInit,
    fieldMask?: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
          ...init.headers,
        },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as GoogleErrorBody;
        throw new PlaceProviderError(
          errorBody.error?.message ?? "Google Places request failed.",
          response.status,
          errorBody.error?.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof PlaceProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlaceProviderError("Google Places request timed out.", 504, "TIMEOUT");
      }
      throw new PlaceProviderError("Google Places request failed.", 502, "UPSTREAM_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}
