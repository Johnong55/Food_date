import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  couplePreferenceSchema,
  coupleSessionCodeSchema,
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
import { setCouplePreferences } from "@/services/couple/couple-session.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const PREFERENCE_RATE_LIMIT = { limit: 20, windowSeconds: 60 } as const;

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
      "preferences",
      PREFERENCE_RATE_LIMIT,
      "Bạn cập nhật sở thích hơi nhanh. Hãy chờ một chút.",
    );
    const parsed = couplePreferenceSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 12 * 1_024,
        payloadMessage: "Sở thích vượt quá giới hạn cho phép.",
      }),
    );
    if (!parsed.success) {
      return apiError(
        "INVALID_COUPLE_PREFERENCES",
        "Một số lựa chọn chưa hợp lệ.",
        { status: 422, requestId, rateLimit },
        parsed.error.issues.slice(0, 10).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    assertCoupleBackendConfigured();
    const data = await setCouplePreferences(code.data, request, parsed.data);
    return apiJson<CoupleSessionApiSuccessBody>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return coupleRouteError(error, requestId, rateLimit);
  }
}
