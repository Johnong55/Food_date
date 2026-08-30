import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  createSavedPlaceSchema,
  googlePlaceIdSchema,
  type OwnedDataSuccessBody,
  type SavedPlacesPayload,
} from "@/features/saved/saved-contract";
import {
  assertOwnedDataConfigured,
  checkOwnedDataRateLimit,
  ownedDataRouteError,
} from "@/features/saved/api/owned-data-route";
import { apiError, apiJson } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/read-json-body";
import type { RateLimitResult } from "@/lib/rate-limit";
import { listSavedPlaces, savePlace } from "@/services/saved/owned-data.service";
import type { SavedPlaceRecord } from "@/types/saved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const READ_LIMIT = { limit: 60, windowSeconds: 60 } as const;
const WRITE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    rateLimit = await checkOwnedDataRateLimit(request, "saved-read", READ_LIMIT);
    assertOwnedDataConfigured();
    const rawPlaceId = request.nextUrl.searchParams.get("placeId");
    const placeId = rawPlaceId ? googlePlaceIdSchema.safeParse(rawPlaceId) : undefined;
    if (placeId && !placeId.success) {
      return apiError("INVALID_PLACE_ID", "Place ID không hợp lệ.", {
        status: 400,
        requestId,
        rateLimit,
      });
    }
    const data = await listSavedPlaces(placeId?.data);
    return apiJson<OwnedDataSuccessBody<SavedPlacesPayload>>(
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
    rateLimit = await checkOwnedDataRateLimit(request, "saved-write", WRITE_LIMIT);
    const parsed = createSavedPlaceSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 2_048,
        payloadMessage: "Thông tin lưu quán vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_SAVED_PLACE", "Thông tin lưu quán chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }
    assertOwnedDataConfigured();
    const data = await savePlace(parsed.data);
    return apiJson<OwnedDataSuccessBody<SavedPlaceRecord>>(
      { data, requestId },
      { status: 201, requestId, rateLimit },
    );
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}
