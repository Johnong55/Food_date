import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  coupleSessionCodeSchema,
  type CoupleMatchesApiSuccessBody,
} from "@/features/couple/couple-contract";
import {
  assertCoupleBackendConfigured,
  checkCoupleRateLimit,
  coupleRouteError,
} from "@/features/couple/api/couple-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import type { RateLimitResult } from "@/lib/rate-limit";
import { getCoupleMatches } from "@/services/couple/couple-swipe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MATCH_RATE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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
      "matches",
      MATCH_RATE_LIMIT,
      "Bạn kiểm tra match hơi nhanh. Hãy chờ một chút.",
    );
    assertCoupleBackendConfigured();
    const data = await getCoupleMatches(code.data, request);
    return apiJson<CoupleMatchesApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return coupleRouteError(error, requestId, rateLimit);
  }
}
