# F1Slam

**[f1slam.com](https://f1slam.com)** — Formula 1 stats, championship standings,
the race calendar and a vault of free F1 mini-games. Chase the perfect **Grand Slam**.

Part of **The 0 Series** alongside
[AFL 23-0](https://afl23-0.com), [NRL 24-0](https://nrl24-0.com) and
[Football Invincibles](https://footballinvincibles.com).

## Features

- Drivers' and constructors' championship standings
- Every driver with a full profile page
- The complete race calendar
- All-time stat leaders
- Five free Formula 1 mini-games with global leaderboards

## Stack

- **web/** — Next.js (static export) → GitHub Pages
- **pipeline/** — builds the F1 dataset from the public [OpenF1 API](https://openf1.org)
- **worker/** — Cloudflare Worker for the global leaderboards

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to web/out
```

## Attribution

Data via the public OpenF1 API. F1Slam is unofficial and unaffiliated with
Formula 1, the FIA or any team. F1, FORMULA 1 and related marks are trademarks of
Formula One Licensing BV.
