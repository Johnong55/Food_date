import type {
  CouplePreferenceRequest,
  CoupleSwipeRequest,
} from "@/features/couple/couple-contract";
import type {
  CoupleMatchesSnapshot,
  CoupleSessionSnapshot,
  CoupleSwipeDeck,
  CoupleSwipeResult,
} from "@/types/couple";

export class CoupleSessionApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "CoupleSessionApiError";
  }
}

async function readResponse<T>(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { data: T; requestId: string }
    | { error: { code: string; message: string; requestId?: string } }
    | null;
  if (!response.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : undefined;
    throw new CoupleSessionApiError(
      error?.message ?? "Couple Mode chưa thể xử lý yêu cầu.",
      error?.code ?? "COUPLE_REQUEST_FAILED",
      response.status,
      error?.requestId,
    );
  }
  return (body as { data: T }).data;
}

function jsonRequest(body: unknown, signal: AbortSignal): RequestInit {
  return {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function createCoupleSession(
  displayName: string,
  signal: AbortSignal,
) {
  return readResponse<CoupleSessionSnapshot>(
    await fetch("/api/couple/session", jsonRequest({ displayName }, signal)),
  );
}

export async function joinCoupleSession(
  code: string,
  displayName: string,
  signal: AbortSignal,
) {
  return readResponse<CoupleSessionSnapshot>(
    await fetch(
      `/api/couple/session/${encodeURIComponent(code)}/join`,
      jsonRequest({ displayName }, signal),
    ),
  );
}

export async function getCoupleSession(code: string, signal: AbortSignal) {
  return readResponse<CoupleSessionSnapshot>(
    await fetch(`/api/couple/session/${encodeURIComponent(code)}`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: { Accept: "application/json" },
    }),
  );
}

export async function saveCouplePreferences(
  code: string,
  preference: CouplePreferenceRequest,
  signal: AbortSignal,
) {
  return readResponse<CoupleSessionSnapshot>(
    await fetch(
      `/api/couple/session/${encodeURIComponent(code)}/preferences`,
      jsonRequest(preference, signal),
    ),
  );
}

export async function createCoupleSwipeDeck(
  code: string,
  signal: AbortSignal,
) {
  return readResponse<CoupleSwipeDeck>(
    await fetch(
      `/api/couple/session/${encodeURIComponent(code)}/candidates`,
      jsonRequest({}, signal),
    ),
  );
}

export async function saveCoupleSwipe(
  code: string,
  swipe: CoupleSwipeRequest,
  signal: AbortSignal,
) {
  return readResponse<CoupleSwipeResult>(
    await fetch(
      `/api/couple/session/${encodeURIComponent(code)}/swipe`,
      jsonRequest(swipe, signal),
    ),
  );
}

export async function getCoupleMatches(code: string, signal: AbortSignal) {
  return readResponse<CoupleMatchesSnapshot>(
    await fetch(`/api/couple/session/${encodeURIComponent(code)}/matches`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: { Accept: "application/json" },
    }),
  );
}
