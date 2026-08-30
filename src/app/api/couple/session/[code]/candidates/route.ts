import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  coupleSessionCodeSchema,
  type CoupleSwipeDeckApiSuccessBody,
} from "@/features/couple/couple-contract";
import {
  assertCoupleBackendConfigured,
  checkCoupleRateLimit,
  coupleRouteError,
} from "@/features/couple/api/couple-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import type { RateLimitResult } from "@/lib/rate-limit";
import { createCoupleSwipeDeck } from "@/services/couple/couple-swipe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CANDIDATE_RATE_LIMIT = { limit: 10, windowSeconds: 300 } as const;

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
      "candidates",
      CANDIDATE_RATE_LIMIT,
      "Bạn tải bộ quán hơi nhanh. Hãy chờ một chút.",
    );
    assertCoupleBackendConfigured();
    const data = await createCoupleSwipeDeck(code.data, request);
    return apiJson<CoupleSwipeDeckApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return coupleRouteError(error, requestId, rateLimit);
  }
}
