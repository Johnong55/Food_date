import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  moveSavedPlaceSchema,
  ownedRecordIdSchema,
  type OwnedDataSuccessBody,
} from "@/features/saved/saved-contract";
import {
  assertOwnedDataConfigured,
  checkOwnedDataRateLimit,
  ownedDataRouteError,
} from "@/features/saved/api/owned-data-route";
import { apiError, apiJson, createApiHeaders } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/read-json-body";
import type { RateLimitResult } from "@/lib/rate-limit";
import {
  deleteSavedPlace,
  moveSavedPlace,
} from "@/services/saved/owned-data.service";
import type { SavedPlaceRecord } from "@/types/saved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRITE_LIMIT = { limit: 30, windowSeconds: 60 } as const;
type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext) {
  return ownedRecordIdSchema.safeParse((await context.params).id);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    const id = await parseId(context);
    if (!id.success) {
      return apiError("INVALID_SAVED_ID", "ID quán đã lưu không hợp lệ.", {
        status: 400,
        requestId,
      });
    }
    rateLimit = await checkOwnedDataRateLimit(request, "saved-write", WRITE_LIMIT);
    const parsed = moveSavedPlaceSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 1_024,
        payloadMessage: "Thông tin bộ sưu tập vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_COLLECTION", "Bộ sưu tập chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }
    assertOwnedDataConfigured();
    const data = await moveSavedPlace(id.data, parsed.data);
    return apiJson<OwnedDataSuccessBody<SavedPlaceRecord>>(
      { data, requestId },
      { status: 200, requestId, rateLimit },
    );
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    const id = await parseId(context);
    if (!id.success) {
      return apiError("INVALID_SAVED_ID", "ID quán đã lưu không hợp lệ.", {
        status: 400,
        requestId,
      });
    }
    rateLimit = await checkOwnedDataRateLimit(request, "saved-write", WRITE_LIMIT);
    assertOwnedDataConfigured();
    await deleteSavedPlace(id.data);
    return new NextResponse(null, {
      status: 204,
      headers: createApiHeaders({ status: 204, requestId, rateLimit }),
    });
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}
