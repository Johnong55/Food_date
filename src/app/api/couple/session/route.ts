import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  createCoupleSessionRequestSchema,
  type CoupleSessionApiSuccessBody,
} from "@/features/couple/couple-contract";
import {
  assertCoupleBackendConfigured,
  checkCoupleRateLimit,
  coupleRouteError,
} from "@/features/couple/api/couple-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/read-json-body";
import type { RateLimitResult } from "@/lib/rate-limit";
import { setCoupleMemberCookie } from "@/services/couple/couple-credential";
import { createCoupleSession } from "@/services/couple/couple-session.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const CREATE_RATE_LIMIT = { limit: 5, windowSeconds: 3_600 } as const;

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;

  try {
    rateLimit = await checkCoupleRateLimit(
      request,
      "create",
      CREATE_RATE_LIMIT,
      "Bạn đã tạo khá nhiều phiên. Hãy thử lại sau.",
    );
    const parsed = createCoupleSessionRequestSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 2_048,
        payloadMessage: "Thông tin tạo phiên vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_SESSION_REQUEST", "Tên hiển thị chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }

    assertCoupleBackendConfigured();
    const result = await createCoupleSession(parsed.data.displayName);
    const response = apiJson<CoupleSessionApiSuccessBody>(
      { data: result.snapshot, requestId },
      { status: 201, requestId, rateLimit },
    );
    if (result.credential) {
      setCoupleMemberCookie(
        response,
        result.snapshot.code,
        result.credential,
        result.snapshot.expiresAt,
      );
    }
    return response;
  } catch (error) {
    return coupleRouteError(error, requestId, rateLimit);
  }
}
