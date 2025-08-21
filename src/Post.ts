import pool from './db';

// Utility helpers
function toBigIntString(x: bigint | number | string): string {
  if (typeof x === 'bigint') return x.toString();
  if (typeof x === 'number') return Math.trunc(x).toString();
  return x;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export type PostRow = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  perpetuate_boost: string;
  created_at: string;
  updated_at: string;
};

export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CommentWithAuthor = CommentRow & { author_handle?: string | null };

export class PostService {
  // Posting thresholds (env overridable)
  private static POSTING_UNLOCK_DAYS = parseInt(process.env.POSTING_UNLOCK_DAYS || '3', 10);
  private static MIN_COMMENTS_TO_UNLOCK = parseInt(process.env.MIN_COMMENTS_TO_UNLOCK || '3', 10);
  private static MIN_ACCOUNT_AGE_DAYS_TO_POST = parseInt(process.env.MIN_ACCOUNT_AGE_DAYS_TO_POST || '1', 10);
  private static MIN_ENGAGEMENT_SCORE_TO_POST = parseFloat(process.env.MIN_ENGAGEMENT_SCORE_TO_POST || '2.0');

  // Algorithm weights
  private static PERPETUATE_WEIGHT = parseFloat(process.env.PERPETUATE_WEIGHT || '1.0');

  // Perpetuate pricing caps (env overridable)
  private static PERP_BASE_MAX = parseFloat(process.env.PERP_BASE_MAX || '5');
  private static PERP_HARD_CAP = parseFloat(process.env.PERP_HARD_CAP || '100');

  // Engagement score over last 30 days
  // engagement_score = 0.5*likes + 1.0*comments + 1.5*perpetuates
  static async computeEngagementScore(userId: bigint): Promise<number> {
    const { rows } = await pool.query<{
      likes_count: string;
      comments_count: string;
      perpetuates_count: string;
    }>(
      `
      with win as (select now() - interval '30 days' as since)
      select
        (select count(*) from likes, win where user_id = $1 and created_at >= (select since from win))::int as likes_count,
        (select count(*) from comments, win where user_id = $1 and created_at >= (select since from win))::int as comments_count,
        (select count(*) from perpetuates, win where user_id = $1 and created_at >= (select since from win))::int as perpetuates_count
      `,
      [toBigIntString(userId)]
    );
    const r = rows[0] || { likes_count: '0', comments_count: '0', perpetuates_count: '0' };
    const likes = parseInt(r.likes_count, 10);
    const comments = parseInt(r.comments_count, 10);
    const perps = parseInt(r.perpetuates_count, 10);
    return 0.5 * likes + 1.0 * comments + 1.5 * perps;
  }

  // Unlock rule: comment count or wait X days
  static async hasUnlockedPosting(userId: bigint, accountCreatedAt: Date): Promise<boolean> {
    const ageDays = daysBetween(accountCreatedAt, new Date());
    if (ageDays >= this.POSTING_UNLOCK_DAYS) return true;
    const { rows } = await pool.query<{ cnt: string }>(
      `select count(*)::int as cnt from comments where user_id = $1`,
      [toBigIntString(userId)]
    );
    const cnt = parseInt(rows[0]?.cnt || '0', 10);
    return cnt >= this.MIN_COMMENTS_TO_UNLOCK;
  }

  static async canUserPost(userId: bigint, accountCreatedAt: Date): Promise<{ ok: boolean; reason?: string; engagementScore: number; accountAgeDays: number }> {
    const accountAgeDays = daysBetween(accountCreatedAt, new Date());
    const engagementScore = await this.computeEngagementScore(userId);

    const unlocked = await this.hasUnlockedPosting(userId, accountCreatedAt);
    if (!unlocked) {
      return { ok: false, reason: `Posting locked. Comment more or wait ${this.POSTING_UNLOCK_DAYS} days.`, engagementScore, accountAgeDays };
    }
    if (accountAgeDays < this.MIN_ACCOUNT_AGE_DAYS_TO_POST) {
      return { ok: false, reason: `Account must be at least ${this.MIN_ACCOUNT_AGE_DAYS_TO_POST} day(s) old.`, engagementScore, accountAgeDays };
    }
    if (engagementScore < this.MIN_ENGAGEMENT_SCORE_TO_POST) {
      return { ok: false, reason: `Insufficient engagement score (${this.MIN_ENGAGEMENT_SCORE_TO_POST}).`, engagementScore, accountAgeDays };
    }
    return { ok: true, engagementScore, accountAgeDays };
  }

