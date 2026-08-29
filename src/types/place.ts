export type PlaceProviderId = "google_places";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocalizedText = {
  text: string;
  languageCode?: string;
};

export type Money = {
  currencyCode: string;
  units?: string;
  nanos?: number;
};

export type PriceRange = {
  startPrice?: Money;
  endPrice?: Money;
};

export type PlacePriceLevel =
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

export type AuthorAttribution = {
  displayName: string;
  uri?: string;
  photoUri?: string;
};

export type PlacePhoto = {
  resourceName: string;
  widthPx?: number;
  heightPx?: number;
  googleMapsUri?: string;
  authorAttributions: AuthorAttribution[];
};

export type PlaceOpeningHours = {
  openNow?: boolean;
  weekdayDescriptions: string[];
  nextOpenTime?: string;
  nextCloseTime?: string;
};

export type PlaceReview = {
  resourceName?: string;
  rating?: number;
  text?: LocalizedText;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  googleMapsUri?: string;
  authorAttribution?: AuthorAttribution;
};

export type PlaceParkingOptions = {
  freeParkingLot?: boolean;
  paidParkingLot?: boolean;
  freeStreetParking?: boolean;
  paidStreetParking?: boolean;
  valetParking?: boolean;
  freeGarageParking?: boolean;
  paidGarageParking?: boolean;
};

export type PlaceFeatures = {
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  reservable?: boolean;
  outdoorSeating?: boolean;
  goodForGroups?: boolean;
  goodForChildren?: boolean;
  liveMusic?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesCoffee?: boolean;
  servesDessert?: boolean;
  servesCocktails?: boolean;
  servesVegetarianFood?: boolean;
  parkingOptions?: PlaceParkingOptions;
};

export type PlaceSummary = {
  provider: PlaceProviderId;
  id: string;
  displayName: LocalizedText;
  formattedAddress?: string;
  location: Coordinates;
  primaryType?: string;
  types: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: PlacePriceLevel;
  photos: PlacePhoto[];
  currentOpeningHours?: PlaceOpeningHours;
  distanceMeters?: number;
  googleResultPosition: number;
};

export type PlaceDetails = PlaceSummary & {
  priceRange?: PriceRange;
  regularOpeningHours?: PlaceOpeningHours;
  websiteUri?: string;
  googleMapsUri?: string;
  reviews: PlaceReview[];
  features: PlaceFeatures;
};

export type PlacePhotoRequest = {
  resourceName: string;
  maxWidthPx?: number;
  maxHeightPx?: number;
  authorAttributions?: AuthorAttribution[];
};

export type PlacePhotoAsset = {
  resourceName: string;
  photoUri: string;
  authorAttributions: AuthorAttribution[];
};
