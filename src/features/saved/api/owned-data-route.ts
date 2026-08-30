import "server-only";

import type { NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env/server";
import { apiError } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import { JsonBodyError } from "@/lib/http/read-json-body";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitOptions,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { OwnedDataServiceError } from "@/services/saved/owned-data.service";

export class OwnedDataRateLimitError extends Error {
  constructor(
    readonly result: RateLimitResult,
    readonly publicMessage: string,
  ) {
    super("RATE_LIMITED");
    this.name = "OwnedDataRateLimitError";
  }
}

export function assertOwnedDataConfigured() {
  if (!hasSupabaseEnv()) {
    throw new OwnedDataServiceError(
      "SUPABASE_NOT_CONFIGURED",
      503,
      "Cần cấu hình Supabase để dùng dữ liệu cá nhân.",
    );
  }
}

export async function checkOwnedDataRateLimit(
  request: NextRequest,
  bucket: string,
  options: RateLimitOptions,
) {
  const actor = getHashedRequestActor(request.headers);
  const result = await getRateLimiter().check(`ddag:owned:${bucket}:${actor}`, options);
  if (!result.allowed) {
    throw new OwnedDataRateLimitError(
      result,
      "Bạn thao tác hơi nhanh. Hãy chờ một chút.",
    );
  }
  return result;
}

function retryAfterSeconds(result: RateLimitResult) {
  return Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000));
}

export function ownedDataRouteError(
  error: unknown,
  requestId: string,
  rateLimit?: RateLimitResult,
) {
  if (error instanceof JsonBodyError) {
    return apiError(error.code, error.message, {
      status: error.status,
      requestId,
      rateLimit,
    });
  }
  if (error instanceof OwnedDataRateLimitError) {
    return apiError("RATE_LIMITED", error.publicMessage, {
      status: 429,
      requestId,
      rateLimit: error.result,
      retryAfterSeconds: retryAfterSeconds(error.result),
    });
  }
  if (error instanceof RateLimitUnavailableError) {
    return apiError("RATE_LIMIT_UNAVAILABLE", "Hệ thống bảo vệ đang tạm gián đoạn.", {
      status: 503,
      requestId,
      retryAfterSeconds: 30,
    });
  }
  if (error instanceof OwnedDataServiceError) {
    return apiError(error.code, error.publicMessage, {
      status: error.status,
      requestId,
      rateLimit,
    });
  }
  return apiError("INTERNAL_ERROR", "Đã có lỗi với dữ liệu cá nhân.", {
    status: 500,
    requestId,
    rateLimit,
  });
}
