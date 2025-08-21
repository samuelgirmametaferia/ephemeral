import { Request, Response } from 'express';

import { validateSessionKey, GenerateSessionkey } from "./usermanagement";
import pool from './db';
import net from 'net';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';

// Use secure cookies only in production
const isProd = process.env.NODE_ENV === 'production';

// --- Multer storage for avatars ---
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars');
    try {
      console.log('[multer:avatarStorage.destination] Target dir:', dir);
      if (!fs.existsSync(dir)) {
        console.log('[multer:avatarStorage.destination] Dir missing, creating...');
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    } catch (err) {
      console.error('[multer:avatarStorage.destination] Error ensuring dir:', err);
      cb(err as Error, dir);
    }
  },
  filename: (req, file, cb) => {
    try {
      const randomName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      const finalName = `${randomName}${ext}`;
      console.log('[multer:avatarStorage.filename] Original:', file.originalname, '-> Stored as:', finalName);
      cb(null, finalName);
    } catch (err) {
      console.error('[multer:avatarStorage.filename] Error generating filename:', err);
      cb(err as Error, file.originalname);
    }
  }
});

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB upload limit
  fileFilter: (req, file, cb) => {
    try {
      console.log('[multer:uploadAvatar.fileFilter] Incoming file:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: (file as any).size ?? 'unknown'
      });
      if (file.mimetype.startsWith('image/')) {
        console.log('[multer:uploadAvatar.fileFilter] Accepted as image/*');
        cb(null, true);
      } else {
        console.warn('[multer:uploadAvatar.fileFilter] Rejected non-image file, mimetype:', file.mimetype);
        cb(new Error('Only image files allowed'));
      }
    } catch (err) {
      console.error('[multer:uploadAvatar.fileFilter] Error in fileFilter:', err);
      cb(new Error('File filter error'));
    }
  }
}).single('avatar'); // expecting field name 'avatar'

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars');
    try {
      console.log('[multer:uploadStorage.destination] Target dir:', dir);
      if (!fs.existsSync(dir)) {
        console.log('[multer:uploadStorage.destination] Dir missing, creating...');
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    } catch (err) {
      console.error('[multer:uploadStorage.destination] Error ensuring dir:', err);
      cb(err as Error, dir);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate a random 16-byte hex string
      const randomName = crypto.randomBytes(16).toString('hex');
      // Preserve the file extension
      const ext = path.extname(file.originalname);
      const finalName = `${randomName}${ext}`;
      console.log('[multer:uploadStorage.filename] Original:', file.originalname, '-> Stored as:', finalName);
      cb(null, finalName);
    } catch (err) {
      console.error('[multer:uploadStorage.filename] Error generating filename:', err);
      cb(err as Error, file.originalname);
    }
  }
});

function compareSoftIp(ip1: string, ip2: string): boolean {
  console.log('[compareSoftIp] Raw inputs:', { ip1, ip2 });
  if (!ip1 || !ip2) {
    console.warn('[compareSoftIp] One or both IPs are empty.');
    return false;
  }

  // In development, skip strict IP checks to avoid localhost (::1 vs 127.0.0.1) issues.
  if (!isProd) {
    console.log('[compareSoftIp] Skipping IP comparison in development.');
    return true;
  }

  const normalize = (ip: string) => {
    let n = ip.trim();
    if (n.startsWith('::ffff:')) n = n.replace('::ffff:', '');
    if (n === '::1') n = '127.0.0.1';
    return n;
  };

  let n1 = normalize(ip1);
  let n2 = normalize(ip2);
  console.log('[compareSoftIp] Normalized:', { n1, n2 });

  // Treat loopback ranges as equivalent
  const isLoopback = (n: string) => n === '127.0.0.1' || n.startsWith('127.') || n === '::1';
  if (isLoopback(n1) && isLoopback(n2)) return true;

  if (net.isIP(n1) === 0 || net.isIP(n2) === 0) {
    console.warn('[compareSoftIp] One or both normalized values are not valid IPs.');
    return false;
  }

  const parts1 = n1.split('.');
  const parts2 = n2.split('.');

  if (parts1.length === 4 && parts2.length === 4) {
    const match = parts1[0] === parts2[0] && parts1[1] === parts2[1];
    console.log('[compareSoftIp] IPv4 compare first two octets:', parts1.slice(0, 2), parts2.slice(0, 2), '->', match);
    return match;
  }

  const hex1 = n1.split(':');
  const hex2 = n2.split(':');
  const match = hex1[0] === hex2[0] && hex1[1] === hex2[1];
  console.log('[compareSoftIp] IPv6 compare first two hextets:', hex1.slice(0, 2), hex2.slice(0, 2), '->', match);
  return match;
}

