import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { validateSessionKey, GenerateSessionkey } from './usermanagement'; // Adjust path
import pool from './db';
import crypto from 'crypto';
import net from 'net';

const isProd = process.env.NODE_ENV === 'production';
// Limit session validation checks
const sessionCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 60, // limit per IP
  message: {
    success: false,
    message: 'Too many session validation attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});



function compareSoftIp(ip1: string, ip2: string): boolean {
  if (!ip1 || !ip2) return false;

  const normalize = (ip: string) => {
    // Remove extra spaces
    ip = ip.trim();
    // Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    return ip;
  };

  ip1 = normalize(ip1);
  ip2 = normalize(ip2);

  // If either isn't a valid IP, fail
  if (net.isIP(ip1) === 0 || net.isIP(ip2) === 0) return false;

  const parts1 = ip1.split('.');
  const parts2 = ip2.split('.');

  if (parts1.length === 4 && parts2.length === 4) {
    // IPv4: Compare first two octets
    return parts1[0] === parts2[0] && parts1[1] === parts2[1];
  }

  // IPv6: Compare first two hextets
  const hex1 = ip1.split(':');
  const hex2 = ip2.split(':');
  return hex1[0] === hex2[0] && hex1[1] === hex2[1];
}


function setSessionCookie(res: Response, sessionKey: string) {
  res.cookie('session', sessionKey, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
}

// ===== Helpers for session key normalization and hashing =====
function extractTokenOnly(sessionCookie: string): string {
  if (!sessionCookie) return '';
  const idx = sessionCookie.indexOf('|');
  return idx >= 0 ? sessionCookie.slice(0, idx) : sessionCookie;
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

// New helper: detect 64-char hex (handle may already be hashed)
function isHex64(str: string): boolean {
  return typeof str === 'string' && str.length === 64 && /^[0-9a-fA-F]+$/.test(str);
}

// If your DB stores sha256(tokenOnly) in TEXT/VARCHAR (64-hex) use this when writing.
// If you stored raw tokens instead, use tokenOnly directly.
function keyForStorageFromCookie(sessionCookie: string): string {
  const tokenOnly = extractTokenOnly(sessionCookie);
  return sha256Hex(tokenOnly);
}

// ===== Delete session by cookie value (with robust fallbacks) =====
export async function deleteSessionByCookie(sessionCookie: string): Promise<{ deletedRows: number; method: string }> {
  if (!sessionCookie) return { deletedRows: 0, method: 'none' };

  const tokenOnly = extractTokenOnly(sessionCookie);
  const attempts: Array<{ method: string; value: string }> = [
    { method: 'sha256(tokenOnly)', value: sha256Hex(tokenOnly) },
    { method: 'raw tokenOnly', value: tokenOnly },
    { method: 'sha256(full cookie)', value: sha256Hex(sessionCookie) },
    { method: 'raw full cookie', value: sessionCookie },
  ];

  for (const attempt of attempts) {
    try {
      const res = await pool.query('DELETE FROM sessions WHERE session_key = $1', [attempt.value]);
      const rc = res.rowCount ?? 0;
      if (rc > 0) {
        return { deletedRows: rc, method: attempt.method };
      }
    } catch {
      // Ignore type mismatch errors and try next strategy
    }
  }

  return { deletedRows: 0, method: 'none' };
}

// Optional: delete all sessions for a given user (if you store hashed username)
export async function deleteAllSessionsForUser(handleOrHash: string, isHashed = false): Promise<number> {
  const usernameHash = isHashed ? handleOrHash : sha256Hex(handleOrHash);
  const res = await pool.query('DELETE FROM sessions WHERE username = $1', [usernameHash]);
  return res.rowCount ?? 0;
}


export const validateSession = [
  sessionCheckLimiter,
  async (req: Request, res: Response) => {
    const sessionKey = (req.cookies?.session as string | undefined) || '';
    const currentIp = req.ip ?? '';

    console.log('Session validation attempt from IP:', currentIp);

    if (!sessionKey) {
      return res.status(401).json({ success: false, message: 'No session key provided.' });
    }

    const sessionData = validateSessionKey(sessionKey);
    if (!sessionData) {
      console.log('Invalid session key');
      return res.status(401).json({ success: false, message: 'Invalid session key.' });
    }

    const { handle, originalIp } = sessionData;

    // Enforce expiration via DB using username (supports plain or pre-hashed handle in token)
    const possibleUserKeys = [sha256Hex(handle)];
    if (isHex64(handle)) possibleUserKeys.push(handle);

    const expRes = await pool.query(
      `SELECT expires_at FROM sessions WHERE username = ANY($1::text[]) ORDER BY expires_at DESC LIMIT 1`,
      [possibleUserKeys]
    );

    if ((expRes.rowCount ?? 0) === 0) {
      try { res.clearCookie('session', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' }); } catch {}
      return res.status(401).json({ success: false, message: 'Session not found.' });
    }

    const expiresAt: Date = expRes.rows[0].expires_at;
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      console.warn('Session expired by time. Logging out.');
      try { res.clearCookie('session', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' }); } catch {}
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }

    // Soft IP check
    const softIpMatch = compareSoftIp(originalIp, currentIp);

    if (!softIpMatch) {
      console.warn('IP too different. Logging out.');
      return res.status(401).json({ success: false, message: 'Session expired due to major IP change.' });
    }

    // Get plaintext handle for display
    let displayHandle = handle;
    try {
      const hRes = await pool.query<{ handle: string | null }>(
        `SELECT handle FROM users WHERE username = ANY($1::text[]) LIMIT 1`,
        [possibleUserKeys]
      );
      displayHandle = (hRes.rows?.[0]?.handle as string | undefined) || handle;
    } catch {}

    // Renew session and write storage form as sha256(tokenOnly) hex. Also extend expiration (sliding window)
    const newSessionKey = GenerateSessionkey(currentIp, handle);
    const tokenOnly = extractTokenOnly(newSessionKey);
    const storageKey = sha256Hex(tokenOnly);

    await pool.query(
      `UPDATE sessions SET session_key = $1, ip_address = $2, updated_at = NOW(), expires_at = NOW() + interval '7 days' WHERE username = ANY($3::text[])`,
      [storageKey, currentIp, possibleUserKeys]
    );

    setSessionCookie(res, newSessionKey);

    console.log(`Session renewed for user: ${displayHandle}`);
    return res.json({
      success: true,
      message: 'Session valid.',
      handle: displayHandle,
    });
  },
];