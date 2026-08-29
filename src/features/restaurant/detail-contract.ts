import { z } from "zod";

import type { PlaceDetails } from "@/types/place";

export const googlePlaceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(
    (value) => !/[\\/\u0000-\u001F\u007F]/.test(value),
    "Place ID không hợp lệ.",
  );

export type PlaceDetailsApiSuccessBody = {
  data: PlaceDetails;
  requestId: string;
};
