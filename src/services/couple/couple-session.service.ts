import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  storedCouplePreferenceSchema,
  type CouplePreferenceRequest,
} from "@/features/couple/couple-contract";
import { intersectCouplePreferences } from "@/features/couple/couple-intersection";
import { HO_CHI_MINH_AREAS } from "@/features/discovery/constants";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCoupleMemberToken,
  hashCoupleMemberToken,
  readCoupleMemberToken,
} from "@/services/couple/couple-credential";
import type {
  CouplePreference,
  CoupleSessionSnapshot,
  CoupleSessionStatus,
  StoredCouplePreference,
} from "@/types/couple";

const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const coupleSessionRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  status: z.enum([
    "collecting_preferences",
    "swiping",
    "matched",
    "completed",
    "expired",
  ]),
  expires_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});

const memberRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  preferences_json: z.unknown(),
  joined_at: z.string(),
});

const rpcMembershipSchema = z.object({
  session_id: z.uuid(),
  member_id: z.uuid(),
  expires_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});

export class CoupleSessionServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(code);
    this.name = "CoupleSessionServiceError";
  }
}

function generateSessionCode(length = 6) {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (byte) => SESSION_CODE_ALPHABET[byte % SESSION_CODE_ALPHABET.length],
  ).join("");
}

export function coupleDatabaseError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (message.includes("session_not_found")) {
    return new CoupleSessionServiceError(
      "SESSION_NOT_FOUND",
      404,
      "Không tìm thấy phiên couple này.",
    );
  }
  if (message.includes("session_expired")) {
    return new CoupleSessionServiceError(
      "SESSION_EXPIRED",
      410,
      "Phiên couple đã hết hạn.",
    );
  }
  if (message.includes("session_full")) {
    return new CoupleSessionServiceError(
      "SESSION_FULL",
      409,
      "Phiên này đã đủ hai người.",
    );
  }
  if (message.includes("session_closed")) {
    return new CoupleSessionServiceError(
      "SESSION_CLOSED",
      409,
      "Phiên đã bắt đầu và không thể nhận thêm thành viên.",
    );
  }
  if (message.includes("session_not_ready")) {
    return new CoupleSessionServiceError(
      "SESSION_NOT_READY",
      409,
      "Cả hai cần hoàn tất sở thích trước khi bắt đầu vuốt.",
    );
  }
  if (message.includes("invalid_candidate_set")) {
    return new CoupleSessionServiceError(
      "INVALID_CANDIDATE_SET",
      422,
      "Danh sách quán đề xuất chưa hợp lệ.",
    );
  }
  if (message.includes("invalid_candidate")) {
    return new CoupleSessionServiceError(
      "INVALID_CANDIDATE",
      422,
      "Quán này không thuộc bộ lựa chọn hiện tại.",
    );
  }
  if (message.includes("membership_invalid")) {
    return new CoupleSessionServiceError(
      "MEMBERSHIP_INVALID",
      401,
      "Bạn không còn quyền truy cập phiên này.",
    );
  }
  return new CoupleSessionServiceError(
    "COUPLE_DATABASE_ERROR",
    503,
    "Couple Mode đang tạm thời không khả dụng.",
  );
}

