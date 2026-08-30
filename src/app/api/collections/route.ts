import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  createCollectionSchema,
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
import {
  createCollection,
  listSavedPlaces,
} from "@/services/saved/owned-data.service";
import type { SavedCollection } from "@/types/saved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_LIMIT = { limit: 60, windowSeconds: 60 } as const;
const WRITE_LIMIT = { limit: 20, windowSeconds: 60 } as const;

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  let rateLimit: RateLimitResult | undefined;
  try {
    rateLimit = await checkOwnedDataRateLimit(request, "collection-read", READ_LIMIT);
    assertOwnedDataConfigured();
    const { collections } = await listSavedPlaces();
    return apiJson<OwnedDataSuccessBody<Pick<SavedPlacesPayload, "collections">>>(
      { data: { collections }, requestId },
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
    rateLimit = await checkOwnedDataRateLimit(request, "collection-write", WRITE_LIMIT);
    const parsed = createCollectionSchema.safeParse(
      await readJsonBody(request, {
        maxBytes: 2_048,
        payloadMessage: "Thông tin bộ sưu tập vượt quá giới hạn.",
      }),
    );
    if (!parsed.success) {
      return apiError("INVALID_COLLECTION", "Tên bộ sưu tập chưa hợp lệ.", {
        status: 422,
        requestId,
        rateLimit,
      });
    }
    assertOwnedDataConfigured();
    const data = await createCollection(parsed.data);
    return apiJson<OwnedDataSuccessBody<SavedCollection>>(
      { data, requestId },
      { status: 201, requestId, rateLimit },
    );
  } catch (error) {
    return ownedDataRouteError(error, requestId, rateLimit);
  }
}
