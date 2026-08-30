import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";

import type { CoupleSwipeRequest } from "@/features/couple/couple-contract";
import { hasGooglePlacesEnv } from "@/lib/env/server";
import { haversineDistanceMeters } from "@/lib/geo/distance";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildCoupleCandidateSearch } from "@/services/couple/couple-candidate-search";
import { buildPrivateSwipeState } from "@/services/couple/couple-match";
import {
  authorizeCoupleMember,
  coupleDatabaseError,
  CoupleSessionServiceError,
  loadCoupleSession,
  loadCoupleSnapshotByMember,
} from "@/services/couple/couple-session.service";
import { searchRestaurants } from "@/services/discovery/search-restaurants";
import { getPlaceProvider } from "@/services/places";
import { PlaceProviderError } from "@/services/places/place-provider";
import type {
  CoupleMatchesSnapshot,
  CoupleSwipeDeck,
  CoupleSwipeResult,
  CoupleSwipeState,
} from "@/types/couple";
import type { PlaceSummary } from "@/types/place";

const candidateRowSchema = z.object({
  google_place_id: z.string().min(1).max(512),
  google_result_position: z.number().int().nonnegative(),
});

const swipeRowSchema = z.object({
  member_id: z.uuid(),
  google_place_id: z.string().min(1).max(512),
  decision: z.enum(["left", "right", "super_like"]),
});

const initializeRpcSchema = z.object({
  google_place_ids: z.array(z.string().min(1).max(512)).min(1).max(10),
  candidate_count: z.number().int().min(1).max(10),
});

const swipeRpcSchema = z.object({
  matched: z.boolean(),
  session_status: z.enum([
    "collecting_preferences",
    "swiping",
    "matched",
    "completed",
    "expired",
  ]),
  own_swipe_count: z.number().int().nonnegative(),
  candidate_count: z.number().int().nonnegative(),
});

function providerError(error: unknown) {
  if (error instanceof PlaceProviderError) {
    return new CoupleSessionServiceError(
      "PLACES_UNAVAILABLE",
      error.status >= 500 ? 503 : error.status,
      "Google Places đang tạm thời không trả được bộ quán. Hãy thử lại.",
    );
  }
  return error;
}

async function loadSwipeState(
  sessionId: string,
  memberId: string,
): Promise<CoupleSwipeState> {
  const client = createAdminSupabaseClient();
  const [candidateQuery, swipeQuery] = await Promise.all([
    client
      .from("session_candidates")
      .select("google_place_id,google_result_position")
      .eq("session_id", sessionId)
      .order("google_result_position", { ascending: true }),
    client
      .from("swipes")
      .select("member_id,google_place_id,decision")
      .eq("session_id", sessionId),
  ]);
  if (candidateQuery.error) throw coupleDatabaseError(candidateQuery.error);
  if (swipeQuery.error) throw coupleDatabaseError(swipeQuery.error);

  const candidates = z.array(candidateRowSchema).safeParse(candidateQuery.data ?? []);
  const swipes = z.array(swipeRowSchema).safeParse(swipeQuery.data ?? []);
  if (!candidates.success || !swipes.success) throw coupleDatabaseError({});

  const candidateIds = candidates.data.map((candidate) => candidate.google_place_id);
  return buildPrivateSwipeState(
    candidateIds,
    swipes.data.map((swipe) => ({
      memberId: swipe.member_id,
      googlePlaceId: swipe.google_place_id,
      decision: swipe.decision,
    })),
    memberId,
  );
}

async function recoverMissingPlaces(
  placeIds: string[],
  knownPlaces: Map<string, PlaceSummary>,
  center: { latitude: number; longitude: number },
) {
  const provider = getPlaceProvider();
  for (let index = 0; index < placeIds.length; index += 3) {
    const batch = placeIds.slice(index, index + 3);
    const details = await Promise.all(
      batch.map((placeId) =>
        provider.getPlaceDetails(placeId, {
          includeReviews: false,
          includeAttributes: false,
        }),
      ),
    );
    details.forEach((place) => {
      knownPlaces.set(place.id, {
        ...place,
        distanceMeters: haversineDistanceMeters(center, place.location),
      });
    });
  }
}

