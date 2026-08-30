import { z } from "zod";

import type {
  PlaceHistoryRecord,
  SavedCollection,
  SavedPlaceRecord,
} from "@/types/saved";

export const googlePlaceIdSchema = z.string().trim().min(1).max(512);
export const ownedRecordIdSchema = z.uuid();

export const createSavedPlaceSchema = z
  .object({
    googlePlaceId: googlePlaceIdSchema,
    collectionId: z.uuid().nullable().default(null),
  })
  .strict();

export const moveSavedPlaceSchema = z
  .object({ collectionId: z.uuid().nullable() })
  .strict();

export const createCollectionSchema = z
  .object({ name: z.string().trim().min(1).max(60) })
  .strict();

export const createHistoryRecordSchema = z
  .object({
    googlePlaceId: googlePlaceIdSchema,
    personalRating: z.number().min(1).max(5).multipleOf(0.5).nullable(),
    note: z.string().trim().max(2_000).nullable(),
    visitedAt: z.iso.datetime(),
    approximateCost: z.number().int().min(0).max(1_000_000_000).nullable(),
    currency: z.literal("VND").default("VND"),
  })
  .strict()
  .refine(
    (value) => new Date(value.visitedAt).getTime() <= Date.now() + 5 * 60_000,
    { path: ["visitedAt"], message: "Ngày đã đi không thể ở tương lai." },
  );

export type CreateSavedPlaceRequest = z.infer<typeof createSavedPlaceSchema>;
export type MoveSavedPlaceRequest = z.infer<typeof moveSavedPlaceSchema>;
export type CreateCollectionRequest = z.infer<typeof createCollectionSchema>;
export type CreateHistoryRecordRequest = z.infer<typeof createHistoryRecordSchema>;

export type SavedPlacesPayload = {
  places: SavedPlaceRecord[];
  collections: SavedCollection[];
};

export type HistoryPayload = {
  visits: PlaceHistoryRecord[];
};

export type OwnedDataSuccessBody<T> = {
  data: T;
  requestId: string;
};