  // Ensure post exists
  static async exists(postId: bigint): Promise<boolean> {
    const r = await pool.query(`select 1 from posts where id = $1`, [toBigIntString(postId)]);
    return (r.rowCount ?? 0) > 0;
  }

  // Tags: upsert lowercased names; return ids
  static async upsertTags(names: string[]): Promise<bigint[]> {
    if (!names || names.length === 0) return [];
    const clean = Array.from(
      new Set(
        names.map((t) => t.trim()).filter(Boolean).map((t) => t.toLowerCase())
      )
    );
    if (clean.length === 0) return [];
    await pool.query(
      `insert into tags(name) select unnest($1::text[]) on conflict (name) do nothing`,
      [clean]
    );
    const { rows } = await pool.query<{ id: string }>(
      `select id from tags where name = any($1::text[])`,
      [clean]
    );
    return rows.map((r) => BigInt(r.id));
  }

  static async attachTags(postId: bigint, tagIds: bigint[]) {
    if (!tagIds || tagIds.length === 0) return;
    await pool.query(
      `
      insert into post_tags(post_id, tag_id)
      select $1::bigint, x.tag_id
      from unnest($2::bigint[]) as x(tag_id)
      on conflict do nothing
      `,
      [toBigIntString(postId), tagIds.map(toBigIntString)]
    );
  }