export async function createCoupleSwipeDeck(
  code: string,
  request: NextRequest,
): Promise<CoupleSwipeDeck> {
  if (!hasGooglePlacesEnv()) {
    throw new CoupleSessionServiceError(
      "PLACES_NOT_CONFIGURED",
      503,
      "Cần cấu hình Google Places trước khi tạo bộ quán.",
    );
  }

  const { session, memberId } = await authorizeCoupleMember(code, request);
  const snapshot = await loadCoupleSnapshotByMember(session, memberId);
  if (!snapshot.intersection) {
    throw new CoupleSessionServiceError(
      "SESSION_NOT_READY",
      409,
      "Cả hai cần hoàn tất sở thích trước khi bắt đầu vuốt.",
    );
  }
  if (!snapshot.intersection.hasCuisineMatch) {
    throw new CoupleSessionServiceError(
      "NO_SHARED_CUISINE",
      409,
      "Hai bạn cần chọn ít nhất một loại món chung.",
    );
  }

  try {
    const searchInput = buildCoupleCandidateSearch(snapshot.intersection);
    const searchResult = await searchRestaurants(searchInput, getPlaceProvider());
    if (searchResult.places.length === 0) {
      throw new CoupleSessionServiceError(
        "NO_COUPLE_CANDIDATES",
        404,
        "Không tìm được quán giữ nguyên toàn bộ bộ lọc chung. Hãy chỉnh sở thích.",
      );
    }

    const client = createAdminSupabaseClient();
    const initialized = await client.rpc("initialize_couple_candidates", {
      p_session_id: session.id,
      p_member_id: memberId,
      p_google_place_ids: searchResult.places.map((place) => place.id),
    });
    if (initialized.error) throw coupleDatabaseError(initialized.error);
    const canonical = initializeRpcSchema.safeParse(initialized.data?.[0]);
    if (!canonical.success) throw coupleDatabaseError({});

    const placesById = new Map(
      searchResult.places.map((place) => [place.id, place] as const),
    );
    const missingIds = canonical.data.google_place_ids.filter(
      (placeId) => !placesById.has(placeId),
    );
    if (missingIds.length > 0) {
      await recoverMissingPlaces(
        missingIds,
        placesById,
        snapshot.intersection.location.coordinates,
      );
    }

    const state = await loadSwipeState(session.id, memberId);
    const places = canonical.data.google_place_ids.flatMap((placeId, position) => {
      const place = placesById.get(placeId);
      return place ? [{ ...place, googleResultPosition: position }] : [];
    });
    return {
      ...state,
      places,
      budgetVerification: "unavailable",
      googleOrderPreserved: true,
    };
  } catch (error) {
    throw providerError(error);
  }
}

export async function recordCoupleSwipe(
  code: string,
  request: NextRequest,
  swipe: CoupleSwipeRequest,
): Promise<CoupleSwipeResult> {
  const { session, memberId } = await authorizeCoupleMember(code, request);
  const client = createAdminSupabaseClient();
  const result = await client.rpc("record_couple_swipe", {
    p_session_id: session.id,
    p_member_id: memberId,
    p_google_place_id: swipe.googlePlaceId,
    p_decision: swipe.decision,
  });
  if (result.error) throw coupleDatabaseError(result.error);
  const recorded = swipeRpcSchema.safeParse(result.data?.[0]);
  if (!recorded.success) throw coupleDatabaseError({});
  const state = await loadSwipeState(session.id, memberId);
  return {
    ...state,
    decision: swipe.decision,
    matched: recorded.data.matched,
    ...(recorded.data.matched ? { matchedPlaceId: swipe.googlePlaceId } : {}),
    status: recorded.data.session_status,
  };
}

export async function getCoupleMatches(
  code: string,
  request: NextRequest,
): Promise<CoupleMatchesSnapshot> {
  const { session, memberId } = await authorizeCoupleMember(code, request);
  const state = await loadSwipeState(session.id, memberId);
  const currentSession = await loadCoupleSession(code);
  return {
    candidateCount: state.candidateCount,
    ownSwipeCount: state.ownSwipeCount,
    matchedPlaceIds: state.matchedPlaceIds,
    status: currentSession.status,
  };
}
