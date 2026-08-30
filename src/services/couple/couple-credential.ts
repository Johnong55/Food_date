import { createHash, randomBytes } from "node:crypto";

import type { NextRequest, NextResponse } from "next/server";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createCoupleMemberToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCoupleMemberToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function coupleCredentialCookieName(code: string) {
  return `ddag_couple_${code.toLocaleLowerCase("en-US")}`;
}

export function readCoupleMemberToken(request: NextRequest, code: string) {
  const token = request.cookies.get(coupleCredentialCookieName(code))?.value;
  return token && TOKEN_PATTERN.test(token) ? token : undefined;
}

export function setCoupleMemberCookie(
  response: NextResponse,
  code: string,
  token: string,
  expiresAt: string,
) {
  response.cookies.set(coupleCredentialCookieName(code), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
    priority: "high",
  });
}
