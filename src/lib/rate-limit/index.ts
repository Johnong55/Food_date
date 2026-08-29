import "server-only";

import { getOptionalUpstashEnv } from "@/lib/env/server";
import { InMemoryRateLimiter } from "@/lib/rate-limit/in-memory";
import type { RateLimiter } from "@/lib/rate-limit/types";
import { UpstashRateLimiter } from "@/lib/rate-limit/upstash";

const globalRateLimit = globalThis as typeof globalThis & {
  ddagRateLimiter?: RateLimiter;
};

export function getRateLimiter() {
  if (globalRateLimit.ddagRateLimiter) {
    return globalRateLimit.ddagRateLimiter;
  }

  const upstash = getOptionalUpstashEnv();
  globalRateLimit.ddagRateLimiter = upstash
    ? new UpstashRateLimiter(upstash.url, upstash.token)
    : new InMemoryRateLimiter();

  return globalRateLimit.ddagRateLimiter;
}

export type {
  RateLimiter,
  RateLimitOptions,
  RateLimitResult,
} from "@/lib/rate-limit/types";
export { RateLimitUnavailableError } from "@/lib/rate-limit/types";
