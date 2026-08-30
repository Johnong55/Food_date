import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  coupleSessionCodeSchema,
  coupleSwipeRequestSchema,
  type CoupleSwipeApiSuccessBody,
} from "@/features/couple/couple-contract";
import {
  assertCoupleBackendConfigured,
  checkCoupleRateLimit,
  coupleRouteError,
} from "@/features/couple/api/couple-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/read-json-body";
import type { RateLimitResult } from "@/lib/rate-limit";
import { recordCoupleSwipe } from "@/services/couple/couple-swipe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const SWIPE_RATE_LIMIT = { limit: 60, windowSeconds: 60 } as const;

type RouteContext = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    const code = coupleSessionCodeSchema.safeParse((await context.params).code);
    if (!code.success) {
      return apiError("INVALID_SESSION_CODE", "Mã phiên không hợp lệ.", {
        status: 400,
        requestId,
      });
    }
    rateLimit = await checkCoupleRateLimit(
      request,
      "swipe",
      SWIPE_RATE_LIMIT,
      "Bạn vuốt hơi nhanh. Hãy chờ một chút.",
    );
    const parsed = coupleSwipeRequestSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 2_048,
        payloadMessage: "Lựa chọn vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_SWIPE", "Lựa chọn quán chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }

    assertCoupleBackendConfigured();
    const data = await recordCoupleSwipe(code.data, request, parsed.data);
    return apiJson<CoupleSwipeApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return coupleRouteError(error, requestId, rateLimit);
  }
}
