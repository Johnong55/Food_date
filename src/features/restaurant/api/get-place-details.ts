import type { ApiErrorBody } from "@/features/discovery/search-contract";
import type { PlaceDetailsApiSuccessBody } from "@/features/restaurant/detail-contract";

export class PlaceDetailsApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "PlaceDetailsApiError";
  }
}

export async function getPlaceDetails(placeId: string, signal: AbortSignal) {
  const response = await fetch(`/api/place/${encodeURIComponent(placeId)}`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers: { Accept: "application/json" },
  });
  const body = (await response.json().catch(() => null)) as
    | PlaceDetailsApiSuccessBody
    | ApiErrorBody
    | null;

  if (!response.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : undefined;
    throw new PlaceDetailsApiError(
      error?.message ?? "Chưa thể tải thông tin quán.",
      error?.code ?? "PLACE_DETAILS_FAILED",
      response.status,
      error?.requestId,
    );
  }

  return body.data;
}
