import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http-error';

/** Small in-memory fixed-window limiter keyed by IP (fine for a single server instance). */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, _res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      return next(
        new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many attempts, please try again in a few minutes'),
      );
    }
    next();
  };
}