  // Create post + tags (transactional)
  static async createPost(userId: bigint, content: string, mediaUrl: string | null, tags: string[]): Promise<{ post: PostRow; tagIds: bigint[] }> {
    if (!content || content.trim().length === 0) throw new Error('Content required');
    if (content.length > 5000) throw new Error('Content too long');
    if (!Array.isArray(tags) || tags.length === 0) throw new Error('At least one tag is required');

    const client = await pool.connect();
    try {
      await client.query('begin');
      const ins = await client.query<PostRow>(
        `insert into posts(user_id, content, media_url) values ($1,$2,$3) returning *`,
        [toBigIntString(userId), content.trim(), mediaUrl]
      );
      const post = ins.rows[0];
      const tagIds = await this.upsertTags(tags);
      if (tagIds.length > 0) {
        await client.query(
          `
          insert into post_tags(post_id, tag_id)
          select $1::bigint, x.tag_id
          from unnest($2::bigint[]) as x(tag_id)
          on conflict do nothing
          `,
          [post.id, tagIds.map(toBigIntString)]
        );
      }
      await client.query('commit');
      return { post, tagIds };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  // Likes
  static async like(postId: bigint, userId: bigint): Promise<void> {
    await pool.query(
      `insert into likes(post_id, user_id) values ($1,$2) on conflict (post_id, user_id) do nothing`,
      [toBigIntString(postId), toBigIntString(userId)]
    );
  }

  static async unlike(postId: bigint, userId: bigint): Promise<void> {
    await pool.query(`delete from likes where post_id = $1 and user_id = $2`, [
      toBigIntString(postId),
      toBigIntString(userId),
    ]);
  }

  // Comments
  static async addComment(postId: bigint, userId: bigint, content: string): Promise<CommentRow> {
    if (!content || content.trim().length === 0) throw new Error('Content required');
    if (content.length > 2000) throw new Error('Content too long');
    const { rows } = await pool.query<CommentRow>(
      `insert into comments(post_id, user_id, content) values ($1,$2,$3) returning *`,
      [toBigIntString(postId), toBigIntString(userId), content.trim()]
    );
    return rows[0];
  }

  static async listComments(postId: bigint, limit = 50, offset = 0): Promise<CommentWithAuthor[]> {
    const lim = Math.max(1, Math.min(100, limit | 0));
    const off = Math.max(0, offset | 0);
    const { rows } = await pool.query<CommentWithAuthor>(
      `select c.*, coalesce(u.handle, u.username) as author_handle
       from comments c
       join users u on u.id = c.user_id
       where c.post_id = $1
       order by c.created_at asc
       limit $2 offset $3`,
      [toBigIntString(postId), lim, off]
    );
    return rows;
  }

  // Compute user-specific perpetuate max
  private static computePerpetuateMax(accountAgeDays: number, commentsCount: number): number {
    const base = this.PERP_BASE_MAX; // e.g., 5
    // Every full 7 days adds +1, every 5 comments adds +1
    const ageBonus = Math.floor(accountAgeDays / 7);
    const commentBonus = Math.floor(commentsCount / 5);
    const max = base + ageBonus + commentBonus;
    return Math.min(this.PERP_HARD_CAP, Math.max(base, max));
  }

  // Perpetuates (algorithm-ready)
  // trust_score = min(1, account_age_days/14) * engagement_factor; engagement_factor = min(1, engagementScore/5)
  static computeTrustScore(accountAgeDays: number, engagementFactor: number): number {
    const ageFactor = Math.min(1, accountAgeDays / 14);
    return ageFactor * Math.min(1, Math.max(0, engagementFactor));
  }

  static async perpetuate(postId: bigint, userId: bigint, rawValue: number, accountCreatedAt: Date): Promise<{ trustScore: number; trustValue: number; maxAllowed: number }> {
    if (!Number.isFinite(rawValue) || rawValue <= 0) throw new Error('Invalid value');

    // Derive factors
    const engagementScore = await this.computeEngagementScore(userId);
    const engagementFactor = Math.min(1, engagementScore / 5);
    const accountAgeDays = daysBetween(accountCreatedAt, new Date());

    // Count total comments (lifetime)
    const { rows: commentRows } = await pool.query<{ cnt: string }>(
      `select count(*)::int as cnt from comments where user_id = $1`,
      [toBigIntString(userId)]
    );
    const commentsCount = parseInt(commentRows[0]?.cnt || '0', 10);

    // Enforce max allowed based on age + comments
    const maxAllowed = this.computePerpetuateMax(accountAgeDays, commentsCount);
    if (rawValue > maxAllowed) {
      const err: any = new Error(`Perpetuate exceeds your max (${maxAllowed}).`);
      err.code = 'MAX_EXCEEDED';
      err.maxAllowed = maxAllowed;
      throw err;
    }

    const trustScore = this.computeTrustScore(accountAgeDays, engagementFactor);
    const trustValue = rawValue * trustScore;

    const client = await pool.connect();
    try {
      await client.query('begin');

      const { rows } = await client.query<{ prev_trust_value: string }>(
        `
        with prev as (
          select trust_value from perpetuates where post_id = $1 and user_id = $2
        ),
        upsert as (
          insert into perpetuates(post_id, user_id, value, trust_value)
          values ($1, $2, $3, $4)
          on conflict (post_id, user_id)
          do update set value = excluded.value, trust_value = excluded.trust_value, created_at = now()
          returning (select trust_value from prev) as prev_trust_value
        )
        select coalesce(prev_trust_value, 0.0) as prev_trust_value from upsert
        `,
        [toBigIntString(postId), toBigIntString(userId), rawValue, trustValue]
      );

      const prev = parseFloat(rows[0]?.prev_trust_value || '0');
      const delta = trustValue - prev;

      if (delta !== 0) {
        await client.query(
          `update posts set perpetuate_boost = perpetuate_boost + $1 where id = $2`,
          [delta, toBigIntString(postId)]
        );
      }

      // Activity bump: extend account retention by marking last_used now
      await client.query(`update users set last_used = now() where id = $1`, [toBigIntString(userId)]);

      await client.query('commit');
      return { trustScore, trustValue, maxAllowed };
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  // Read a post with engagement aggregates
  static async getPostWithEngagement(postId: bigint) {
    const { rows } = await pool.query(
      `
      select p.*,
             (select count(*) from likes where post_id = p.id) as likes_count,
             (select count(*) from comments where post_id = p.id) as comments_count,
             (select coalesce(sum(trust_value),0) from perpetuates where post_id = p.id) as trust_sum
      from posts p
      where p.id = $1
      `,
      [toBigIntString(postId)]
    );
    return rows[0] || null;
  }

  static async getTagsForPost(postId: bigint) {
    const { rows } = await pool.query(
      `select t.* from tags t join post_tags pt on pt.tag_id = t.id where pt.post_id = $1`,
      [toBigIntString(postId)]
    );
    return rows;
  }
}