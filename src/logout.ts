import { Request, Response, RequestHandler, type CookieOptions } from 'express';
import pool from './db';
import rateLimit from 'express-rate-limit';
import { validateSessionKey } from './usermanagement';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

const sessionCookieName = 'session';
const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd, // in dev over http, this should be false or cookie won't be sent
  sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
  path: '/',
  // domain: process.env.COOKIE_DOMAIN, // set this if you used a domain when issuing the cookie
};

// If your sessions.session_key column is BYTEA (raw sha256 bytes), set this to true.
// If it’s TEXT/VARCHAR (hex string), leave it false (default).
const SESSION_KEY_AS_BYTEA = (process.env.SESSION_KEY_AS_BYTEA || '').toLowerCase() === 'true';

const logoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 60, // limit per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many logout attempts. Please try again later.',
    });
  },
});

function clearSessionCookie(res: Response) {
  res.clearCookie(sessionCookieName, sessionCookieOptions);
}

function maskValue(value: string, showStart = 6, showEnd = 4): string {
  if (!value) return '';
  if (value.length <= showStart + showEnd) return '*'.repeat(Math.max(0, value.length));
  return `${value.slice(0, showStart)}…${value.slice(-showEnd)}`;
}

function maskHandle(handle: string): string {
  if (!handle) return '';
  if (handle.length <= 3) return `${handle[0] || ''}**`;
  return `${handle.slice(0, 2)}***`;
}

function extractTokenOnly(sessionCookie: string): string {
  const idx = sessionCookie.indexOf('|');
  return idx >= 0 ? sessionCookie.slice(0, idx) : sessionCookie;
}

function sha256ForStorage(input: string): string | Buffer {
  const hash = crypto.createHash('sha256').update(input, 'utf8').digest();
  return SESSION_KEY_AS_BYTEA ? hash : hash.toString('hex');
}

// Delete session row. Table stores a sha256 of the token (preferred).
// We try the canonical variants in order for maximum compatibility:
// 1) sha256(tokenOnly)
// 2) raw tokenOnly
// 3) sha256(full cookie)
// 4) raw full cookie
async function deleteSession(sessionCookie: string) {
  const tokenOnly = extractTokenOnly(sessionCookie);

  const attempts: Array<{ label: string; value: string | Buffer }> = [
    { label: SESSION_KEY_AS_BYTEA ? 'sha256(token)[bytea]' : 'sha256(token)[hex]', value: sha256ForStorage(tokenOnly) },
    { label: 'raw token', value: tokenOnly },
    { label: SESSION_KEY_AS_BYTEA ? 'sha256(cookie)[bytea]' : 'sha256(cookie)[hex]', value: sha256ForStorage(sessionCookie) },
    { label: 'raw cookie', value: sessionCookie },
  ];

  for (const attempt of attempts) {
    try {
      const res = await pool.query('DELETE FROM sessions WHERE session_key = $1', [attempt.value]);
      const rowCount = res.rowCount ?? 0;
      if (rowCount > 0) {
        return { method: attempt.label, rowCount };
      }
    } catch {
      // Type mismatch (e.g., Buffer vs TEXT); try the next strategy.
    }
  }

  return { method: 'none', rowCount: 0 };
}

export const logoutRequest: RequestHandler[] = [
  logoutLimiter,
  async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const sessionKey = req.cookies?.[sessionCookieName] as string | undefined;
    const currentIp = req.ip ?? '';
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'] || '';

    try {
      console.log('[logout] Attempt', {
        ip: currentIp,
        hasCookie: Boolean(sessionKey),
        userAgent: userAgent?.slice(0, 128) || '',
      });

      if (!sessionKey) {
        clearSessionCookie(res);
        console.debug('[logout] Completed with no cookie.', { durationMs: Date.now() - startedAt });
        return res.status(200).json({ success: true, message: 'Logged out.' });
      }

      const maskedKey = maskValue(sessionKey);
      const maskedTokenOnly = maskValue(extractTokenOnly(sessionKey));
      console.debug('[logout] Session cookie detected.', { maskedKey, tokenOnly: maskedTokenOnly });

      let sessionData: any = null;
      try {
        sessionData = validateSessionKey(sessionKey);
      } catch {
        sessionData = null;
      }

      const { handle = '', originalIp = '' } = (sessionData || {}) as { handle?: string; originalIp?: string };
      console.debug('[logout] Session key parsed.', {
        handle: maskHandle(handle),
        originalIp,
        currentIp,
      });

      const del = await deleteSession(sessionKey);
      console.debug('[logout] Session deletion attempted.', {
        maskedKey,
        method: del.method,
        deletedRows: del.rowCount,
      });

      clearSessionCookie(res);

      console.log('[logout] Logout successful.', {
        handle: maskHandle(handle),
        ip: currentIp,
        deletedRows: del.rowCount,
        durationMs: Date.now() - startedAt,
      });

      const payload: any = { success: true, message: 'Logged out successfully.' };
      if (!isProd) payload.deletedRows = del.rowCount;
      return res.json(payload);
    } catch (error: any) {
      console.error('[logout] Error during logout:', {
        error: error?.message || String(error),
        stack: error?.stack ? String(error.stack).split('\n').slice(0, 5).join('\n') : undefined,
      });
      clearSessionCookie(res);
      console.debug('[logout] Completed with error.', { durationMs: Date.now() - startedAt });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong.',
        ...(isProd ? {} : { error: error?.message }),
      });
    }
  },
]