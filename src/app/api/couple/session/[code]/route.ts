import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  coupleSessionCodeSchema,
  type CoupleSessionApiSuccessBody,
} from "@/features/couple/couple-contract";
import {
  assertCoupleBackendConfigured,
  checkCoupleRateLimit,
  coupleRouteError,
} from "@/features/couple/api/couple-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import type { RateLimitResult } from "@/lib/rate-limit";
import { getCoupleSessionSnapshot } from "@/services/couple/couple-session.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const READ_RATE_LIMIT = { limit: 60, windowSeconds: 60 } as const;

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
      "read",
      READ_RATE_LIMIT,
      "Bạn tải trạng thái phiên hơi nhanh. Hãy chờ một chút.",
    );
    assertCoupleBackendConfigured();
    const data = await getCoupleSessionSnapshot(code.data, request);
    return apiJson<CoupleSessionApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return coupleRouteError(error, requestId, rateLimit);
  }
}
