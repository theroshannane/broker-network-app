import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory fixed-window rate limiter. No external dependency.
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyFn = (req: Request) => req.ip ?? "unknown" } = options;
  const buckets = new Map<string, Bucket>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = keyFn(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({ error: "too many requests" });
      return;
    }

    bucket.count += 1;
    next();
  };
}
