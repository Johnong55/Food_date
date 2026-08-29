import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  googlePlaceIdSchema,
  type PlaceDetailsApiSuccessBody,
} from "@/features/restaurant/detail-contract";
import { hasGooglePlacesEnv } from "@/lib/env/server";
import { apiError, apiJson } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { getPlaceProvider } from "@/services/places";
import { PlaceProviderError } from "@/services/places/place-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const DETAIL_RATE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

type RouteContext = {
  params: Promise<{ placeId: string }>;
};

function retryAfterSeconds(rateLimit: RateLimitResult) {
  return Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
}

function mapDetailsError(
  error: PlaceProviderError,
  requestId: string,
  rateLimit: RateLimitResult,
) {
  if (error.status === 404 || error.code === "NOT_FOUND") {
    return apiError("PLACE_NOT_FOUND", "Không tìm thấy địa điểm này.", {
      status: 404,
      requestId,
      rateLimit,
    });
  }
  if (error.code === "TIMEOUT" || error.status === 504) {
    return apiError(
      "PLACE_DETAILS_TIMEOUT",
      "Thông tin quán phản hồi quá lâu. Hãy thử lại sau một chút.",
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
      "Thông tin quán đang tạm thời không khả dụng.",
      { status: 503, requestId, rateLimit, retryAfterSeconds: 60 },
    );
  }
  return apiError(
    "PLACE_DETAILS_UPSTREAM_ERROR",
    "Chưa thể lấy thông tin quán lúc này.",
    { status: 502, requestId, rateLimit },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    const actor = getHashedRequestActor(request.headers);
    rateLimit = await getRateLimiter().check(
      `ddag:place-detail:${actor}`,
      DETAIL_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      const retryAfter = retryAfterSeconds(rateLimit);
      return apiError(
        "RATE_LIMITED",
        "Bạn mở chi tiết hơi nhanh. Hãy chờ một chút rồi thử lại.",
        {
          status: 429,
          requestId,
          rateLimit,
          retryAfterSeconds: retryAfter,
        },
      );
    }

    const { placeId: rawPlaceId } = await context.params;
    const placeId = googlePlaceIdSchema.safeParse(rawPlaceId);
    if (!placeId.success) {
      return apiError("INVALID_PLACE_ID", "Place ID không hợp lệ.", {
        status: 400,
        requestId,
        rateLimit,
      });
    }

    if (!hasGooglePlacesEnv()) {
      return apiError(
        "PLACES_NOT_CONFIGURED",
        "Chưa kết nối Google Places. Hãy thêm GOOGLE_MAPS_API_KEY để xem chi tiết.",
        { status: 503, requestId, rateLimit },
      );
    }

    const data = await getPlaceProvider().getPlaceDetails(placeId.data, {
      languageCode: "vi",
      regionCode: "VN",
      includeReviews: true,
      includeAttributes: true,
    });

    return apiJson<PlaceDetailsApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return apiError(
        "RATE_LIMIT_UNAVAILABLE",
        "Hệ thống bảo vệ chi phí đang tạm thời không khả dụng.",
        { status: 503, requestId, retryAfterSeconds: 30 },
      );
    }
    if (error instanceof PlaceProviderError && rateLimit) {
      return mapDetailsError(error, requestId, rateLimit);
    }

    return apiError(
      "INTERNAL_ERROR",
      "Đã có lỗi xảy ra khi tải thông tin quán.",
      { status: 500, requestId, rateLimit },
    );
  }
}
