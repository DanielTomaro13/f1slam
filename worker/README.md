# F1Slam leaderboard Worker

A tiny Cloudflare Worker + KV store that powers the global Hall of Fame. The
site works fine without it (it falls back to a per-browser localStorage board);
deploy this to make leaderboards global.

## Deploy

```bash
cd worker
npm install
# 1. create the KV namespace and copy the id into wrangler.toml
npx wrangler kv namespace create LEADERBOARD
# 2. deploy (provisions api.f1slam.com once the DNS/zone is on Cloudflare)
npx wrangler deploy
```

Then set a repo/Pages variable so the site uses it:

```
LEADERBOARD_URL = https://api.f1slam.com
```

The deploy workflow reads `vars.LEADERBOARD_URL` into
`NEXT_PUBLIC_LEADERBOARD_URL` at build time.

## API

- `GET /leaderboard?game=<game>&limit=<n>` → `ScoreEntry[]`
- `POST /score` `{ game, name, score, dir }` → `{ ok: true }`

Valid games: `grand-slam`, `higher-or-lower`, `pit-stop`.