function extractTokenOnly(sessionCookie: string): string {
  if (!sessionCookie) {
    console.warn('[extractTokenOnly] Empty sessionCookie.');
    return '';
  }
  const idx = sessionCookie.indexOf('|');
  const token = idx >= 0 ? sessionCookie.slice(0, idx) : sessionCookie;
  const masked = token ? `${token.slice(0, 8)}...(${token.length} chars)` : '';
  console.log('[extractTokenOnly] Extracted tokenOnly (masked):', masked);
  return token;
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function setSessionCookie(res: Response, sessionKey: string) {
  const masked = sessionKey ? `${sessionKey.slice(0, 8)}...(${sessionKey.length} chars)` : '';
  console.log('[setSessionCookie] Setting session cookie. Key (masked):', masked);
  res.cookie('session', sessionKey, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
  console.log('[setSessionCookie] Cookie set with httpOnly:true, secure:' + isProd + ', sameSite:' + (isProd ? 'strict' : 'lax') + ', maxAge:7d, path:/');
}

// New helper: detect 64-char hex (possible pre-hashed handle/username)
function isHex64(str: string): boolean {
  const result = typeof str === 'string' && str.length === 64 && /^[0-9a-fA-F]+$/.test(str);
  console.log('[isHex64] Input is 64-hex?', result);
  return result;
}

export async function validateSessionCallable(
  req: Request,
  res: Response
): Promise<{ success: boolean; message: string; handle?: string }> {
  console.log('--- validateSessionCallable START ---');
  const sessionKey = (req.cookies?.session as string | undefined) || '';
  const maskedKey = sessionKey ? `${sessionKey.slice(0, 8)}...(${sessionKey.length} chars)` : '';
  const currentIp = req.ip ?? '';
  console.log('[validateSessionCallable] Session cookie (masked):', maskedKey);
  console.log('[validateSessionCallable] Client IP:', currentIp);

  if (!sessionKey) {
    console.warn('[validateSessionCallable] No session key provided.');
    return { success: false, message: 'No session key provided.' };
  }

  const sessionData = validateSessionKey(sessionKey);
  console.log('[validateSessionCallable] Session data:', sessionData);
  if (!sessionData) {
    console.warn('[validateSessionCallable] Invalid session key.');
    return { success: false, message: 'Invalid session key.' };
  }

  const { handle, originalIp } = sessionData;
  console.log('[validateSessionCallable] Session handle:', handle, 'Original IP:', originalIp);
  if (!compareSoftIp(originalIp, currentIp)) {
    console.warn('[validateSessionCallable] IP mismatch. Session expired.');
    return { success: false, message: 'Session expired due to major IP change.' };
  }

  const tokenOnly = extractTokenOnly(sessionKey);
  const usernameHash = sha256Hex(handle);
  const possibleUserKeys = [usernameHash];
  if (isHex64(handle)) {
    possibleUserKeys.push(handle);
  }
  console.log('[validateSessionCallable] Possible user keys for DB:', possibleUserKeys);

  let expireCheck;
  try {
    console.log('[validateSessionCallable] Querying session expiry with keys:', possibleUserKeys);
    expireCheck = await pool.query(
      `SELECT expires_at FROM sessions WHERE username = ANY($1::text[]) ORDER BY expires_at DESC LIMIT 1`,
      [possibleUserKeys]
    );
    console.log('[validateSessionCallable] DB expireCheck result:', expireCheck.rows);
  } catch (err) {
    console.error('[validateSessionCallable] DB error on expireCheck:', err);
    return { success: false, message: 'Session validation error.' };
  }

  if ((expireCheck.rowCount ?? 0) === 0) {
    console.warn('[validateSessionCallable] Session not found in DB.');
    try {
      res.clearCookie('session', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' });
      console.log('[validateSessionCallable] Cleared session cookie (not found in DB).');
    } catch (err) {
      console.error('[validateSessionCallable] Error clearing cookie:', err);
    }
    return { success: false, message: 'Session not found.' };
  }

  const expiresAt: Date = expireCheck.rows[0].expires_at;
  console.log('[validateSessionCallable] Session expires at:', expiresAt);
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    console.warn('[validateSessionCallable] Session expired.');
    try {
      res.clearCookie('session', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' });
      console.log('[validateSessionCallable] Cleared expired session cookie.');
    } catch (err) {
      console.error('[validateSessionCallable] Error clearing cookie:', err);
    }
    return { success: false, message: 'Session expired.' };
  }

  const newSessionKey = GenerateSessionkey(currentIp, handle);
  const newTokenOnly = extractTokenOnly(newSessionKey);
  const storageKey = sha256Hex(newTokenOnly);

  console.log('[validateSessionCallable] Renewing session with storageKey (sha256 of tokenOnly):', storageKey);

  try {
    const updateRes = await pool.query(
      `UPDATE sessions
         SET session_key = $1,
             ip_address = $2,
             updated_at = NOW(),
             expires_at = NOW() + interval '7 days'
       WHERE username = ANY($3::text[])`,
      [storageKey, currentIp, possibleUserKeys]
    );
    console.log('[validateSessionCallable] Session row(s) updated:', updateRes.rowCount);
  } catch (err) {
    console.error('[validateSessionCallable] DB error on session update:', err);
    return { success: false, message: 'Session renewal error.' };
  }

  setSessionCookie(res, newSessionKey);

  console.log('[validateSessionCallable] Session validated successfully for handle:', handle);
  console.log('--- validateSessionCallable END ---');
  return { success: true, message: 'Session valid.', handle };
}

// --- Updated handleObjectRequest ---
export function handleObjectRequest(ObjectName: string) {
  console.log('[handleObjectRequest] Registered handler for ObjectName:', ObjectName);
  return async (req: Request, res: Response) => {
    console.log(`[handleObjectRequest:${ObjectName}] START - Method: ${req.method} URL: ${req.originalUrl}`);
    const session = await validateSessionCallable(req, res);
    if (!session.success || !session.handle) {
      console.warn(`[handleObjectRequest:${ObjectName}] Unauthorized - Reason: ${session.message}`);
      return res.status(401).json({ error: session.message });
    }
    console.log(`[handleObjectRequest:${ObjectName}] Authenticated as handle:`, session.handle);

    switch (ObjectName) {
      case 'profile': {
        if (req.method === 'GET') {
          try {
            const targetHandle = (req.query.handle as string) || session.handle;
            const editable = targetHandle === session.handle;
            console.log('[profile:GET] targetHandle:', targetHandle, 'editable:', editable);
            const profileHTML = await FetchProfile(targetHandle, editable);
            console.log('[profile:GET] HTML length:', profileHTML?.length ?? 0);
            return res.send(profileHTML);
          } catch (err) {
            console.error('[profile:GET] Error fetching profile:', err);
            return res.status(500).send('<div class="profile-dialog"><p>Failed to load profile.</p></div>');
          }
        }

        if (req.method === 'POST') {
          console.log('[profile:POST] Starting avatar/bio update.');
          uploadAvatar(req, res, async (err) => {
            if (err) {
              console.error('[profile:POST] Multer/upload error:', err);
              return res.status(400).json({ success: false, message: (err as Error).message });
            }

            try {
              const { bio } = req.body as { bio?: string };
              // Determine current user row key
              let handle = session.handle ?? '';
              const hashedUsername = sha256Hex(handle);
              console.log('[profile:POST] Updating users row for username (sha256(handle)):', hashedUsername);

              // Fetch current avatar to delete if replaced
              let oldAvatarUrl = '' as string;
              try {
                const cur = await pool.query(`SELECT avatar_url FROM users WHERE username = $1`, [hashedUsername]);
                oldAvatarUrl = (cur.rows?.[0]?.avatar_url as string) || '';
              } catch (e) {
                console.warn('[profile:POST] Could not fetch current avatar_url:', e);
              }

              // Process new avatar if provided: resize to 256x256, convert to WebP, quality 75
              let avatarUrl = '';
              if (req.file && req.file.buffer) {
                const avatarsDir = path.join(__dirname, '../uploads/avatars');
                if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
                const randomName = crypto.randomBytes(16).toString('hex');
                const finalName = `${randomName}.webp`;
                const destPath = path.join(avatarsDir, finalName);

                console.log('[profile:POST] Compressing and saving avatar to:', destPath);
                await sharp(req.file.buffer)
                  .rotate() // auto-orient
                  .resize({ width: 256, height: 256, fit: 'cover' })
                  .toFormat('webp', { quality: 75 })
                  .toFile(destPath);

                avatarUrl = `/uploads/avatars/${finalName}`;

                // If a new avatar was uploaded, attempt to delete the old one
                if (oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
                  try {
                    const normalized = path.normalize(path.join(__dirname, '..', oldAvatarUrl.replace(/^\/+/, '')));
                    const avatarsDirAbs = path.join(__dirname, '../uploads/avatars');
                    if (normalized.startsWith(avatarsDirAbs)) {
                      await fs.promises.unlink(normalized).catch(() => {});
                      console.log('[profile:POST] Deleted old avatar file:', normalized);
                    } else {
                      console.warn('[profile:POST] Skipping deletion of unexpected path:', normalized);
                    }
                  } catch (delErr) {
                    console.warn('[profile:POST] Failed to delete old avatar:', delErr);
                  }
                }
              }

              console.log('[profile:POST] Incoming body:', { bioLength: (bio || '').length });
              console.log('[profile:POST] Uploaded file buffer size:', req.file ? req.file.size : 'none');

              const updateRes = await pool.query(
                `UPDATE users
                 SET bio = $1, avatar_url = COALESCE($2, avatar_url)
                 WHERE username = $3`,
                [bio || '', avatarUrl || null, hashedUsername]
              );
              console.log('[profile:POST] Users update rowCount:', updateRes.rowCount);

              // Redirect back to index page after successful upload/update
              return res.redirect(303, '/');
            } catch (e) {
              console.error('[profile:POST] Error updating profile:', e);
              return res.status(500).json({ success: false, message: 'Failed to update profile.' });
            }
          });
          return;
        }

        console.warn('[profile] Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
      }

      default:
        console.warn('[handleObjectRequest] Unknown object:', ObjectName);
        return res.status(400).json({ error: 'Unknown object' });
    }
  };
}
// Utility helpers placed near FetchProfile for clarity.
function escapeHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateUTC(input: unknown): string {
  const d = input ? new Date(input as any) : null;
  if (!d || isNaN(d.getTime())) return '';
  // Example: 2025-08-13 17:40:30 UTC
  return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

async function FetchProfile(handle: string, editable: boolean) {
  console.log('--- FetchProfile START ---');
  console.log('[FetchProfile] Requested handle:', handle, 'editable:', editable);

  try {
    const key = sha256Hex(handle);
    console.log('[FetchProfile] Querying user by username (sha256(handle)):', key);

    const userRes = await pool.query(
      `SELECT username, handle, bio, avatar_url, created_at FROM users WHERE username = $1`,
      [key]
    );

    console.log('[FetchProfile] DB user rowCount:', userRes.rowCount);

    if (userRes.rowCount === 0) {
      console.warn('[FetchProfile] User not found in DB.');
      return `<div class="profile-dialog"><p>User not found.</p></div>`;
    }

    const { username, handle: hashedHandle, bio, avatar_url, created_at } = userRes.rows[0];
    console.log('[FetchProfile] Fetched user:', {
      username,
      hashedHandle,
      bioLength: (bio || '').length,
      avatar_url,
      created_at
    });

    const safeHandle = escapeHTML(handle || '');
    const initial = safeHandle.charAt(0) || '?';
    const safeBioHTML = escapeHTML(bio || '').replace(/\n/g, '<br>');
    const createdAtDisplay = formatDateUTC(created_at);
    const safeAvatarUrl = avatar_url ? escapeHTML(avatar_url) : '../uploads/avatars/default-avatar.png';
    const safeBioText = escapeHTML(bio || '');

    console.log('[FetchProfile] Computed render values:', {
      safeHandle,
      initial,
      createdAtDisplay,
      bioHTMLLength: safeBioHTML.length,
      hasAvatar: Boolean(safeAvatarUrl)
    });

    // Keep editable upload option if this is the account owner.
    const avatarUploadSection = editable
      ? `
        <form id="avatarForm" method="post" action="/profile" enctype="multipart/form-data" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
          <label>Bio</label>
          <textarea name="bio" rows="4" style="width:100%;max-width:500px;">${safeBioText}</textarea>
          <label>Avatar</label>
          <input type="file" name="avatar" accept="image/*" />
          <button type="submit">Save Profile</button>
        </form>
      `
      : '';

    const html = `
    <div class="post-header">
      <div class="author-info">
        ${safeAvatarUrl ? `<img class="author-avatar" src="${safeAvatarUrl}" alt="Avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : `<div class="author-circle">${initial}</div>`}
        <div class="post-author">${safeHandle}</div>
      </div>
      <div class="post-date">${createdAtDisplay}</div>
    </div>

    <div class="post-content">${safeBioHTML}</div>
    ${avatarUploadSection}
    `;

    console.log('[FetchProfile] Built HTML length:', html.length);
    console.log('--- FetchProfile END ---');
    return html;
  } catch (err) {
    console.error('[FetchProfile] Error fetching profile:', err);
    console.log('--- FetchProfile END (error) ---');
    return `<div class="profile-dialog"><p>Failed to load profile.</p></div>`;
  }
}