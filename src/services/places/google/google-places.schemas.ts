import { z } from "zod";

const localizedTextSchema = z.object({
  text: z.string(),
  languageCode: z.string().optional(),
});

const authorAttributionSchema = z.object({
  displayName: z.string(),
  uri: z.string().optional(),
  photoUri: z.string().optional(),
});

const photoSchema = z.object({
  name: z.string(),
  widthPx: z.number().optional(),
  heightPx: z.number().optional(),
  googleMapsUri: z.string().optional(),
  authorAttributions: z.array(authorAttributionSchema).optional(),
});

const openingHoursSchema = z.object({
  openNow: z.boolean().optional(),
  weekdayDescriptions: z.array(z.string()).optional(),
  nextOpenTime: z.string().optional(),
  nextCloseTime: z.string().optional(),
});

const moneySchema = z.object({
  currencyCode: z.string(),
  units: z.string().optional(),
  nanos: z.number().optional(),
});

const priceRangeSchema = z.object({
  startPrice: moneySchema.optional(),
  endPrice: moneySchema.optional(),
});

const reviewSchema = z.object({
  name: z.string().optional(),
  rating: z.number().optional(),
  text: localizedTextSchema.optional(),
  relativePublishTimeDescription: z.string().optional(),
  publishTime: z.string().optional(),
  googleMapsUri: z.string().optional(),
  authorAttribution: authorAttributionSchema.optional(),
});

const parkingOptionsSchema = z.object({
  freeParkingLot: z.boolean().optional(),
  paidParkingLot: z.boolean().optional(),
  freeStreetParking: z.boolean().optional(),
  paidStreetParking: z.boolean().optional(),
  valetParking: z.boolean().optional(),
  freeGarageParking: z.boolean().optional(),
  paidGarageParking: z.boolean().optional(),
});

export const googlePlaceSchema = z.object({
  id: z.string(),
  displayName: localizedTextSchema,
  formattedAddress: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  primaryType: z.string().optional(),
  types: z.array(z.string()).optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().int().optional(),
  priceLevel: z
    .enum([
      "PRICE_LEVEL_FREE",
      "PRICE_LEVEL_INEXPENSIVE",
      "PRICE_LEVEL_MODERATE",
      "PRICE_LEVEL_EXPENSIVE",
      "PRICE_LEVEL_VERY_EXPENSIVE",
    ])
    .optional(),
  priceRange: priceRangeSchema.optional(),
  regularOpeningHours: openingHoursSchema.optional(),
  currentOpeningHours: openingHoursSchema.optional(),
  websiteUri: z.string().optional(),
  googleMapsUri: z.string().optional(),
  photos: z.array(photoSchema).optional(),
  reviews: z.array(reviewSchema).optional(),
  dineIn: z.boolean().optional(),
  takeout: z.boolean().optional(),
  delivery: z.boolean().optional(),
  reservable: z.boolean().optional(),
  outdoorSeating: z.boolean().optional(),
  goodForGroups: z.boolean().optional(),
  goodForChildren: z.boolean().optional(),
  liveMusic: z.boolean().optional(),
  servesBreakfast: z.boolean().optional(),
  servesLunch: z.boolean().optional(),
  servesDinner: z.boolean().optional(),
  servesCoffee: z.boolean().optional(),
  servesDessert: z.boolean().optional(),
  servesCocktails: z.boolean().optional(),
  servesVegetarianFood: z.boolean().optional(),
  parkingOptions: parkingOptionsSchema.optional(),
});

export const googleSearchResponseSchema = z.object({
  places: z.array(googlePlaceSchema).optional(),
  nextPageToken: z.string().optional(),
});

export const googlePhotoMediaResponseSchema = z.object({
  name: z.string(),
  photoUri: z.url(),
});

export type GooglePlace = z.infer<typeof googlePlaceSchema>;
