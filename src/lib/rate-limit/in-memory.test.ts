import { describe, expect, it } from "vitest";

import { InMemoryRateLimiter } from "@/lib/rate-limit/in-memory";

describe("InMemoryRateLimiter", () => {
  it("blocks after the fixed-window limit and resets afterwards", () => {
    let now = 1_000;
    const limiter = new InMemoryRateLimiter(() => now);
    const options = { limit: 2, windowSeconds: 60 };

    expect(limiter.check("actor", options).allowed).toBe(true);
    expect(limiter.check("actor", options).remaining).toBe(0);
    expect(limiter.check("actor", options).allowed).toBe(false);

    now += 60_001;
    expect(limiter.check("actor", options).allowed).toBe(true);
  });
});
