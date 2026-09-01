import { describe, expect, it, vi } from "vitest";

import {
  GoogleApiKeyPlacesAuth,
  GoogleOAuthPlacesAuth,
} from "@/services/places/google/google-places.auth";
import { GooglePlacesProvider } from "@/services/places/google/google-places.provider";

describe("GooglePlacesProvider", () => {
  it("normalizes surrounding whitespace from a pasted API key", async () => {
    const auth = new GoogleApiKeyPlacesAuth(
      "  a-secure-test-key-that-is-long\n",
    );

    await expect(auth.getRequestHeaders()).resolves.toEqual({
      "X-Goog-Api-Key": "a-secure-test-key-that-is-long",
    });
  });

  it("preserves the structured Google ErrorInfo reason", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: {
            code: 403,
            message: "Request is blocked.",
            status: "PERMISSION_DENIED",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                reason: "API_KEY_HTTP_REFERRER_BLOCKED",
                domain: "googleapis.com",
              },
            ],
          },
        },
        { status: 403 },
      ),
    );
    const provider = new GooglePlacesProvider(
      new GoogleApiKeyPlacesAuth("a-secure-test-key-that-is-long"),
      fetchMock,
    );

    const result = provider.searchPlaces({
      center: { latitude: 10.775, longitude: 106.7 },
      radiusMeters: 1_000,
    });

    await expect(result).rejects.toMatchObject({
      status: 403,
      code: "PERMISSION_DENIED",
      reason: "API_KEY_HTTP_REFERRER_BLOCKED",
    });
  });

  it("can resolve a photo reference with a photos-only detail request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        photos: [
          {
            name: "places/ChIJ-test/photos/photo-1",
            widthPx: 1200,
            heightPx: 800,
            authorAttributions: [{ displayName: "Người chụp" }],
          },
        ],
      }),
    );
    const provider = new GooglePlacesProvider(
      new GoogleApiKeyPlacesAuth("a-secure-test-key-that-is-long"),
      fetchMock,
    );

    const photos = await provider.getPlacePhotoReferences("ChIJ-test", 1);

    expect(photos[0]).toMatchObject({
      resourceName: "places/ChIJ-test/photos/photo-1",
      widthPx: 1200,
      authorAttributions: [{ displayName: "Người chụp" }],
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/places/ChIJ-test");
    expect((init?.headers as Record<string, string>)["X-Goog-FieldMask"]).toBe(
      "photos",
    );
  });

  it("uses explicit masks, no-store, exact local filters, and Google order", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            {
              id: "first",
              displayName: { text: "Below exact rating" },
              location: { latitude: 10.775, longitude: 106.7 },
              rating: 4.2,
              userRatingCount: 500,
              currentOpeningHours: { openNow: true },
            },
            {
              id: "second",
              displayName: { text: "Valid first" },
              location: { latitude: 10.776, longitude: 106.7 },
              rating: 4.4,
              userRatingCount: 120,
              currentOpeningHours: { openNow: true },
            },
            {
              id: "third",
              displayName: { text: "Valid second" },
              location: { latitude: 10.777, longitude: 106.7 },
              rating: 4.8,
              userRatingCount: 1000,
              currentOpeningHours: { openNow: true },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = new GooglePlacesProvider(
      new GoogleApiKeyPlacesAuth("a-secure-test-key-that-is-long"),
      fetchMock,
    );

    const result = await provider.searchPlaces({
      center: { latitude: 10.775, longitude: 106.7 },
      radiusMeters: 3000,
      textQuery: "nhà hàng Nhật",
      filters: { minRating: 4.3, minReviewCount: 100, openNow: true },
    });

    expect(result.places.map((place) => place.id)).toEqual(["second", "third"]);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(init?.cache).toBe("no-store");
    expect(headers["X-Goog-FieldMask"]).not.toContain("*");
    expect(headers["X-Goog-FieldMask"]).toContain(
      "places.currentOpeningHours.openNow",
    );
    expect(headers["X-Goog-FieldMask"]).not.toContain("nextPageToken");
    expect(headers["X-Goog-Api-Key"]).toBe("a-secure-test-key-that-is-long");
    expect(JSON.parse(String(init?.body)).minRating).toBe(4);
  });

  it("requests expensive detail fields only when detail UI asks for them", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "ChIJ-test",
        displayName: { text: "Quán chi tiết" },
        location: { latitude: 10.775, longitude: 106.7 },
        reviews: [
          {
            rating: 5,
            text: { text: "Rất ngon" },
            authorAttribution: { displayName: "Linh" },
          },
        ],
        dineIn: true,
        servesCocktails: true,
        parkingOptions: { paidParkingLot: true },
      }),
    );
    const provider = new GooglePlacesProvider(
      new GoogleApiKeyPlacesAuth("a-secure-test-key-that-is-long"),
      fetchMock,
    );

    const result = await provider.getPlaceDetails("ChIJ-test", {
      includeReviews: true,
      includeAttributes: true,
    });

    expect(result.reviews[0]?.text?.text).toBe("Rất ngon");
    expect(result.features.dineIn).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(String(url)).toContain("/places/ChIJ-test");
    expect(init?.cache).toBe("no-store");
    expect(headers["X-Goog-FieldMask"]).toContain("reviews");
    expect(headers["X-Goog-FieldMask"]).toContain("dineIn");
    expect(headers["X-Goog-FieldMask"]).toContain("servesCocktails");
    expect(headers["X-Goog-FieldMask"]).toContain("parkingOptions");
    expect(headers["X-Goog-FieldMask"]).not.toContain("*");
  });

  it("requests and enforces vegetarian food only when it is a hard filter", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        places: [
          {
            id: "unknown",
            displayName: { text: "Chưa xác minh" },
            location: { latitude: 10.775, longitude: 106.7 },
          },
          {
            id: "verified",
            displayName: { text: "Có món chay" },
            location: { latitude: 10.776, longitude: 106.7 },
            servesVegetarianFood: true,
          },
        ],
      }),
    );
    const provider = new GooglePlacesProvider(
      new GoogleApiKeyPlacesAuth("a-secure-test-key-that-is-long"),
      fetchMock,
    );

    const result = await provider.searchPlaces({
      center: { latitude: 10.775, longitude: 106.7 },
      radiusMeters: 3_000,
      textQuery: "nhà hàng chay",
      filters: { servesVegetarianFood: true },
    });

    expect(result.places.map((place) => place.id)).toEqual(["verified"]);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toContain("places.servesVegetarianFood");
    expect(headers["X-Goog-FieldMask"]).not.toContain("*");
  });

  it("uses a short-lived OAuth token and quota project in ADC mode", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ places: [] }),
    );
    const tokenProvider = {
      getAccessToken: vi.fn().mockResolvedValue("short-lived-token"),
    };
    const provider = new GooglePlacesProvider(
      new GoogleOAuthPlacesAuth(
        "amazing-codex-470603-t4",
        tokenProvider,
      ),
      fetchMock,
    );

    await provider.searchPlaces({
      center: { latitude: 10.775, longitude: 106.7 },
      radiusMeters: 1_000,
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer short-lived-token");
    expect(headers["X-Goog-User-Project"]).toBe(
      "amazing-codex-470603-t4",
    );
    expect(headers["X-Goog-Api-Key"]).toBeUndefined();
  });
});
