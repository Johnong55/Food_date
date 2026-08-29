import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import type { MenuApiSuccessBody } from "@/features/menu/menu-contract";
import { toMenuPlaceContext } from "@/features/menu/menu-place-context";
import { googlePlaceIdSchema } from "@/features/restaurant/detail-contract";
import { hasGooglePlacesEnv } from "@/lib/env/server";
import { apiError, apiJson } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { resolveStoredMenu } from "@/services/menu-resolver";
import { getPlaceProvider } from "@/services/places";
import { PlaceProviderError } from "@/services/places/place-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MENU_READ_RATE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

type RouteContext = {
  params: Promise<{ placeId: string }>;
};

function retryAfterSeconds(rateLimit: RateLimitResult) {
  return Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000));
}

function mapPlaceError(
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
  return apiError(
    "PLACE_DETAILS_UPSTREAM_ERROR",
    "Chưa thể kiểm tra nguồn menu của quán lúc này.",
    { status: 502, requestId, rateLimit },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    const actor = getHashedRequestActor(request.headers);
    rateLimit = await getRateLimiter().check(
      `ddag:menu-read:${actor}`,
      MENU_READ_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      return apiError("RATE_LIMITED", "Bạn tải menu hơi nhanh. Hãy thử lại sau.", {
        status: 429,
        requestId,
        rateLimit,
        retryAfterSeconds: retryAfterSeconds(rateLimit),
      });
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

    const storedResolution = await resolveStoredMenu(placeId.data);
    if (storedResolution.status === "resolved") {
      return apiJson<MenuApiSuccessBody>(
        {
          data: {
            resolution: storedResolution,
            canResolveOfficialWebsite: false,
          },
          requestId,
        },
        { status: 200, requestId, rateLimit },
      );
    }

    if (!hasGooglePlacesEnv()) {
      return apiJson<MenuApiSuccessBody>(
        {
          data: {
            resolution: storedResolution,
            canResolveOfficialWebsite: false,
          },
          requestId,
        },
        { status: 200, requestId, rateLimit },
      );
    }

    const place = await getPlaceProvider().getPlaceDetails(placeId.data, {
      languageCode: "vi",
      regionCode: "VN",
      includeReviews: false,
      includeAttributes: false,
    });
    const placeContext = toMenuPlaceContext(place);

    return apiJson<MenuApiSuccessBody>(
      {
        data: {
          resolution: storedResolution,
          place: placeContext,
          canResolveOfficialWebsite: Boolean(placeContext.websiteUri),
        },
        requestId,
      },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return apiError(
        "RATE_LIMIT_UNAVAILABLE",
        "Hệ thống bảo vệ đang tạm thời không khả dụng.",
        { status: 503, requestId, retryAfterSeconds: 30 },
      );
    }
    if (error instanceof PlaceProviderError && rateLimit) {
      return mapPlaceError(error, requestId, rateLimit);
    }
    return apiError("INTERNAL_ERROR", "Đã có lỗi xảy ra khi tải menu.", {
      status: 500,
      requestId,
      rateLimit,
    });
  }
}
