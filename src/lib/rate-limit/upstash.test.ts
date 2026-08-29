import { describe, expect, it, vi } from "vitest";

import { UpstashRateLimiter } from "@/lib/rate-limit/upstash";

describe("UpstashRateLimiter", () => {
  it("uses one atomic script and maps the Redis result", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ result: [3, 42] }),
    );
    const limiter = new UpstashRateLimiter(
      "https://example.upstash.io/",
      "test-token-that-is-long-enough",
      fetchMock,
      () => 1_000,
    );

    const result = await limiter.check("ddag:search:test", {
      limit: 10,
      windowSeconds: 60,
    });

    expect(result).toEqual({
      allowed: true,
      limit: 10,
      remaining: 7,
      resetAt: 43_000,
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as string[];
    expect(url).toBe("https://example.upstash.io");
    expect(init?.cache).toBe("no-store");
    expect(body[0]).toBe("EVAL");
    expect(body).toContain("ddag:search:test");
    expect(body).toContain("60");
  });
});
