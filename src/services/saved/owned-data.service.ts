import "server-only";

import { z } from "zod";

import type {
  CreateCollectionRequest,
  CreateHistoryRecordRequest,
  CreateSavedPlaceRequest,
  MoveSavedPlaceRequest,
} from "@/features/saved/saved-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PlaceHistoryRecord,
  SavedCollection,
  SavedPlaceRecord,
} from "@/types/saved";

const savedPlaceRowSchema = z.object({
  id: z.uuid(),
  google_place_id: z.string(),
  collection_id: z.uuid().nullable(),
  created_at: z.string(),
});

const collectionRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  created_at: z.string(),
});

const historyRowSchema = z.object({
  id: z.uuid(),
  google_place_id: z.string(),
  personal_rating: z.coerce.number().nullable(),
  note: z.string().nullable(),
  visited_at: z.string(),
  approximate_cost: z.number().int().nullable(),
  currency: z.literal("VND"),
  created_at: z.string(),
});

export class OwnedDataServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(code);
    this.name = "OwnedDataServiceError";
  }
}

function databaseError(error: { code?: string }) {
  if (error.code === "23505") {
    return new OwnedDataServiceError(
      "DUPLICATE_RECORD",
      409,
      "Mục này đã tồn tại.",
    );
  }
  if (error.code === "42501") {
    return new OwnedDataServiceError(
      "OWNERSHIP_REQUIRED",
      403,
      "Bạn không có quyền thay đổi dữ liệu này.",
    );
  }
  return new OwnedDataServiceError(
    "OWNED_DATA_DATABASE_ERROR",
    503,
    "Dữ liệu cá nhân đang tạm thời không khả dụng.",
  );
}

function mapSavedPlace(row: unknown): SavedPlaceRecord {
  const parsed = savedPlaceRowSchema.safeParse(row);
  if (!parsed.success) throw databaseError({});
  return {
    id: parsed.data.id,
    googlePlaceId: parsed.data.google_place_id,
    collectionId: parsed.data.collection_id,
    createdAt: parsed.data.created_at,
  };
}

function mapCollection(row: unknown): SavedCollection {
  const parsed = collectionRowSchema.safeParse(row);
  if (!parsed.success) throw databaseError({});
  return {
    id: parsed.data.id,
    name: parsed.data.name,
    createdAt: parsed.data.created_at,
  };
}

function mapHistory(row: unknown): PlaceHistoryRecord {
  const parsed = historyRowSchema.safeParse(row);
  if (!parsed.success) throw databaseError({});
  return {
    id: parsed.data.id,
    googlePlaceId: parsed.data.google_place_id,
    personalRating: parsed.data.personal_rating,
    note: parsed.data.note,
    visitedAt: parsed.data.visited_at,
    approximateCost: parsed.data.approximate_cost,
    currency: parsed.data.currency,
    createdAt: parsed.data.created_at,
  };
}

async function authenticatedClient() {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new OwnedDataServiceError(
      "AUTH_REQUIRED",
      401,
      "Hãy đăng nhập để đồng bộ danh sách cá nhân.",
    );
  }
  return { client, userId: data.user.id };
}

async function assertCollectionOwner(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  collectionId: string,
) {
  const result = await client
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) {
    throw new OwnedDataServiceError(
      "COLLECTION_NOT_FOUND",
      404,
      "Không tìm thấy bộ sưu tập này.",
    );
  }
}

export async function listSavedPlaces(placeId?: string) {
  const { client, userId } = await authenticatedClient();
  let query = client
    .from("saved_places")
    .select("id,google_place_id,collection_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(placeId ? 10 : 100);
  if (placeId) query = query.eq("google_place_id", placeId);
  const [placesResult, collectionsResult] = await Promise.all([
    query,
    client
      .from("collections")
      .select("id,name,created_at")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .limit(100),
  ]);
  if (placesResult.error) throw databaseError(placesResult.error);
  if (collectionsResult.error) throw databaseError(collectionsResult.error);
  return {
    places: (placesResult.data ?? []).map(mapSavedPlace),
    collections: (collectionsResult.data ?? []).map(mapCollection),
  };
}

export async function savePlace(input: CreateSavedPlaceRequest) {
  const { client, userId } = await authenticatedClient();
  if (input.collectionId) await assertCollectionOwner(client, input.collectionId);

  let existingQuery = client
    .from("saved_places")
    .select("id,google_place_id,collection_id,created_at")
    .eq("user_id", userId)
    .eq("google_place_id", input.googlePlaceId);
  existingQuery = input.collectionId
    ? existingQuery.eq("collection_id", input.collectionId)
    : existingQuery.is("collection_id", null);
  const existing = await existingQuery.maybeSingle();
  if (existing.error) throw databaseError(existing.error);
  if (existing.data) return mapSavedPlace(existing.data);

  const inserted = await client
    .from("saved_places")
    .insert({
      user_id: userId,
      google_place_id: input.googlePlaceId,
      collection_id: input.collectionId,
    })
    .select("id,google_place_id,collection_id,created_at")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const concurrent = await existingQuery.maybeSingle();
      if (!concurrent.error && concurrent.data) return mapSavedPlace(concurrent.data);
    }
    throw databaseError(inserted.error);
  }
  return mapSavedPlace(inserted.data);
}

