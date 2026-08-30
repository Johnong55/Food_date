import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  coupleSessionCodeSchema,
  joinCoupleSessionRequestSchema,
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
import {
  CoupleSessionServiceError,
  getCoupleSessionSnapshot,
  joinCoupleSession,
} from "@/services/couple/couple-session.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const JOIN_RATE_LIMIT = { limit: 15, windowSeconds: 600 } as const;

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
      "join",
      JOIN_RATE_LIMIT,
      "Bạn thử tham gia quá nhanh. Hãy chờ một chút.",
    );
    const parsed = joinCoupleSessionRequestSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 2_048,
        payloadMessage: "Thông tin tham gia vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_JOIN_REQUEST", "Tên hiển thị chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }

    assertCoupleBackendConfigured();
    try {
      const existing = await getCoupleSessionSnapshot(code.data, request);
      return apiJson<CoupleSessionApiSuccessBody>(
        { data: existing, requestId },
        { status: 200, requestId, rateLimit },
      );
    } catch (error) {
      if (
        !(error instanceof CoupleSessionServiceError) ||
        error.code !== "SESSION_ACCESS_REQUIRED"
      ) {
        throw error;
      }
    }

    const result = await joinCoupleSession(code.data, parsed.data.displayName);
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
