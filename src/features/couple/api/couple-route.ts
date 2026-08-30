import "server-only";

import type { NextRequest } from "next/server";

import { hasSupabaseAdminEnv } from "@/lib/env/server";
import { apiError } from "@/lib/http/api-response";
import { getHashedRequestActor } from "@/lib/http/request-actor";
import { JsonBodyError } from "@/lib/http/read-json-body";
import {
  getRateLimiter,
  RateLimitUnavailableError,
  type RateLimitOptions,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { CoupleSessionServiceError } from "@/services/couple/couple-session.service";

export class CoupleRateLimitError extends Error {
  constructor(
    readonly result: RateLimitResult,
    readonly publicMessage: string,
  ) {
    super("RATE_LIMITED");
    this.name = "CoupleRateLimitError";
  }
}

export function assertCoupleBackendConfigured() {
  if (!hasSupabaseAdminEnv()) {
    throw new CoupleSessionServiceError(
      "COUPLE_NOT_CONFIGURED",
      503,
      "Couple Mode cần cấu hình Supabase trước khi sử dụng.",
    );
  }
}

export async function checkCoupleRateLimit(
  request: NextRequest,
  bucket: string,
  options: RateLimitOptions,
  publicMessage: string,
) {
  const actor = getHashedRequestActor(request.headers);
  const result = await getRateLimiter().check(`ddag:couple:${bucket}:${actor}`, options);
  if (!result.allowed) throw new CoupleRateLimitError(result, publicMessage);
  return result;
}

function retryAfterSeconds(result: RateLimitResult) {
  return Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000));
}

export function coupleRouteError(
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
  if (error instanceof CoupleRateLimitError) {
    return apiError("RATE_LIMITED", error.publicMessage, {
      status: 429,
      requestId,
      rateLimit: error.result,
      retryAfterSeconds: retryAfterSeconds(error.result),
    });
  }
  if (error instanceof RateLimitUnavailableError) {
    return apiError(
      "RATE_LIMIT_UNAVAILABLE",
      "Hệ thống bảo vệ đang tạm thời không khả dụng.",
      { status: 503, requestId, retryAfterSeconds: 30 },
    );
  }
  if (error instanceof CoupleSessionServiceError) {
    return apiError(error.code, error.publicMessage, {
      status: error.status,
      requestId,
      rateLimit,
    });
  }
  return apiError("INTERNAL_ERROR", "Đã có lỗi xảy ra trong Couple Mode.", {
    status: 500,
    requestId,
    rateLimit,
  });
}
