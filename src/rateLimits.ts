import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

type ReqWithCookies = Request & { cookies?: Record<string, unknown> };

const keyFromRequest: (req: Request) => string = (req) => {
  const r = req as ReqWithCookies;
  const cookieVal = typeof r.cookies?.session === 'string' ? (r.cookies.session as string) : '';
  if (cookieVal) return `sess:${cookieVal.slice(0, 64)}`;
  return `ip:${ipKeyGenerator(req as any)}`;
};

export const createPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, 
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromRequest,
  message: { error: 'Too many posts, slow down.' },
});

export const likeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromRequest,
  message: { error: 'Too many likes, slow down.' },
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromRequest,
  message: { error: 'Too many comments, slow down.' },
});

export const perpetuateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromRequest,
  message: { error: 'Too many perpetuates, slow down.' },
});