const SEARCH_BASE_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
] as const;

const SEARCH_PHOTO_FIELDS = ["places.photos"] as const;
const SEARCH_OPEN_FIELDS = ["places.currentOpeningHours.openNow"] as const;
const SEARCH_VEGETARIAN_FIELDS = ["places.servesVegetarianFood"] as const;
const TEXT_SEARCH_PAGINATION_FIELDS = ["nextPageToken"] as const;

const DETAIL_BASE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "primaryType",
  "types",
  "rating",
  "userRatingCount",
  "priceLevel",
  "priceRange",
  "regularOpeningHours",
  "currentOpeningHours",
  "websiteUri",
  "googleMapsUri",
  "photos",
] as const;

const DETAIL_REVIEW_FIELDS = ["reviews"] as const;

const DETAIL_ATTRIBUTE_FIELDS = [
  "dineIn",
  "takeout",
  "delivery",
  "reservable",
  "outdoorSeating",
  "goodForGroups",
  "goodForChildren",
  "liveMusic",
  "servesBreakfast",
  "servesLunch",
  "servesDinner",
  "servesCoffee",
  "servesDessert",
  "servesCocktails",
  "servesVegetarianFood",
  "parkingOptions",
] as const;

function joinFields(fields: readonly string[]) {
  const mask = [...new Set(fields)].join(",");
  if (mask.includes("*")) {
    throw new Error("Wildcard field masks are forbidden in production code.");
  }
  return mask;
}

export function buildSearchFieldMask(options: {
  includePhotos: boolean;
  includeOpenState: boolean;
  includeVegetarianFood?: boolean;
  includeNextPageToken?: boolean;
}) {
  return joinFields([
    ...SEARCH_BASE_FIELDS,
    ...(options.includePhotos ? SEARCH_PHOTO_FIELDS : []),
    ...(options.includeOpenState ? SEARCH_OPEN_FIELDS : []),
    ...(options.includeVegetarianFood ? SEARCH_VEGETARIAN_FIELDS : []),
    ...(options.includeNextPageToken ? TEXT_SEARCH_PAGINATION_FIELDS : []),
  ]);
}

export function buildDetailFieldMask(options: {
  includeReviews: boolean;
  includeAttributes: boolean;
}) {
  return joinFields([
    ...DETAIL_BASE_FIELDS,
    ...(options.includeReviews ? DETAIL_REVIEW_FIELDS : []),
    ...(options.includeAttributes ? DETAIL_ATTRIBUTE_FIELDS : []),
  ]);
}
