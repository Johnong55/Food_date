import type {
  CreateHistoryRecordRequest,
  CreateSavedPlaceRequest,
  HistoryPayload,
  MoveSavedPlaceRequest,
  SavedPlacesPayload,
} from "@/features/saved/saved-contract";
import type {
  PlaceHistoryRecord,
  SavedCollection,
  SavedPlaceRecord,
} from "@/types/saved";

export class OwnedDataApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OwnedDataApiError";
  }
}

async function readJson<T>(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { data: T }
    | { error: { code: string; message: string } }
    | null;
  if (!response.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : undefined;
    throw new OwnedDataApiError(
      error?.message ?? "Chưa thể đồng bộ dữ liệu cá nhân.",
      error?.code ?? "OWNED_DATA_REQUEST_FAILED",
      response.status,
    );
  }
  return (body as { data: T }).data;
}

function jsonRequest(method: "POST" | "PATCH", body: unknown, signal: AbortSignal) {
  return {
    method,
    cache: "no-store" as const,
    credentials: "same-origin" as const,
    signal,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function remove(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers: { Accept: "application/json" },
  });
  if (response.ok) return;
  await readJson<never>(response);
}

export async function getSavedPlaces(signal: AbortSignal, placeId?: string) {
  const query = placeId ? `?placeId=${encodeURIComponent(placeId)}` : "";
  return readJson<SavedPlacesPayload>(
    await fetch(`/api/saved${query}`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: { Accept: "application/json" },
    }),
  );
}

export async function savePlace(input: CreateSavedPlaceRequest, signal: AbortSignal) {
  return readJson<SavedPlaceRecord>(
    await fetch("/api/saved", jsonRequest("POST", input, signal)),
  );
}

export async function moveSavedPlace(
  id: string,
  input: MoveSavedPlaceRequest,
  signal: AbortSignal,
) {
  return readJson<SavedPlaceRecord>(
    await fetch(
      `/api/saved/${encodeURIComponent(id)}`,
      jsonRequest("PATCH", input, signal),
    ),
  );
}

export function deleteSavedPlace(id: string, signal: AbortSignal) {
  return remove(`/api/saved/${encodeURIComponent(id)}`, signal);
}

export async function createCollection(name: string, signal: AbortSignal) {
  return readJson<SavedCollection>(
    await fetch("/api/collections", jsonRequest("POST", { name }, signal)),
  );
}

export function deleteCollection(id: string, signal: AbortSignal) {
  return remove(`/api/collections/${encodeURIComponent(id)}`, signal);
}

export async function getHistory(signal: AbortSignal) {
  return readJson<HistoryPayload>(
    await fetch("/api/history", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: { Accept: "application/json" },
    }),
  );
}

export async function createHistoryRecord(
  input: CreateHistoryRecordRequest,
  signal: AbortSignal,
) {
  return readJson<PlaceHistoryRecord>(
    await fetch("/api/history", jsonRequest("POST", input, signal)),
  );
}

export function deleteHistoryRecord(id: string, signal: AbortSignal) {
  return remove(`/api/history/${encodeURIComponent(id)}`, signal);
}
