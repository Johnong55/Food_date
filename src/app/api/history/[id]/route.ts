import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { ownedRecordIdSchema } from "@/features/saved/saved-contract";
import {
  assertOwnedDataConfigured,
  checkOwnedDataRateLimit,
  ownedDataRouteError,
} from "@/features/saved/api/owned-data-route";
import { apiError, createApiHeaders } from "@/lib/http/api-response";
import type { RateLimitResult } from "@/lib/rate-limit";
import { deleteHistoryRecord } from "@/services/saved/owned-data.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRITE_LIMIT = { limit: 20, windowSeconds: 60 } as const;
type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    const id = ownedRecordIdSchema.safeParse((await context.params).id);
    if (!id.success) {
      return apiError("INVALID_HISTORY_ID", "ID lần ghé không hợp lệ.", {
        status: 400,
        requestId,
      });
    }
    rateLimit = await checkOwnedDataRateLimit(request, "history-write", WRITE_LIMIT);
    assertOwnedDataConfigured();
    await deleteHistoryRecord(id.data);
    return new NextResponse(null, {
      status: 204,
      headers: createApiHeaders({ status: 204, requestId, rateLimit }),
    });
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}
