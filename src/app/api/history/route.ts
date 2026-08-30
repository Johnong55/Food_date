import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  createHistoryRecordSchema,
  type HistoryPayload,
  type OwnedDataSuccessBody,
} from "@/features/saved/saved-contract";
import {
  assertOwnedDataConfigured,
  checkOwnedDataRateLimit,
  ownedDataRouteError,
} from "@/features/saved/api/owned-data-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/read-json-body";
import type { RateLimitResult } from "@/lib/rate-limit";
import {
  createHistoryRecord,
  listHistory,
} from "@/services/saved/owned-data.service";
import type { PlaceHistoryRecord } from "@/types/saved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_LIMIT = { limit: 60, windowSeconds: 60 } as const;
const WRITE_LIMIT = { limit: 20, windowSeconds: 60 } as const;

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    rateLimit = await checkOwnedDataRateLimit(request, "history-read", READ_LIMIT);
    assertOwnedDataConfigured();
    const data = await listHistory();
    return apiJson<OwnedDataSuccessBody<HistoryPayload>>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    rateLimit = await checkOwnedDataRateLimit(request, "history-write", WRITE_LIMIT);
    const parsed = createHistoryRecordSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 8 * 1_024,
        payloadMessage: "Ghi chú chuyến đi vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_HISTORY", "Thông tin lần ghé chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }
    assertOwnedDataConfigured();
    const data = await createHistoryRecord(parsed.data);
    return apiJson<OwnedDataSuccessBody<PlaceHistoryRecord>>(
      { data, requestId },
      { status: 201, requestId, rateLimit },
    );
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}
