# Ephemeral

A small social app prototype with sessions, profiles, posts, likes, comments, WebP media uploads, and a personalized feed powered by a simple ranking algorithm.

## Features

- Auth/session
  - Cookie-based session with renewal; dev-friendly cookie flags.
- Profile
  - Avatar upload (auto-compressed to WebP) and bio editing.
  - Replaces old avatar on new upload and deletes avatar on account cleanup.
- Posts
  - Image/video upload endpoint; images converted to WebP.
  - Tags normalized client/server-side; limits on count/length.
  - Likes, comments, and “perpetuate” action wired to UI and backend.
- Feed
  - Personalized “For you” feed scored by interests, engagement, trust, and time decay.
  - Trending feed variant.
- Frontend
  - UI components in public/js/uiHandler.js with a toast system for errors.
  - Feed renderer in public/js/feed.js uses createPost from uiHandler.
- Security
  - Helmet with CSP, JSON BigInt handling, and static serving locked to uploads.

## Architecture

- App server (Express, TypeScript)
  - src/index.ts: main server, security, routes mounting.
  - src/tools.ts: profile rendering, session helpers.
  - src/uploadRoutes.ts: post media uploads (WebP compression).
  - src/feed.ts: feed endpoints and scoring.
  - src/sessionmanger.ts: rate-limited session helpers.
- Data/media server (optional)
  - src/dataServer.ts: /upload/post and /media serving (also compresses images).
- Domain
  - src/Post.ts: DB access helpers for posts.
- Frontend
  - public/js/uiHandler.js: components, createPost, toasts, modals.
  - public/js/feed.js: fetch and render feed, infinite scroll.
  - public assets and styles.

## Requirements

- Node 18+
- PostgreSQL 14+
- Linux/macOS (Windows should work with minor changes)
- ffmpeg optional (future video transcode)

## Environment

Create .env in project root:

```
PORT=4000
DATA_SERVER_PORT=5000
DATA_SERVER_ORIGIN=http://localhost:5000
NODE_ENV=development

# Feed tuning
INTEREST_FACTOR=0.2
SIMILAR_CREATOR_BONUS=1
DECAY_FACTOR=1.2
PERPETUATE_WEIGHT=3.0

# Perpetuate pricing
PERP_BASE_MAX=5
PERP_HARD_CAP=100
```

DB connection is read from standard PG env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT) or your pool config.

## Install

```bash
pnpm i        # or: npm i / yarn
```

## Run (with auto-reload)

```bash
# App server (main, port 4000)
npx ts-node-dev src/index.ts

# Media server (optional, port 5000)
npx ts-node-dev src/dataServer.ts
```

Open http://localhost:4000

## Database (expected tables)

- users(id, username, handle, bio, avatar_url, created_at, last_used, …)
- posts(id, user_id, content, media_url, created_at, …)
- likes(id, user_id, post_id, created_at)
- comments(id, user_id, post_id, content, created_at)
- perpetuates(id, user_id, post_id, value, trust_value, created_at)
- tags(id, name)
- post_tags(post_id, tag_id)
- sessions(username, session_key, ip_address, expires_at, updated_at)

Note: handle is stored in plaintext; username may remain hashed if desired.

## Endpoints (high-level)

- Profile
  - GET /profile?handle=:handle (renders HTML)
  - POST /profile
    - multipart/form-data (field: avatar) to update avatar (and bio) → 303 redirect to /
    - JSON-only bio updates are also supported in the modal
- Media
  - POST /api/upload/post (if mounted) or /upload/post (data server)
    - field name: file
    - images → WebP (max 1280px, quality ~75), videos saved as-is
  - GET /uploads/... and /media/... serve files
- Feed
  - GET /api/feed/me?limit=&offset=
  - GET /api/feed/trending?limit=&offset=
  - Each item includes author_handle, user_liked, counts, and media_url
- Posts (via window.Ephemeral client)
  - POST /api/posts/:id/like (and DELETE to unlike)
  - POST /api/posts/:id/comments
  - POST /api/posts/:id/perpetuate { value }

## Media handling

- Avatars
  - Sharp converts any image to 256x256 WebP, quality ~80.
  - Old avatar file deleted on replace.
- Post images
  - Sharp resizes to fit within 1280x1280, WebP quality ~75.
- Videos
  - Accepted (mp4/webm/ogg) and saved as-is. Transcoding can be added later.
- Size limits
  - Avatars: ~10MB, Posts: up to 50MB (configurable in multer limits).

## Tags

- Client: formats “#tag1, #tag_two” on blur; sends normalized array.
- Server: normalization and validation enforced.
  - Rules: lowercase, strip “#”, spaces → underscore, allowed [a-z0-9_]
  - Limits: max 5 tags, max length 30 chars each.

## Feed scoring (simplified)

- Personalized (/api/feed/me)
  - score = likes*1.0 + comments*1.5 + trust_sum*PERPETUATE_WEIGHT
    + interest_sum*INTEREST_FACTOR + similar_creator_bonus − pow(age_hours, DECAY_FACTOR)
- Trending (/api/feed/trending)
  - score emphasizes global engagement and time decay.

## Perpetuates

- Pricing/limits per user:
  - Base max = PERP_BASE_MAX + floor(account_age_days/7) + floor(lifetime_comments/5)
  - Hard cap = PERP_HARD_CAP
- Response includes trustScore and maxAllowed.
- Side effect: bumps users.last_used so cleanup keeps active users longer.

## Frontend integration

- createPost(author, date, content) from uiHandler.js renders a post card.
- feed.js fetches and renders feed, sets data-post-id, and wires:
  - Like toggle with persistence (user_liked).
  - Comments lazy-load on expand; posting appends immediately.
  - Perpetuate prompts for value, enforces server max, shows toast.

## Troubleshooting

- 401 on upload: re-login; in dev, cookies are SameSite=Lax, Secure=false.
- Avatar not saving: ensure form uses multipart/form-data and field name “avatar”.
- CSP issues: inline scripts are restricted; keep to included JS files or add proper nonces.
- Feed 500: check server logs for SQL errors; ensure required tables exist.

## Scripts (optional)

Add to package.json:

```json
{
  "scripts": {
    "dev": "ts-node-dev src/index.ts",
    "media": "ts-node-dev src/dataServer.ts"
  }
}
```

Then:

```bash
npm run dev
npm run media
```

## License

MIT (or your
