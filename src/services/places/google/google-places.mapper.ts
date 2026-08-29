import type { GooglePlace } from "@/services/places/google/google-places.schemas";
import type {
  PlaceDetails,
  PlaceOpeningHours,
  PlaceSummary,
} from "@/types/place";

function mapOpeningHours(
  hours: GooglePlace["currentOpeningHours"],
): PlaceOpeningHours | undefined {
  if (!hours) return undefined;
  return {
    openNow: hours.openNow,
    weekdayDescriptions: hours.weekdayDescriptions ?? [],
    nextOpenTime: hours.nextOpenTime,
    nextCloseTime: hours.nextCloseTime,
  };
}

function mapCommonPlace(place: GooglePlace, position: number): PlaceSummary {
  return {
    provider: "google_places",
    id: place.id,
    displayName: place.displayName,
    formattedAddress: place.formattedAddress,
    location: place.location,
    primaryType: place.primaryType,
    types: place.types ?? [],
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,
    photos: (place.photos ?? []).map((photo) => ({
      resourceName: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      googleMapsUri: photo.googleMapsUri,
      authorAttributions: photo.authorAttributions ?? [],
    })),
    currentOpeningHours: mapOpeningHours(place.currentOpeningHours),
    googleResultPosition: position,
  };
}

export function mapGooglePlaceSummary(place: GooglePlace, position: number) {
  const summary = mapCommonPlace(place, position);
  return { ...summary, photos: summary.photos.slice(0, 1) };
}

export function mapGooglePlaceDetails(place: GooglePlace): PlaceDetails {
  const details = mapCommonPlace(place, 0);
  return {
    ...details,
    photos: details.photos.slice(0, 1),
    priceRange: place.priceRange,
    regularOpeningHours: mapOpeningHours(place.regularOpeningHours),
    websiteUri: place.websiteUri,
    googleMapsUri: place.googleMapsUri,
    reviews: (place.reviews ?? []).map((review) => ({
      resourceName: review.name,
      rating: review.rating,
      text: review.text,
      relativePublishTimeDescription:
        review.relativePublishTimeDescription,
      publishTime: review.publishTime,
      googleMapsUri: review.googleMapsUri,
      authorAttribution: review.authorAttribution,
    })),
    features: {
      dineIn: place.dineIn,
      takeout: place.takeout,
      delivery: place.delivery,
      reservable: place.reservable,
      outdoorSeating: place.outdoorSeating,
      goodForGroups: place.goodForGroups,
      goodForChildren: place.goodForChildren,
      liveMusic: place.liveMusic,
      servesBreakfast: place.servesBreakfast,
      servesLunch: place.servesLunch,
      servesDinner: place.servesDinner,
      servesCoffee: place.servesCoffee,
      servesDessert: place.servesDessert,
      servesCocktails: place.servesCocktails,
      servesVegetarianFood: place.servesVegetarianFood,
      parkingOptions: place.parkingOptions,
    },
  };
}
