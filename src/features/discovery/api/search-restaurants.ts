import type {
  ApiErrorBody,
  SearchApiSuccessBody,
} from "@/features/discovery/search-contract";
import type { FoodSearchDraft } from "@/features/discovery/types";

export class SearchApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "SearchApiError";
  }
}

export async function searchRestaurantPlaces(draft: FoodSearchDraft) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });
    const body = (await response.json().catch(() => null)) as
      | SearchApiSuccessBody
      | ApiErrorBody
      | null;

    if (!response.ok || !body || "error" in body) {
      const error = body && "error" in body ? body.error : undefined;
      throw new SearchApiError(
        error?.message ?? "Chưa thể tìm quán lúc này.",
        error?.code ?? "SEARCH_FAILED",
        response.status,
        error?.requestId,
      );
    }

    return body.data;
  } catch (error) {
    if (error instanceof SearchApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SearchApiError(
        "Tìm quán hơi lâu. Hãy thử lại nhé.",
        "SEARCH_TIMEOUT",
        504,
      );
    }
    throw new SearchApiError(
      "Không kết nối được dịch vụ tìm quán.",
      "NETWORK_ERROR",
      0,
    );
  } finally {
    window.clearTimeout(timeout);
  }
}
