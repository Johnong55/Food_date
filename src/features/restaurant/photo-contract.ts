import { z } from "zod";

export const placePhotoRequestSchema = z
  .object({
    resourceName: z
      .string()
      .regex(/^places\/[^/]+\/photos\/[^/]+$/)
      .max(1_500),
    maxWidthPx: z.union([
      z.literal(480),
      z.literal(640),
      z.literal(800),
      z.literal(1200),
    ]),
  })
  .strict();

export type PlacePhotoApiRequest = z.infer<typeof placePhotoRequestSchema>;

export type PlacePhotoApiSuccessBody = {
  data: { photoUri: string };
  requestId: string;
};
