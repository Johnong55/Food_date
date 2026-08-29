import type {
  RateLimiter,
  RateLimitOptions,
  RateLimitResult,
} from "@/lib/rate-limit/types";

type Counter = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter implements RateLimiter {
  private readonly counters = new Map<string, Counter>();
  private checks = 0;

  constructor(private readonly now: () => number = Date.now) {}

  check(key: string, options: RateLimitOptions): RateLimitResult {
    const now = this.now();
    const current = this.counters.get(key);
    const counter =
      !current || current.resetAt <= now
        ? { count: 1, resetAt: now + options.windowSeconds * 1000 }
        : { ...current, count: current.count + 1 };

    this.counters.set(key, counter);
    this.checks += 1;
    if (this.checks % 1_000 === 0) this.removeExpired(now);

    return {
      allowed: counter.count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - counter.count),
      resetAt: counter.resetAt,
    };
  }

  private removeExpired(now: number) {
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key);
    }
  }
}
