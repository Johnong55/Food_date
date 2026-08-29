export type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export interface RateLimiter {
  check(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> | RateLimitResult;
}

export class RateLimitUnavailableError extends Error {
  constructor(message = "Rate limit service is unavailable.") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}
