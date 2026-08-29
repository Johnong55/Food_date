import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  menuResolveRequestSchema,
  type MenuApiSuccessBody,
} from "@/features/menu/menu-contract";
import { toMenuPlaceContext } from "@/features/menu/menu-place-context";
import { hasGooglePlacesEnv } from "@/lib/env/server";
import { apiError, apiJson } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitResult,
} from "@/lib/rate-limit";
import {
  resolveOfficialWebsiteMenu,
  resolveStoredMenu,
} from "@/services/menu-resolver";
import { getPlaceProvider } from "@/services/places";
import { PlaceProviderError } from "@/services/places/place-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;

const MAX_BODY_BYTES = 2 * 1_024;
const MENU_RESOLVE_RATE_LIMIT = { limit: 3, windowSeconds: 600 } as const;

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
      "Dữ liệu yêu cầu vượt quá giới hạn cho phép.",
    );
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    throw new RequestBodyError(
      "PAYLOAD_TOO_LARGE",
      413,
      "Dữ liệu yêu cầu vượt quá giới hạn cho phép.",
    );
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new RequestBodyError("INVALID_JSON", 400, "JSON không hợp lệ.");
  }
}

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
    "Chưa thể xác minh website chính thức của quán.",
    { status: 502, requestId, rateLimit },
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    const actor = getHashedRequestActor(request.headers);
    rateLimit = await getRateLimiter().check(
      `ddag:menu-resolve:${actor}`,
      MENU_RESOLVE_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMITED",
        "Bạn vừa kiểm tra menu. Hãy chờ một chút rồi thử lại.",
        {
          status: 429,
          requestId,
          rateLimit,
          retryAfterSeconds: retryAfterSeconds(rateLimit),
        },
      );
    }

    const parsed = menuResolveRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return apiError("INVALID_MENU_REQUEST", "Place ID không hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }

    const storedResolution = await resolveStoredMenu(parsed.data.placeId);
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
      return apiError(
        "PLACES_NOT_CONFIGURED",
        "Chưa kết nối Google Places để xác minh website chính thức.",
        { status: 503, requestId, rateLimit },
      );
    }

    const place = await getPlaceProvider().getPlaceDetails(parsed.data.placeId, {
      languageCode: "vi",
      regionCode: "VN",
      includeReviews: false,
      includeAttributes: false,
    });
    const placeContext = toMenuPlaceContext(place);

    if (!placeContext.websiteUri) {
      return apiJson<MenuApiSuccessBody>(
        {
          data: {
            resolution: {
              status: "unavailable",
              attempts: [
                ...storedResolution.attempts,
                {
                  provider: "official_website",
                  status: "miss",
                  reason: "official_website_missing",
                },
              ],
            },
            place: placeContext,
            canResolveOfficialWebsite: false,
          },
          requestId,
        },
        { status: 200, requestId, rateLimit },
      );
    }

    const officialResolution = await resolveOfficialWebsiteMenu(
      parsed.data.placeId,
      placeContext.websiteUri,
    );
    const resolution =
      officialResolution.status === "resolved"
        ? {
            ...officialResolution,
            attempts: [
              ...storedResolution.attempts,
              ...officialResolution.attempts,
            ],
          }
        : {
            status: "unavailable" as const,
            attempts: [
              ...storedResolution.attempts,
              ...officialResolution.attempts,
            ],
          };

    return apiJson<MenuApiSuccessBody>(
      {
        data: {
          resolution,
          place: placeContext,
          canResolveOfficialWebsite: false,
        },
        requestId,
      },
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
        "Hệ thống bảo vệ đang tạm thời không khả dụng.",
        { status: 503, requestId, retryAfterSeconds: 30 },
      );
    }
    if (error instanceof PlaceProviderError && rateLimit) {
      return mapPlaceError(error, requestId, rateLimit);
    }
    return apiError("INTERNAL_ERROR", "Đã có lỗi xảy ra khi tìm menu.", {
      status: 500,
      requestId,
      rateLimit,
    });
  }
}
