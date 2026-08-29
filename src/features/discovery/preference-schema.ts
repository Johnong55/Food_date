import { z } from "zod";

import type { FoodPreferenceState, FoodSearchDraft } from "@/features/discovery/types";
import {
  BUDGET_OPTIONS,
  DISTANCE_OPTIONS,
} from "@/features/discovery/constants";

const cuisineSchema = z.enum([
  "vietnamese", "japanese", "korean", "chinese", "thai", "european",
  "italian", "fast_food", "bbq", "seafood", "hotpot", "grilled", "rice",
  "noodles", "healthy", "vegetarian", "dessert", "random",
]);

const moodSchema = z.enum([
  "quick", "chill", "fancy", "cheap", "filling", "healthy", "romantic",
  "nice_view", "quiet", "lively", "air_conditioned", "outdoor", "date_night",
]);

const optionSchema = z.enum([
  "open_now", "has_seating", "outdoor_seating", "parking",
  "vegetarian_friendly", "serves_dessert", "serves_coffee",
  "serves_cocktails", "good_for_groups", "reservable",
]);

export const foodPreferenceSchema = z
  .object({
    cuisines: z.array(cuisineSchema).min(1).max(3),
    moods: z.array(moodSchema).min(1).max(4),
    budgetId: z.enum(["under_100", "100_200", "200_400", "400_700", "over_700"]),
    distanceId: z.enum(["1km", "3km", "5km", "10km", "any"]),
    minRating: z.number().refine((value) => [3.5, 4, 4.3, 4.5].includes(value)),
    minReviewCount: z.number().int().refine((value) => [20, 50, 100, 500, 1000].includes(value)),
    options: z.array(optionSchema),
    location: z.object({
      id: z.string().min(1).max(100),
      label: z.string().min(1).max(120),
      source: z.enum(["current", "manual"]),
      coordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    }),
  })
  .superRefine((value, context) => {
    if (value.cuisines.includes("random") && value.cuisines.length > 1) {
      context.addIssue({
        code: "custom",
        path: ["cuisines"],
        message: "Random không thể chọn cùng loại món khác.",
      });
    }
  });

export function toFoodSearchDraft(state: FoodPreferenceState): FoodSearchDraft {
  const preferences = foodPreferenceSchema.parse(state);
  const budget = BUDGET_OPTIONS.find((item) => item.id === preferences.budgetId);
  const distance = DISTANCE_OPTIONS.find((item) => item.id === preferences.distanceId);

  if (!budget || !distance) {
    throw new Error("Cấu hình bộ lọc không hợp lệ.");
  }

  return {
    location: preferences.location,
    radiusMeters: distance.radiusMeters,
    cuisines: preferences.cuisines.filter(
      (cuisine): cuisine is Exclude<typeof cuisine, "random"> => cuisine !== "random",
    ),
    randomCuisine: preferences.cuisines.includes("random"),
    budget: {
      minPerPerson: budget.min,
      maxPerPerson: budget.max,
      currency: "VND",
    },
    minRating: preferences.minRating as FoodSearchDraft["minRating"],
    minReviewCount: preferences.minReviewCount as FoodSearchDraft["minReviewCount"],
    moods: preferences.moods,
    options: preferences.options,
  };
}
