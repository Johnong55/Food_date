import { z } from "zod";

import type { PlaceSummary } from "@/types/place";

const searchCuisineSchema = z.enum([
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

const searchMoodSchema = z.enum([
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

const searchOptionSchema = z.enum([
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

export const searchApiRequestSchema = z
  .object({
    location: z
      .object({
        id: z.string().min(1).max(100),
        label: z.string().min(1).max(120),
        source: z.enum(["current", "manual"]),
        coordinates: z
          .object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
          })
          .strict(),
      })
      .strict(),
    radiusMeters: z.number().int().min(100).max(50_000).nullable(),
    cuisines: z.array(searchCuisineSchema).max(3),
    randomCuisine: z.boolean(),
    budget: z
      .object({
        minPerPerson: z.number().int().min(0).max(100_000_000),
        maxPerPerson: z.number().int().min(0).max(100_000_000).nullable(),
        currency: z.literal("VND"),
      })
      .strict(),
    minRating: z.union([z.literal(3.5), z.literal(4), z.literal(4.3), z.literal(4.5)]),
    minReviewCount: z.union([
      z.literal(20),
      z.literal(50),
      z.literal(100),
      z.literal(500),
      z.literal(1000),
    ]),
    moods: z.array(searchMoodSchema).min(1).max(4),
    options: z.array(searchOptionSchema).max(10),
    pageSize: z.number().int().min(5).max(10).default(10),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.randomCuisine && value.cuisines.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Hãy chọn ít nhất một loại món.",
      });
    }
    if (value.randomCuisine && value.cuisines.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Random không thể đi cùng loại món cụ thể.",
      });
    }
    if (
      value.budget.maxPerPerson !== null &&
      value.budget.minPerPerson > value.budget.maxPerPerson
    ) {
      context.addIssue({
        code: "custom",
        path: ["budget"],
        message: "Khoảng ngân sách không hợp lệ.",
      });
    }
    if (new Set(value.cuisines).size !== value.cuisines.length) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Loại món không được lặp lại.",
      });
    }
    if (new Set(value.options).size !== value.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Tuỳ chọn không được lặp lại.",
      });
    }
  });

export type SearchApiRequest = z.infer<typeof searchApiRequestSchema>;

export type RelaxationSuggestion = {
  filter: "radiusMeters" | "minRating" | "minReviewCount";
  from: number;
  to: number;
  label: string;
};

export type SearchResponseMeta = {
  provider: "google_places";
  order: "google";
  effectiveRadiusMeters: number;
  appliedFilters: string[];
  deferredFilters: string[];
  budgetVerification: "unavailable";
  googleAttributionRequired: true;
};

export type SearchApiData = {
  places: PlaceSummary[];
  suggestions: RelaxationSuggestion[];
  meta: SearchResponseMeta;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Array<{ path: string; message: string }>;
  };
};

export type SearchApiSuccessBody = {
  data: SearchApiData;
  requestId: string;
};
