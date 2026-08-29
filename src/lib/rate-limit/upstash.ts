import type {
  RateLimiter,
  RateLimitOptions,
  RateLimitResult,
} from "@/lib/rate-limit/types";
import { RateLimitUnavailableError } from "@/lib/rate-limit/types";

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
`;

type UpstashResponse = {
  result?: unknown;
  error?: string;
};

export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async check(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);

    try {
      const response = await this.fetchImpl(this.url.replace(/\/$/, ""), {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          RATE_LIMIT_SCRIPT,
          "1",
          key,
          String(options.windowSeconds),
        ]),
      });

      if (!response.ok) throw new RateLimitUnavailableError();
      const body = (await response.json()) as UpstashResponse;
      if (body.error || !Array.isArray(body.result)) {
        throw new RateLimitUnavailableError();
      }

      const count = Number(body.result[0]);
      const ttlSeconds = Number(body.result[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttlSeconds)) {
        throw new RateLimitUnavailableError();
      }

      return {
        allowed: count <= options.limit,
        limit: options.limit,
        remaining: Math.max(0, options.limit - count),
        resetAt: this.now() + Math.max(1, ttlSeconds) * 1000,
      };
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) throw error;
      throw new RateLimitUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}
