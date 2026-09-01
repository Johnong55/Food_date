import { z } from "zod";

import { googlePlaceIdSchema } from "@/features/restaurant/detail-contract";
import type { PlacePhoto } from "@/types/place";

const photoWidthSchema = z.union([
  z.literal(480),
  z.literal(640),
  z.literal(800),
  z.literal(1200),
]);

export const placePhotoRequestSchema = z.union([
  z
    .object({
    resourceName: z
      .string()
      .regex(/^places\/[^/]+\/photos\/[^/]+$/)
      .max(1_500),
      maxWidthPx: photoWidthSchema,
    })
    .strict(),
  z
    .object({
      placeId: googlePlaceIdSchema,
      maxWidthPx: photoWidthSchema,
    })
    .strict(),
]);

export type PlacePhotoApiRequest = z.infer<typeof placePhotoRequestSchema>;

export type PlacePhotoApiSuccessBody = {
  data: { photoUri: string; photo?: PlacePhoto };
  requestId: string;
};
