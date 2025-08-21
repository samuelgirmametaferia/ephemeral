import dotenv from 'dotenv';
import path from 'path';
// Load root .env reliably even when running from dist/
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router, Request, Response } from 'express';
import { PostService } from './Post';
import pool from './db';
import { validateSessionKey } from './usermanagement';
import { createPostLimiter, likeLimiter, commentLimiter, perpetuateLimiter } from './rateLimits';
import crypto from 'crypto';

export const postRoutes = Router();

const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

// Tag validation rules
const MAX_TAGS = Number(process.env.MAX_TAGS || 5);
const MAX_TAG_LENGTH = Number(process.env.MAX_TAG_LENGTH || 30);
const TAG_ALLOWED = /^[a-z0-9_]+$/;

function normalizeAndValidateTags(input: string[]): { tags: string[]; error?: string } {
  const cleaned = input
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .map((t) => t.replace(/^#+/, '')) // strip leading '#'
    .map((t) => t.replace(/\s+/g, '_')) // collapse spaces to underscore
    .map((t) => t.toLowerCase());

  // dedupe in order
  const unique: string[] = [];
  for (const t of cleaned) {
    if (!unique.includes(t)) unique.push(t);
  }

  const limited = unique.slice(0, MAX_TAGS);

  for (const t of limited) {
    if (t.length === 0) return { tags: [], error: 'Empty tag not allowed' };
    if (t.length > MAX_TAG_LENGTH) return { tags: [], error: `Tag too long (>${MAX_TAG_LENGTH})` };
    if (!TAG_ALLOWED.test(t)) return { tags: [], error: 'Tags may only contain lowercase letters, numbers, and _' };
  }

  if (limited.length === 0) return { tags: [], error: 'At least one valid tag is required' };

  return { tags: limited };
}

// Resolve current user by session cookie -> users.id (BIGINT) + created_at
function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
function isHex64(str: string): boolean {
  return typeof str === 'string' && str.length === 64 && /^[0-9a-fA-F]+$/.test(str);
}
async function getCurrentUser(req: Request): Promise<{ id: bigint; created_at: Date } | null> {
  const cookie = (req.cookies?.session as string | undefined) || '';
  const parsed = cookie ? validateSessionKey(cookie) : null;
  if (!parsed) return null;
  const handle = parsed.handle || '';
  const candidates: string[] = [];
  if (isHex64(handle)) candidates.push(handle);
  candidates.push(sha256Hex(handle));

  const { rows } = await pool.query<{ id: string; created_at: Date }>(
    `select id, created_at from users where username = any($1::text[]) limit 1`,
    [candidates]
  );
  if (rows.length === 0) return null;
  return { id: BigInt(rows[0].id), created_at: new Date(rows[0].created_at) };
}

function parseIdListToBigint(input: string | undefined | null): bigint[] {
  if (!input) return [];
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return BigInt(s);
      } catch {
        return null;
      }
    })
    .filter((x): x is bigint => x !== null);
}

function shouldBypassPosting(req: Request, userId: bigint): boolean {
  const headerVal = String(req.header('x-ephemeral-bypass-posting') || '').toLowerCase();
  const headerBypass = !isProd && (headerVal === '1' || headerVal === 'true' || headerVal === 'yes');

  const envEnabled = (process.env.POSTING_BYPASS_ENABLE || '').toLowerCase() === 'true';
  const ids = parseIdListToBigint(process.env.POSTING_BYPASS_USER_IDS || '');
  const envBypass = envEnabled && (ids.length === 0 || ids.includes(userId));

  return headerBypass || envBypass;
}

// Create a post with tags (rate limited)
postRoutes.post('/posts', createPostLimiter, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const content = String(req.body?.content || '').trim();
    const media_url = req.body?.media_url ? String(req.body.media_url) : null;
    const rawTags: string[] = Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [];

    const { tags, error } = normalizeAndValidateTags(rawTags);
    if (error) return res.status(400).json({ error });

    const eligibility = await PostService.canUserPost(user.id, user.created_at);
    if (!eligibility.ok) {
      if (!shouldBypassPosting(req, user.id)) {
        return res.status(403).json({ error: 'Posting not allowed', reason: eligibility.reason });
      }
      res.setHeader('X-Posting-Bypass', 'true');
      if (!isProd) {
        console.warn('[POST /api/posts] Bypassing posting rules for user', String(user.id), 'Reason:', eligibility.reason);
      }
    }

    const { post, tagIds } = await PostService.createPost(user.id, content, media_url, tags);
    return res.status(201).json({ post, tags: tagIds });
  } catch (e) {
    console.error('[POST /posts] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Get a post with engagement and tags
postRoutes.get('/posts/:postId', async (req, res) => {
  try {
    const postId = BigInt(req.params.postId);
    const post = await PostService.getPostWithEngagement(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const tags = await PostService.getTagsForPost(postId);
    return res.json({ post, tags });
  } catch (e) {
    console.error('[GET /posts/:postId] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Like / Unlike (rate limited)
postRoutes.post('/posts/:postId/like', likeLimiter, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = BigInt(req.params.postId);
    if (!(await PostService.exists(postId))) return res.status(404).json({ error: 'Post not found' });
    await PostService.like(postId, user.id);
    return res.status(204).end();
  } catch (e) {
    console.error('[POST /posts/:postId/like] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

postRoutes.delete('/posts/:postId/like', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = BigInt(req.params.postId);
    await PostService.unlike(postId, user.id);
    return res.status(204).end();
  } catch (e) {
    console.error('[DELETE /posts/:postId/like] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Comments (rate limited on creation)
postRoutes.post('/posts/:postId/comments', commentLimiter, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = BigInt(req.params.postId);
    if (!(await PostService.exists(postId))) return res.status(404).json({ error: 'Post not found' });

    const content = String(req.body?.content || '').trim();
    const comment = await PostService.addComment(postId, user.id, content);
    return res.status(201).json({ comment });
  } catch (e: any) {
    if (e?.message === 'Content required' || e?.message === 'Content too long') {
      return res.status(400).json({ error: e.message });
    }
    console.error('[POST /posts/:postId/comments] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

postRoutes.get('/posts/:postId/comments', async (req, res) => {
  try {
    const postId = BigInt(req.params.postId);
    if (!(await PostService.exists(postId))) return res.status(404).json({ error: 'Post not found' });
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '50'), 10)));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10));
    const comments = await PostService.listComments(postId, limit, offset);
    return res.json({ comments, limit, offset });
  } catch (e) {
    console.error('[GET /posts/:postId/comments] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Perpetuate (algorithm-ready, rate limited)
postRoutes.post('/posts/:postId/perpetuate', perpetuateLimiter, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = BigInt(req.params.postId);
    if (!(await PostService.exists(postId))) return res.status(404).json({ error: 'Post not found' });

    const rawValue = Number(req.body?.value);
    if (!Number.isFinite(rawValue) || rawValue <= 0) return res.status(400).json({ error: 'Invalid value' });

    const result = await PostService.perpetuate(postId, user.id, rawValue, user.created_at);
    return res.status(201).json(result);
  } catch (e: any) {
    if (e?.code === 'MAX_EXCEEDED') {
      return res.status(400).json({ error: e.message, maxAllowed: e.maxAllowed });
    }
    console.error('[POST /posts/:postId/perpetuate] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});