import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { placePhotoRequestSchema } from "@/features/restaurant/photo-contract";
import { apiError, apiJson } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import { hasGooglePlacesEnv } from "@/lib/env/server";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { getPlaceProvider } from "@/services/places";
import { PlaceProviderError } from "@/services/places/place-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MAX_BODY_BYTES = 2 * 1024;
const PHOTO_RATE_LIMIT = { limit: 60, windowSeconds: 60 } as const;

function retryAfterSeconds(rateLimit: RateLimitResult) {
  return Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
}

async function readBody(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new TypeError("UNSUPPORTED_MEDIA_TYPE");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    throw new RangeError("PAYLOAD_TOO_LARGE");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new SyntaxError("INVALID_JSON");
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    const actor = getHashedRequestActor(request.headers);
    rateLimit = await getRateLimiter().check(
      `ddag:photo:${actor}`,
      PHOTO_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      const retryAfter = retryAfterSeconds(rateLimit);
      return apiError(
        "RATE_LIMITED",
        "Bạn tải ảnh hơi nhanh. Hãy thử lại sau một chút.",
        {
          status: 429,
          requestId,
          rateLimit,
          retryAfterSeconds: retryAfter,
        },
      );
    }

    const parsed = placePhotoRequestSchema.safeParse(await readBody(request));
    if (!parsed.success) {
      return apiError(
        "INVALID_PHOTO_REQUEST",
        "Yêu cầu ảnh không hợp lệ.",
        { status: 422, requestId, rateLimit },
      );
    }

    if (!hasGooglePlacesEnv()) {
      return apiError(
        "PLACES_NOT_CONFIGURED",
        "Chưa kết nối Google Places.",
        { status: 503, requestId, rateLimit },
      );
    }

    const provider = getPlaceProvider();
    const resolvedPhoto =
      "resourceName" in parsed.data
        ? undefined
        : (await provider.getPlacePhotoReferences(parsed.data.placeId, 1))[0];
    const resourceName =
      "resourceName" in parsed.data
        ? parsed.data.resourceName
        : resolvedPhoto?.resourceName;

    if (!resourceName) {
      return apiError("PHOTO_NOT_FOUND", "Quán này chưa có ảnh từ Google.", {
        status: 404,
        requestId,
        rateLimit,
      });
    }

    const [asset] = await provider.getPlacePhotos([
      {
        resourceName,
        maxWidthPx: parsed.data.maxWidthPx,
        authorAttributions: resolvedPhoto?.authorAttributions,
      },
    ]);
    if (!asset) {
      return apiError("PHOTO_NOT_FOUND", "Không tìm thấy ảnh này.", {
        status: 404,
        requestId,
        rateLimit,
      });
    }

    const photoUrl = new URL(asset.photoUri);
    if (photoUrl.protocol !== "https:") {
      throw new PlaceProviderError("Invalid photo URI.", 502, "INVALID_RESPONSE");
    }

    return apiJson(
      {
        data: {
          photoUri: photoUrl.toString(),
          ...(resolvedPhoto ? { photo: resolvedPhoto } : {}),
        },
        requestId,
      },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    if (error instanceof TypeError && error.message === "UNSUPPORTED_MEDIA_TYPE") {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Request phải sử dụng application/json.", {
        status: 415,
        requestId,
        rateLimit,
      });
    }
    if (error instanceof RangeError && error.message === "PAYLOAD_TOO_LARGE") {
      return apiError("PAYLOAD_TOO_LARGE", "Yêu cầu ảnh vượt quá giới hạn.", {
        status: 413,
        requestId,
        rateLimit,
      });
    }
    if (error instanceof SyntaxError && error.message === "INVALID_JSON") {
      return apiError("INVALID_JSON", "JSON không hợp lệ.", {
        status: 400,
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
    if (error instanceof PlaceProviderError) {
      const isTimeout = error.code === "TIMEOUT" || error.status === 504;
      return apiError(
        isTimeout ? "PHOTO_TIMEOUT" : "PHOTO_UPSTREAM_ERROR",
        isTimeout ? "Ảnh phản hồi quá lâu." : "Chưa tải được ảnh địa điểm.",
        { status: isTimeout ? 504 : 502, requestId, rateLimit },
      );
    }

    return apiError("INTERNAL_ERROR", "Đã có lỗi xảy ra khi tải ảnh.", {
      status: 500,
      requestId,
      rateLimit,
    });
  }
}
