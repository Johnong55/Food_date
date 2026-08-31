import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  searchApiRequestSchema,
  type SearchApiSuccessBody,
} from "@/features/discovery/search-contract";
import { apiError, apiJson } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { hasGooglePlacesEnv } from "@/lib/env/server";
import { searchRestaurants } from "@/services/discovery/search-restaurants";
import { getPlaceProvider } from "@/services/places";
import { PlaceProviderError } from "@/services/places/place-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_BODY_BYTES = 16 * 1024;
const SEARCH_RATE_LIMIT = { limit: 10, windowSeconds: 60 } as const;

class RequestBodyError extends Error {
  constructor(
    readonly code: "UNSUPPORTED_MEDIA_TYPE" | "PAYLOAD_TOO_LARGE" | "INVALID_JSON",
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new RequestBodyError(
      "UNSUPPORTED_MEDIA_TYPE",
      415,
      "Request phải sử dụng application/json.",
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RequestBodyError(
      "PAYLOAD_TOO_LARGE",
      413,
      "Dữ liệu tìm kiếm vượt quá giới hạn cho phép.",
    );
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    throw new RequestBodyError(
      "PAYLOAD_TOO_LARGE",
      413,
      "Dữ liệu tìm kiếm vượt quá giới hạn cho phép.",
    );
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new RequestBodyError(
      "INVALID_JSON",
      400,
      "JSON không hợp lệ.",
    );
  }
}

function retryAfterSeconds(rateLimit: RateLimitResult) {
  return Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
}

function mapPlacesError(
  error: PlaceProviderError,
  requestId: string,
  rateLimit: RateLimitResult,
) {
  if (error.code === "TIMEOUT" || error.status === 504) {
    return apiError(
      "PLACES_TIMEOUT",
      "Google Places phản hồi quá lâu. Hãy thử lại sau một chút.",
      { status: 504, requestId, rateLimit },
    );
  }

  if (
    error.status === 403 ||
    error.status === 429 ||
    error.code === "PERMISSION_DENIED" ||
    error.code === "RESOURCE_EXHAUSTED"
  ) {
    return apiError(
      "PLACES_UNAVAILABLE",
      "Dịch vụ tìm quán đang tạm thời không khả dụng.",
      { status: 503, requestId, rateLimit, retryAfterSeconds: 60 },
    );
  }

  return apiError(
    "PLACES_UPSTREAM_ERROR",
    "Chưa thể lấy danh sách quán lúc này.",
    { status: 502, requestId, rateLimit },
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    const actor = getHashedRequestActor(request.headers);
    rateLimit = await getRateLimiter().check(
      `ddag:search:${actor}`,
      SEARCH_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      const retryAfter = retryAfterSeconds(rateLimit);
      return apiError(
        "RATE_LIMITED",
        "Bạn tìm hơi nhanh. Hãy chờ một chút rồi thử lại.",
        {
          status: 429,
          requestId,
          rateLimit,
          retryAfterSeconds: retryAfter,
        },
      );
    }

    const body = await readJsonBody(request);
    const parsed = searchApiRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "INVALID_SEARCH_REQUEST",
        "Một số tiêu chí tìm kiếm chưa hợp lệ.",
        { status: 422, requestId, rateLimit },
        parsed.error.issues.slice(0, 10).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    if (!hasGooglePlacesEnv()) {
      return apiError(
        "PLACES_NOT_CONFIGURED",
        "Chưa cấu hình xác thực Google Places phía server.",
        { status: 503, requestId, rateLimit },
      );
    }

    const data = await searchRestaurants(parsed.data, getPlaceProvider());
    return apiJson<SearchApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId,
        rateLimit,
      });
    }
    if (error instanceof RateLimitUnavailableError) {
      return apiError(
        "RATE_LIMIT_UNAVAILABLE",
        "Hệ thống bảo vệ chi phí đang tạm thời không khả dụng.",
        { status: 503, requestId, retryAfterSeconds: 30 },
      );
    }
    if (error instanceof PlaceProviderError && rateLimit) {
      return mapPlacesError(error, requestId, rateLimit);
    }

    return apiError(
      "INTERNAL_ERROR",
      "Đã có lỗi xảy ra. Hãy thử lại sau.",
      { status: 500, requestId, rateLimit },
    );
  }
}
