# F1Slam

**[f1slam.com](https://f1slam.com)** — Formula 1 stats, championship standings, the
race calendar and a vault of addictive F1 mini-games. Chase the perfect **Grand
Slam**: pole, win, fastest lap and leading every lap.

Part of **The 0 Series** alongside
[AFL 23-0](https://afl23-0.com), [NRL 24-0](https://nrl24-0.com) and
[Football Invincibles](https://footballinvincibles.com).

## What's here

- **Championship** — live drivers' and constructors' standings.
- **Drivers** — every driver in the OpenF1 era with career wins, podiums, poles
  and points, plus a profile page each.
- **Calendar** — the full race calendar with winners for completed rounds.
- **Stats** — all-time leaders across the field.
- **Grand Slams** — what a Grand Chelem is and who has managed one.
- **Games** — Grand Slam grid builder, Gridle (F1 wordle), Higher or Lower,
  Guess the Driver and Pit Stop, with global leaderboards.

## Stack

- **web/** — Next.js 15 (App Router) static export → GitHub Pages.
- **pipeline/** — Node script that builds `web/public/data/f1.json` from the
  public [OpenF1 API](https://openf1.org) (no auth, data 2023→).
- **worker/** — optional Cloudflare Worker + KV for the global leaderboards.

## Develop

```bash
npm install
npm run data     # rebuild the F1 snapshot from OpenF1 (optional; one is committed)
npm run dev      # http://localhost:3000
npm run build    # static export to web/out
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
static export and publishes it to GitHub Pages (custom domain `f1slam.com` via
`web/public/CNAME`). `.github/workflows/refresh.yml` rebuilds the data snapshot
weekly and commits it, which re-triggers a deploy.

## Data & attribution

Data comes from the public OpenF1 API, which republishes official F1 live-timing
data. F1Slam is unofficial and unaffiliated with Formula 1, the FIA or any team.
F1, FORMULA 1 and related marks are trademarks of Formula One Licensing BV.