function parseStoredPreference(value: unknown): StoredCouplePreference | undefined {
  const parsed = storedCouplePreferenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function toPublicPreference(value: StoredCouplePreference): CouplePreference {
  return {
    cuisines: value.cuisines,
    budgetMaxPerPerson: value.budgetMaxPerPerson,
    radiusMeters: value.radiusMeters,
    minRating: value.minRating,
    minReviewCount: value.minReviewCount,
    moods: value.moods,
    options: value.options,
    location: value.location,
  };
}

async function optionalAuthenticatedUserId() {
  if (!hasSupabaseEnv()) return undefined;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.getUser();
  return error ? undefined : data.user?.id;
}

export async function loadCoupleSession(code: string) {
  const client = createAdminSupabaseClient();
  const query = await client
    .from("couple_sessions")
    .select("id,code,status,expires_at")
    .eq("code", code)
    .maybeSingle();
  if (query.error) throw coupleDatabaseError(query.error);
  const parsed = coupleSessionRowSchema.safeParse(query.data);
  if (!parsed.success) {
    throw new CoupleSessionServiceError(
      "SESSION_NOT_FOUND",
      404,
      "Không tìm thấy phiên couple này.",
    );
  }
  if (new Date(parsed.data.expires_at).getTime() <= Date.now()) {
    await client
      .from("couple_sessions")
      .update({ status: "expired" })
      .eq("id", parsed.data.id);
    throw new CoupleSessionServiceError(
      "SESSION_EXPIRED",
      410,
      "Phiên couple đã hết hạn.",
    );
  }
  return parsed.data;
}

export async function loadCoupleSnapshotByMember(
  session: z.infer<typeof coupleSessionRowSchema>,
  ownMemberId: string,
): Promise<CoupleSessionSnapshot> {
  const client = createAdminSupabaseClient();
  const query = await client
    .from("session_members")
    .select("id,display_name,preferences_json,joined_at")
    .eq("session_id", session.id)
    .order("joined_at", { ascending: true })
    .limit(2);
  if (query.error) throw coupleDatabaseError(query.error);
  const members = z.array(memberRowSchema).safeParse(query.data ?? []);
  if (!members.success) throw coupleDatabaseError({});
  const own = members.data.find((member) => member.id === ownMemberId);
  if (!own) {
    throw new CoupleSessionServiceError(
      "MEMBERSHIP_INVALID",
      401,
      "Bạn không còn quyền truy cập phiên này.",
    );
  }
  const partner = members.data.find((member) => member.id !== ownMemberId);
  const ownPreference = parseStoredPreference(own.preferences_json);
  const partnerPreference = partner
    ? parseStoredPreference(partner.preferences_json)
    : undefined;
  const intersection =
    ownPreference && partnerPreference
      ? intersectCouplePreferences(
          toPublicPreference(ownPreference),
          toPublicPreference(partnerPreference),
        )
      : undefined;

  return {
    code: session.code.toUpperCase(),
    status: session.status as CoupleSessionStatus,
    expiresAt: new Date(session.expires_at).toISOString(),
    shareUrl: new URL(`/join/${session.code.toUpperCase()}`, getSiteUrl()).toString(),
    memberCount: members.data.length,
    own: {
      displayName: own.display_name ?? "Bạn",
      preferenceSubmitted: Boolean(ownPreference),
      ...(ownPreference ? { preferences: toPublicPreference(ownPreference) } : {}),
    },
    ...(partner
      ? {
          partner: {
            displayName: partner.display_name ?? "Người ấy",
            preferenceSubmitted: Boolean(partnerPreference),
          },
        }
      : {}),
    ...(intersection ? { intersection } : {}),
  };
}

export async function authorizeCoupleMember(
  code: string,
  request: NextRequest,
): Promise<{
    session: z.infer<typeof coupleSessionRowSchema>;
  memberId: string;
}> {
  const session = await loadCoupleSession(code);
  const client = createAdminSupabaseClient();
  const userId = await optionalAuthenticatedUserId();

  if (userId) {
    const member = await client
      .from("session_members")
      .select("id")
      .eq("session_id", session.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (member.error) throw coupleDatabaseError(member.error);
    if (typeof member.data?.id === "string") {
      return { session, memberId: member.data.id };
    }
  }

  const token = readCoupleMemberToken(request, code);
  if (token) {
    const credential = await client
      .from("session_member_credentials")
      .select("member_id,expires_at,revoked_at")
      .eq("token_hash", hashCoupleMemberToken(token))
      .maybeSingle();
    if (credential.error) throw coupleDatabaseError(credential.error);
    if (
      typeof credential.data?.member_id === "string" &&
      credential.data.revoked_at === null &&
      new Date(String(credential.data.expires_at)).getTime() > Date.now()
    ) {
      const member = await client
        .from("session_members")
        .select("id")
        .eq("id", credential.data.member_id)
        .eq("session_id", session.id)
        .maybeSingle();
      if (member.error) throw coupleDatabaseError(member.error);
      if (typeof member.data?.id === "string") {
        return { session, memberId: member.data.id };
      }
    }
  }

  throw new CoupleSessionServiceError(
    "SESSION_ACCESS_REQUIRED",
    401,
    "Hãy tham gia phiên trước khi xem nội dung.",
  );
}

export async function createCoupleSession(
  displayName: string,
): Promise<{
  snapshot: CoupleSessionSnapshot;
  credential?: string;
}> {
  const client = createAdminSupabaseClient();
  const userId = await optionalAuthenticatedUserId();
  const guestId = userId ? undefined : randomUUID();
  const credential = guestId ? createCoupleMemberToken() : undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateSessionCode();
    const result = await client.rpc("create_couple_session", {
      p_code: code,
      p_creator_user_id: userId ?? null,
      p_creator_guest_id: guestId ?? null,
      p_display_name: displayName,
      p_token_hash: credential ? hashCoupleMemberToken(credential) : null,
    });
    if (result.error?.code === "23505") continue;
    if (result.error) throw coupleDatabaseError(result.error);
    const membership = rpcMembershipSchema.safeParse(result.data?.[0]);
    if (!membership.success) throw coupleDatabaseError({});
    const session = await loadCoupleSession(code);
    return {
      snapshot: await loadCoupleSnapshotByMember(session, membership.data.member_id),
      credential,
    };
  }

  throw new CoupleSessionServiceError(
    "SESSION_CODE_EXHAUSTED",
    503,
    "Chưa tạo được mã phiên. Hãy thử lại.",
  );
}

export async function joinCoupleSession(
  code: string,
  displayName: string,
): Promise<{
  snapshot: CoupleSessionSnapshot;
  credential?: string;
}> {
  const client = createAdminSupabaseClient();
  const userId = await optionalAuthenticatedUserId();
  const guestId = userId ? undefined : randomUUID();
  const credential = guestId ? createCoupleMemberToken() : undefined;
  const result = await client.rpc("join_couple_session", {
    p_code: code,
    p_user_id: userId ?? null,
    p_guest_id: guestId ?? null,
    p_display_name: displayName,
    p_token_hash: credential ? hashCoupleMemberToken(credential) : null,
  });
  if (result.error) throw coupleDatabaseError(result.error);
  const membership = rpcMembershipSchema.safeParse(result.data?.[0]);
  if (!membership.success) throw coupleDatabaseError({});
  const session = await loadCoupleSession(code);
  return {
    snapshot: await loadCoupleSnapshotByMember(session, membership.data.member_id),
    credential,
  };
}

export async function getCoupleSessionSnapshot(
  code: string,
  request: NextRequest,
) {
  const { session, memberId } = await authorizeCoupleMember(code, request);
  return loadCoupleSnapshotByMember(session, memberId);
}

export async function setCouplePreferences(
  code: string,
  request: NextRequest,
  preference: CouplePreferenceRequest,
) {
  const { session, memberId } = await authorizeCoupleMember(code, request);
  const approvedArea = HO_CHI_MINH_AREAS.find(
    (area) => area.id === preference.location.id,
  );
  if (!approvedArea) {
    throw new CoupleSessionServiceError(
      "INVALID_COUPLE_LOCATION",
      422,
      "Khu vực Couple Mode chưa được hỗ trợ.",
    );
  }
  const stored: StoredCouplePreference = {
    ...preference,
    location: { ...approvedArea, source: "manual" },
    version: 1,
    submittedAt: new Date().toISOString(),
  };
  const client = createAdminSupabaseClient();
  const result = await client.rpc("set_couple_member_preferences", {
    p_session_id: session.id,
    p_member_id: memberId,
    p_preferences: stored,
  });
  if (result.error) throw coupleDatabaseError(result.error);
  return loadCoupleSnapshotByMember(await loadCoupleSession(code), memberId);
}