export async function moveSavedPlace(
  id: string,
  input: MoveSavedPlaceRequest,
) {
  const { client, userId } = await authenticatedClient();
  if (input.collectionId) await assertCollectionOwner(client, input.collectionId);

  const current = await client
    .from("saved_places")
    .select("id,google_place_id,collection_id,created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (current.error) throw databaseError(current.error);
  if (!current.data) {
    throw new OwnedDataServiceError("SAVED_NOT_FOUND", 404, "Không tìm thấy quán đã lưu.");
  }

  let duplicateQuery = client
    .from("saved_places")
    .select("id,google_place_id,collection_id,created_at")
    .eq("user_id", userId)
    .eq("google_place_id", current.data.google_place_id)
    .neq("id", id);
  duplicateQuery = input.collectionId
    ? duplicateQuery.eq("collection_id", input.collectionId)
    : duplicateQuery.is("collection_id", null);
  const duplicate = await duplicateQuery.maybeSingle();
  if (duplicate.error) throw databaseError(duplicate.error);
  if (duplicate.data) {
    const removed = await client.from("saved_places").delete().eq("id", id).eq("user_id", userId);
    if (removed.error) throw databaseError(removed.error);
    return mapSavedPlace(duplicate.data);
  }

  const updated = await client
    .from("saved_places")
    .update({ collection_id: input.collectionId })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,google_place_id,collection_id,created_at")
    .single();
  if (updated.error) throw databaseError(updated.error);
  return mapSavedPlace(updated.data);
}

export async function deleteSavedPlace(id: string) {
  const { client, userId } = await authenticatedClient();
  const deleted = await client
    .from("saved_places")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (deleted.error) throw databaseError(deleted.error);
  if (!deleted.data) {
    throw new OwnedDataServiceError("SAVED_NOT_FOUND", 404, "Không tìm thấy quán đã lưu.");
  }
}

export async function createCollection(input: CreateCollectionRequest) {
  const { client, userId } = await authenticatedClient();
  const result = await client
    .from("collections")
    .insert({ user_id: userId, name: input.name })
    .select("id,name,created_at")
    .single();
  if (result.error) throw databaseError(result.error);
  return mapCollection(result.data);
}

export async function deleteCollection(id: string) {
  const { client, userId } = await authenticatedClient();
  const result = await client
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) {
    throw new OwnedDataServiceError(
      "COLLECTION_NOT_FOUND",
      404,
      "Không tìm thấy bộ sưu tập này.",
    );
  }
}

export async function listHistory() {
  const { client, userId } = await authenticatedClient();
  const result = await client
    .from("place_notes")
    .select(
      "id,google_place_id,personal_rating,note,visited_at,approximate_cost,currency,created_at",
    )
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(100);
  if (result.error) throw databaseError(result.error);
  return { visits: (result.data ?? []).map(mapHistory) };
}

export async function createHistoryRecord(input: CreateHistoryRecordRequest) {
  const { client, userId } = await authenticatedClient();
  const result = await client
    .from("place_notes")
    .insert({
      user_id: userId,
      google_place_id: input.googlePlaceId,
      personal_rating: input.personalRating,
      note: input.note || null,
      visited_at: input.visitedAt,
      approximate_cost: input.approximateCost,
      currency: input.currency,
    })
    .select(
      "id,google_place_id,personal_rating,note,visited_at,approximate_cost,currency,created_at",
    )
    .single();
  if (result.error) throw databaseError(result.error);
  return mapHistory(result.data);
}

export async function deleteHistoryRecord(id: string) {
  const { client, userId } = await authenticatedClient();
  const result = await client
    .from("place_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) {
    throw new OwnedDataServiceError(
      "HISTORY_NOT_FOUND",
      404,
      "Không tìm thấy lần ghé này.",
    );
  }
}
