import { NextResponse } from "next/server";

import type { ApiErrorBody } from "@/features/discovery/search-contract";
import type { RateLimitResult } from "@/lib/rate-limit";

type ApiResponseOptions = {
  status: number;
  requestId: string;
  rateLimit?: RateLimitResult;
  retryAfterSeconds?: number;
};

export function createApiHeaders(options: ApiResponseOptions) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Request-Id": options.requestId,
  });

  if (options.rateLimit) {
    headers.set("X-RateLimit-Limit", String(options.rateLimit.limit));
    headers.set("X-RateLimit-Remaining", String(options.rateLimit.remaining));
    headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(options.rateLimit.resetAt / 1000)),
    );
  }
  if (options.retryAfterSeconds) {
    headers.set("Retry-After", String(options.retryAfterSeconds));
  }

  return headers;
}

export function apiJson<T>(body: T, options: ApiResponseOptions) {
  return NextResponse.json(body, {
    status: options.status,
    headers: createApiHeaders(options),
  });
}

export function apiError(
  code: string,
  message: string,
  options: ApiResponseOptions,
  details?: ApiErrorBody["error"]["details"],
) {
  return apiJson<ApiErrorBody>(
    {
      error: {
        code,
        message,
        requestId: options.requestId,
        ...(details?.length ? { details } : {}),
      },
    },
    options,
  );
}
