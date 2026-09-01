import type { ApiErrorBody } from "@/features/discovery/search-contract";
import type {
  PlacePhotoApiRequest,
  PlacePhotoApiSuccessBody,
} from "@/features/restaurant/photo-contract";

export class PlacePhotoApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PlacePhotoApiError";
  }
}

export async function getPlacePhoto(
  input: PlacePhotoApiRequest,
  signal: AbortSignal,
) {
  const response = await fetch("/api/place/photo", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as
    | PlacePhotoApiSuccessBody
    | ApiErrorBody
    | null;

  if (!response.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : undefined;
    throw new PlacePhotoApiError(
      error?.message ?? "Chưa tải được ảnh địa điểm.",
      error?.code ?? "PHOTO_FAILED",
      response.status,
    );
  }

  return body.data;
}
