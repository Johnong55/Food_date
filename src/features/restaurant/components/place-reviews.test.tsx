import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlaceReviews } from "@/features/restaurant/components/place-reviews";

describe("PlaceReviews", () => {
  it("renders author attribution and direct Google Maps source access", () => {
    const markup = renderToStaticMarkup(
      <PlaceReviews
        reviews={[
          {
            resourceName: "places/ChIJ-test/reviews/one",
            rating: 4.8,
            text: { text: "Không gian yên tĩnh." },
            relativePublishTimeDescription: "2 tuần trước",
            googleMapsUri: "https://maps.google.com/review/one",
            authorAttribution: {
              displayName: "An",
              uri: "https://maps.google.com/user/an",
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("An");
    expect(markup).toContain("Không gian yên tĩnh.");
    expect(markup).toContain("Xem đánh giá nguồn trên Google Maps");
    expect(markup).toContain("https://maps.google.com/review/one");
  });
});
