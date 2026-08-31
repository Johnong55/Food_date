import "server-only";

import { getGooglePlacesEnv } from "@/lib/env/server";
import {
  createGoogleOAuthPlacesAuth,
  GoogleApiKeyPlacesAuth,
} from "@/services/places/google/google-places.auth";
import { GooglePlacesProvider } from "@/services/places/google/google-places.provider";
import type { PlaceProvider } from "@/services/places/place-provider";

let provider: PlaceProvider | undefined;

export function getPlaceProvider(): PlaceProvider {
  if (!provider) {
    const config = getGooglePlacesEnv();
    const authenticator =
      config.authMode === "api_key"
        ? new GoogleApiKeyPlacesAuth(config.apiKey)
        : createGoogleOAuthPlacesAuth({
            projectId: config.projectId,
            serviceAccount:
              config.serviceAccountEmail && config.serviceAccountPrivateKey
                ? {
                    email: config.serviceAccountEmail,
                    privateKey: config.serviceAccountPrivateKey,
                  }
                : undefined,
          });
    provider = new GooglePlacesProvider(authenticator);
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
