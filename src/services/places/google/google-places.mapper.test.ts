import { describe, expect, it } from "vitest";

import {
  buildDetailFieldMask,
  buildSearchFieldMask,
} from "@/services/places/google/field-masks";
import {
  mapGooglePlaceDetails,
  mapGooglePlaceSummary,
} from "@/services/places/google/google-places.mapper";

describe("Google Places mapping", () => {
  it("keeps author attributions and distinguishes Google data", () => {
    const result = mapGooglePlaceDetails({
      id: "ChIJ-test",
      displayName: { text: "Quán thử", languageCode: "vi" },
      location: { latitude: 10.77, longitude: 106.69 },
      types: ["japanese_restaurant", "restaurant"],
      rating: 4.6,
      userRatingCount: 1200,
      photos: [
        {
          name: "places/ChIJ-test/photos/photo-1",
          authorAttributions: [
            { displayName: "Người chụp", uri: "https://example.com/author" },
          ],
        },
      ],
      currentOpeningHours: {
        openNow: true,
        weekdayDescriptions: ["Thứ Hai: 10:00–22:00"],
      },
      dineIn: true,
    });

    expect(result.provider).toBe("google_places");
    expect(result.photos[0]?.authorAttributions[0]?.displayName).toBe("Người chụp");
    expect(result.currentOpeningHours?.openNow).toBe(true);
    expect(result.features.dineIn).toBe(true);
  });

  it("never generates wildcard field masks", () => {
    const searchMask = buildSearchFieldMask({
      includePhotos: true,
      includeOpenState: true,
      includeNextPageToken: true,
    });
    const detailMask = buildDetailFieldMask({
      includeReviews: true,
      includeAttributes: true,
    });

    expect(searchMask).not.toContain("*");
    expect(searchMask).toContain("places.photos");
    expect(searchMask).toContain("nextPageToken");
    expect(detailMask).not.toContain("*");
    expect(detailMask).toContain("reviews");
  });

  it("keeps only one photo reference in search summaries", () => {
    const result = mapGooglePlaceSummary(
      {
        id: "ChIJ-test",
        displayName: { text: "Quán thử" },
        location: { latitude: 10.77, longitude: 106.69 },
        photos: [
          { name: "places/ChIJ-test/photos/photo-1" },
          { name: "places/ChIJ-test/photos/photo-2" },
        ],
      },
      0,
    );

    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]?.resourceName).toContain("photo-1");
  });
});
