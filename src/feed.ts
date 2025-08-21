import dotenv from 'dotenv';
import path from 'path';
// Load root .env reliably even when running from dist/
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router, Request, Response } from 'express';
import pool from './db';
import crypto from 'crypto';
import { validateSessionKey } from './usermanagement';

export const feedRoutes = Router();

// Tunables (env overridable)
const INTEREST_FACTOR = parseFloat(process.env.INTEREST_FACTOR || '0.2');
const SIMILAR_CREATOR_BONUS = parseFloat(process.env.SIMILAR_CREATOR_BONUS || '1');
const DECAY_FACTOR = parseFloat(process.env.DECAY_FACTOR || '1.2');
const PERPETUATE_WEIGHT = parseFloat(process.env.PERPETUATE_WEIGHT || '3.0');

// Helpers (duplicated from postRoutes for now)
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

// GET /api/feed/me - Personalized feed for the logged-in user
feedRoutes.get('/feed/me', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '25'), 10)));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10));

    const { rows } = await pool.query<any>(
      `
      with
      like_tags as (
        select pt.tag_id, count(*)::int as cnt
        from likes l
        join post_tags pt on pt.post_id = l.post_id
        where l.user_id = $1::bigint
        group by pt.tag_id
      ),
      comment_tags as (
        select pt.tag_id, count(*)::int as cnt
        from comments c
        join post_tags pt on pt.post_id = c.post_id
        where c.user_id = $1::bigint
        group by pt.tag_id
      ),
      perp_tags as (
        select pt.tag_id, count(*)::int as cnt
        from perpetuates p
        join post_tags pt on pt.post_id = p.post_id
        where p.user_id = $1::bigint
        group by pt.tag_id
      ),
      user_tag_interest as (
        select tag_id, sum(weight) as weight
        from (
          select tag_id, (cnt * 1)::int as weight from like_tags
          union all
          select tag_id, (cnt * 2)::int as weight from comment_tags
          union all
          select tag_id, (cnt * 3)::int as weight from perp_tags
        ) s
        group by tag_id
      ),
      base as (
        select
          p.id,
          p.user_id,
          coalesce(u.handle, u.username) as author_handle,
          p.content,
          p.media_url,
          p.created_at,
          -- aggregates
          (select count(*) from likes where post_id = p.id) as likes_count,
          (select count(*) from comments where post_id = p.id) as comments_count,
          (select coalesce(sum(trust_value),0) from perpetuates where post_id = p.id) as trust_sum,
          coalesce((
            select sum(uti.weight)
            from post_tags pt
            left join user_tag_interest uti on uti.tag_id = pt.tag_id
            where pt.post_id = p.id
          ), 0) as interest_sum,
          exists (
            select 1 from posts p2
            where p2.user_id = p.user_id
            and (
              exists (select 1 from likes l where l.user_id = $1::bigint and l.post_id = p2.id)
              or exists (select 1 from comments c where c.user_id = $1::bigint and c.post_id = p2.id)
              or exists (select 1 from perpetuates pr where pr.user_id = $1::bigint and pr.post_id = p2.id)
            )
          ) as similar_creator,
          exists (select 1 from likes l2 where l2.post_id = p.id and l2.user_id = $1::bigint) as user_liked
        from posts p
        join users u on u.id = p.user_id
      ),
      scored as (
        select
          b.*,
          extract(epoch from (now() - b.created_at))/3600.0 as age_hours,
          (
            (b.likes_count * 1.0)
            + (b.comments_count * 1.5)
            + (b.trust_sum * $4::double precision)
            + (b.interest_sum * $2::double precision)
            + (case when b.similar_creator then $3::double precision else 0 end)
            - pow(extract(epoch from (now() - b.created_at))/3600.0, $5::double precision)
          ) as score
        from base b
      )
      select * from scored
      order by score desc nulls last
      limit $6 offset $7
      `,
      [user.id.toString(), INTEREST_FACTOR, SIMILAR_CREATOR_BONUS, PERPETUATE_WEIGHT, DECAY_FACTOR, limit, offset]
    );

    return res.json({ posts: rows, limit, offset });
  } catch (e) {
    console.error('[GET /api/feed/me] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feed/trending - Site-wide trending feed
feedRoutes.get('/feed/trending', async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '25'), 10)));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10));

    // Try to personalize "liked" state if a session exists
    const user = await getCurrentUser(req).catch(() => null);
    const userId = user ? user.id.toString() : null;

    const { rows } = await pool.query<any>(
      `
      select
        p.*, coalesce(u.handle, u.username) as author_handle,
        (select count(*) from likes where post_id = p.id) as likes_count,
        (select count(*) from comments where post_id = p.id) as comments_count,
        (select coalesce(sum(trust_value),0) from perpetuates where post_id = p.id) as trust_sum,
        extract(epoch from (now() - p.created_at))/3600.0 as age_hours,
        (
          ((select count(*) from likes where post_id = p.id) * 1.5)
          + ((select count(*) from comments where post_id = p.id) * 2.0)
          + ((select coalesce(sum(trust_value),0) from perpetuates where post_id = p.id) * $1::double precision)
          - pow(extract(epoch from (now() - p.created_at))/3600.0, $2::double precision)
        ) as score,
        (l.user_id is not null) as user_liked
      from posts p
      join users u on u.id = p.user_id
      left join likes l on l.post_id = p.id and l.user_id = $5::bigint
      order by score desc nulls last
      limit $3 offset $4
      `,
      [PERPETUATE_WEIGHT, DECAY_FACTOR, limit, offset, userId]
    );

    return res.json({ posts: rows, limit, offset });
  } catch (e) {
    console.error('[GET /api/feed/trending] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
