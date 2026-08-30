import { describe, expect, it } from "vitest";

import {
  coupleCredentialCookieName,
  createCoupleMemberToken,
  hashCoupleMemberToken,
} from "@/services/couple/couple-credential";

describe("couple member credentials", () => {
  it("creates a 256-bit base64url token and only persists a SHA-256 hash", () => {
    const token = createCoupleMemberToken();
    const hash = hashCoupleMemberToken(token);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("uses a bounded session-specific cookie name", () => {
    expect(coupleCredentialCookieName("AB12CD")).toBe("ddag_couple_ab12cd");
  });
});
