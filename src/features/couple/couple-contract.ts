import { z } from "zod";

import type { ApiErrorBody } from "@/features/discovery/search-contract";
import type {
  CoupleMatchesSnapshot,
  CoupleSessionSnapshot,
  CoupleSwipeDeck,
  CoupleSwipeResult,
} from "@/types/couple";

export const coupleSessionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,10}$/, "Mã phiên phải có 6–10 ký tự.");

export const coupleDisplayNameSchema = z.string().trim().min(1).max(40);

export const createCoupleSessionRequestSchema = z
  .object({ displayName: coupleDisplayNameSchema })
  .strict();

export const joinCoupleSessionRequestSchema = createCoupleSessionRequestSchema;

const coupleCuisineSchema = z.enum([
  "vietnamese",
  "japanese",
  "korean",
  "chinese",
  "thai",
  "european",
  "italian",
  "fast_food",
  "bbq",
  "seafood",
  "hotpot",
  "grilled",
  "rice",
  "noodles",
  "healthy",
  "vegetarian",
  "dessert",
]);

const coupleMoodSchema = z.enum([
  "quick",
  "chill",
  "fancy",
  "cheap",
  "filling",
  "healthy",
  "romantic",
  "nice_view",
  "quiet",
  "lively",
  "air_conditioned",
  "outdoor",
  "date_night",
]);

const coupleOptionSchema = z.enum([
  "open_now",
  "has_seating",
  "outdoor_seating",
  "parking",
  "vegetarian_friendly",
  "serves_dessert",
  "serves_coffee",
  "serves_cocktails",
  "good_for_groups",
  "reservable",
]);

const couplePreferenceShape = {
  cuisines: z.array(coupleCuisineSchema).min(1).max(3),
  budgetMaxPerPerson: z.number().int().min(50_000).max(100_000_000).nullable(),
  radiusMeters: z.union([
    z.literal(1_000),
    z.literal(3_000),
    z.literal(5_000),
    z.literal(10_000),
    z.null(),
  ]),
  minRating: z.union([z.literal(3.5), z.literal(4), z.literal(4.3), z.literal(4.5)]),
  minReviewCount: z.union([
    z.literal(20),
    z.literal(50),
    z.literal(100),
    z.literal(500),
    z.literal(1_000),
  ]),
  moods: z.array(coupleMoodSchema).max(4),
  options: z.array(coupleOptionSchema).max(10),
  location: z
    .object({
      id: z.string().min(1).max(100),
      label: z.string().min(1).max(120),
      source: z.literal("manual"),
      coordinates: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
        .strict(),
    })
    .strict(),
} satisfies z.ZodRawShape;

function checkUniqueSelections(
  value: {
    cuisines: string[];
    moods: string[];
    options: string[];
  },
  context: z.RefinementCtx,
) {
  for (const field of ["cuisines", "moods", "options"] as const) {
    if (new Set(value[field]).size !== value[field].length) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: "Lựa chọn không được lặp lại.",
      });
    }
  }
}

export const couplePreferenceSchema = z
  .object(couplePreferenceShape)
  .strict()
  .superRefine(checkUniqueSelections);

export const storedCouplePreferenceSchema = z
  .object({
    ...couplePreferenceShape,
    version: z.literal(1),
    submittedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine(checkUniqueSelections);

export const coupleSwipeDecisionSchema = z.enum([
  "left",
  "right",
  "super_like",
]);

export const coupleSwipeRequestSchema = z
  .object({
    googlePlaceId: z.string().trim().min(1).max(512),
    decision: coupleSwipeDecisionSchema,
  })
  .strict();

export type CreateCoupleSessionRequest = z.infer<
  typeof createCoupleSessionRequestSchema
>;
export type CouplePreferenceRequest = z.infer<typeof couplePreferenceSchema>;
export type CoupleSwipeRequest = z.infer<typeof coupleSwipeRequestSchema>;

export type CoupleSessionApiSuccessBody = {
  data: CoupleSessionSnapshot;
  requestId: string;
};

export type CoupleSessionApiResponseBody =
  | CoupleSessionApiSuccessBody
  | ApiErrorBody;

export type CoupleSwipeDeckApiSuccessBody = {
  data: CoupleSwipeDeck;
  requestId: string;
};

export type CoupleSwipeApiSuccessBody = {
  data: CoupleSwipeResult;
  requestId: string;
};

export type CoupleMatchesApiSuccessBody = {
  data: CoupleMatchesSnapshot;
  requestId: string;
};
