import type {
  MenuApiResponseBody,
  MenuApiSuccessBody,
} from "@/features/menu/menu-contract";

export class MenuApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "MenuApiError";
  }
}

async function readMenuResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | MenuApiResponseBody
    | null;

  if (!response.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : undefined;
    throw new MenuApiError(
      error?.message ?? "Chưa thể tải menu.",
      error?.code ?? "MENU_REQUEST_FAILED",
      response.status,
      error?.requestId,
    );
  }

  return (body as MenuApiSuccessBody).data;
}

export async function getMenu(placeId: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/place/${encodeURIComponent(placeId)}/menu`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: { Accept: "application/json" },
    },
  );
  return readMenuResponse(response);
}

export async function resolveMenu(placeId: string, signal: AbortSignal) {
  const response = await fetch("/api/menu/resolve", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ placeId }),
  });
  return readMenuResponse(response);
}
